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
  courseName: row.courseName,
  institute: row.institute,
  timeZone: row.timeZone
})).filter(course => course.courseId);

const coursesToCreate = courses.slice(0, 500);

export let options = {
  scenarios: {
    run_all_courses: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: coursesToCreate.length, // Total de cursos
      maxDuration: '4h',          // Tiempo máximo para terminar
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<3000'], // 95% de requests < 3s
    'http_req_failed': ['rate<0.05'],    // <5% de fallos aceptable
    'checks': ['rate>0.95'],             // 95% de validaciones exitosas
  },
};

export default function () {
  const index = __ITER; // índice de iteración actual
  const course = coursesToCreate[index];

  const url = `${BASE_URL}/webapi/course?instructorinstitution=UNSA`;
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
    'PV-CRS-01: Response time < 5000ms': (r) => r.timings.duration < 5000,
    'PV-CRS-01: No server errors': (r) => r.status < 500,
  });

}
