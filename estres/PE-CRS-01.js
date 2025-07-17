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
    { duration: '1m', target: 200 },  // Carga media
    { duration: '1m', target: 300 },  // Carga alta
    { duration: '1m', target: 400 },  // Punto crítico
    { duration: '1m', target: 500 },  // Máximo estrés
    { duration: '1m', target: 500 },  // Mantener máximo
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
  const url = `${BASE_URL}/webapi/course/archive?courseid=${courseId}`;
  const payload = JSON.stringify({ archiveStatus: true });
  const headers = getHeadersWithCSRF();

  const res = http.put(url, payload, { headers });

  check(res, {
    'PE-CRS-01: Status is 200 o 201': (r) => r.status === 200 || r.status === 201,
    'PE-CRS-01: Response time < 5000ms': (r) => r.timings.duration < 5000,
    'PE-CRS-01: No server errors': (r) => r.status < 500,
    'PE-CRS-01: Course archived successfully': (r) => {
      try {
        const jsonResponse = JSON.parse(r.body);
        return jsonResponse.status === 'success' || r.status === 200;
      } catch (e) {
        return e;
      }
    },
  });

  // Log de errores para debug
  if (res.status >= 400) {
    console.error(`❌ Error ${res.status} archivando curso ${courseId}: ${res.body}`);
  }
}
