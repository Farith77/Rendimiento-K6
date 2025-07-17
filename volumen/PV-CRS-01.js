import http from 'k6/http';
import { check } from 'k6';
import CSV from "k6/x/csv";
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

// Cargar y procesar el archivo CSV (ruta relativa desde la raíz del proyecto)
const csvData = open('./courses.csv');
const rows = CSV.parse(csvData, ',');

const courses = rows.map(row => ({
  courseId: row.courseId,
  courseName: row.courseName,
  institute: row.institute,
  timeZone: row.timeZone
})).filter(course => course.courseId);

export let options = {
  vus: 1,
  iterations: courses.length,
  thresholds: {
    'http_req_duration': ['p(95)<3000'],    // 95% de requests < 3s
    'http_req_failed': ['rate<0.05'],       // <5% de fallos aceptable
    'checks': ['rate>0.95'],                // 95% de validaciones exitosas
  },
};

export default function () {
  const index = __ITER; // índice de iteración actual
  const course = courses[index];

  const url = `${BASE_URL}/webapi/course`;
  const payload = JSON.stringify({
    courseId: course.courseId,
    courseName: course.courseName,
    institute: course.institute,
    timeZone: course.timeZone
  });

  const headers = getHeadersWithCSRF();

  const res = http.post(url, payload, { headers });

  check(res, {
    'PV-CRS-01: Status is 200 o 201': (r) => r.status === 200 || r.status === 201,
    'PV-CRS-01: Response time < 3000ms': (r) => r.timings.duration < 3000,
    'PV-CRS-01: No server errors': (r) => r.status < 500,
    'PV-CRS-01: Course created successfully': (r) => {
      try {
        const jsonResponse = JSON.parse(r.body);
        return jsonResponse.status === 'success' || r.status === 200 || r.status === 201;
      } catch (e) {
        return r.status === 201;
      }
    },
  });

  // Log de errores para debug
  if (res.status >= 400) {
    console.error(`❌ Error ${res.status} creando curso ${course.courseId}: ${res.body}`);
  }
}
