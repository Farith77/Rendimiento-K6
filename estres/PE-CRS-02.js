import http from 'k6/http';
import { check } from 'k6';
import CSV from "k6/x/csv";
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

// Cargar y procesar el archivo CSV (ruta relativa desde la raíz del proyecto)
const csvData = open('./courses.csv');
const rows = CSV.parse(csvData, ',');

const courseIds = rows.map(row => row.courseId).filter(id => id);

export let options = {
  stages: [
    { duration: '1m', target: 50 },   // Subida inicial
    { duration: '1m', target: 100 },  // Más carga
    { duration: '1m', target: 150 },  // Carga media
    { duration: '1m', target: 200 },  // Carga alta
    { duration: '1m', target: 250 },  // Cerca del límite
    { duration: '1m', target: 300 },  // Máximo estrés
    { duration: '1m', target: 0 },    // Bajada
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'],    // 95% de requests < 5s
    'http_req_failed': ['rate<0.1'],        // <10% de fallos aceptable
    'checks': ['rate>0.9'],                 // 90% de validaciones exitosas
  },
};

function getRandomCourseId() {
  if (courseIds.length === 0) {
    throw new Error('No hay courseIds disponibles en el CSV');
  }
  return courseIds[__ITER % courseIds.length];
}

export default function () {
  const courseId = getRandomCourseId();
  const url = `${BASE_URL}/webapi/course?courseId=${courseId}`;
  const headers = getHeadersWithCSRF();

  const res = http.del(url, null, { headers });

  check(res, {
    'PE-CRS-02: Status is 200 o 204': (r) => r.status === 200 || r.status === 204,
    'PE-CRS-02: Response time < 5000ms': (r) => r.timings.duration < 5000,
    'PE-CRS-02: No server errors': (r) => r.status < 500,
    'PE-CRS-02: Course deleted successfully': (r) => {
      try {
        if (r.status === 204) return true; // 204 No Content es común para DELETE
        const jsonResponse = JSON.parse(r.body);
        return jsonResponse.status === 'success' || r.status === 200;
      } catch (e) {
        return r.status === 204; // Si no hay body, 204 es válido
      }
    },
  });

  // Log de errores para debug
  if (res.status >= 400) {
    console.error(`❌ Error ${res.status} eliminando curso ${courseId}: ${res.body}`);
  }
}
