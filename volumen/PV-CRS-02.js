import http from 'k6/http';
import { check } from 'k6';
import CSV from "k6/x/csv";
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

// Cargar y procesar el archivo CSV (ruta relativa desde la raíz del proyecto)
const csvData = open('./../csv/courses.csv');
const rows = CSV.parse(csvData, ',');

const courses = rows.map(row => ({
  courseId: row.courseId,
})).filter(course => course.courseId);

// Limitar a 500 cursos para la prueba
const coursesToRestore = courses.slice(0, 500);

export let options = {
  scenarios: {
    restore_all_courses: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: coursesToRestore.length, // Total de cursos a restaurar
      maxDuration: '4h',                   // Tiempo máximo para terminar
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<3000'],    // 95% de requests < 3s
    'http_req_failed': ['rate<0.05'],       // <5% de fallos aceptable
    'checks': ['rate>0.95'],                // 95% de validaciones exitosas
    'http_req_duration{group:::main}': ['avg<2000'], // Latencia promedio < 2s
  },
};

export default function () {
  const index = __ITER; // índice de iteración actual
  const course = coursesToRestore[index];

  const url = `${BASE_URL}/webapi/bin/course?courseid=${course.courseId}`;
  const headers = getHeadersWithCSRF();

  const res = http.del(url, null, { headers });

  check(res, {
    'PV-CRS-02: Status is 200 o 204': (r) => r.status === 200 || r.status === 204,
    'PV-CRS-02: Response time < 3000ms': (r) => r.timings.duration < 3000,
    'PV-CRS-02: No server errors': (r) => r.status < 500,
    'PV-CRS-02: Course restored successfully': (r) => {
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
    console.error(`❌ Error ${res.status} restaurando curso ${course.courseId}: ${res.body}`);
  }
}
