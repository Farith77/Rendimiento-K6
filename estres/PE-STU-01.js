import http from 'k6/http';
import { check } from 'k6';
import CSV from "k6/x/csv";
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

const csvData = open('./courses.csv');
const rows = CSV.parse(csvData, ',');

const coursesId = rows.map(row => ({
  courseId: row.courseId
})).filter(student => student.courseId);

export let options = {
  stages: [
    { duration: '1m', target: 50 },   // Subida inicial
    { duration: '1m', target: 100 },  // Más carga
    { duration: '1m', target: 200 },  // Carga media
    { duration: '1m', target: 300 },  // Carga alta
    { duration: '1m', target: 400 },  // Punto crítico
    { duration: '1m', target: 450 },  // Cerca del límite
    { duration: '1m', target: 500 },  // Máximo estrés
    { duration: '1m', target: 0 },    // Bajada
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'],    // 95% de requests < 5s
    'http_req_failed': ['rate<0.1'],        // <10% de fallos aceptable
    'checks': ['rate>0.9'],                 // 90% de validaciones exitosas
  },
};

function generateStudentData() {
  const studentId = `student${__ITER}_${Date.now()}`;
  const sectionLetter = String.fromCharCode(65 + (__ITER % 26)); // A-Z
  const sectionNumber = Math.floor(__ITER / 26) % 100; // 0-99
  const section = `Section ${sectionLetter}${sectionNumber}`;

  return {
    "studentEnrollRequests": [
      {
        "section": section,
        "team": `Team_${__ITER}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        "name": `Student ${__ITER}`,
        "email": `${studentId}@example.com`,
        "comments": `Student enrolled via stress test - iteration ${__ITER}`
      }
    ]
  };
}

export default function () {
  const courseId = coursesId[__ITER % coursesId.length].courseId;
  const url = `${BASE_URL}/webapi/students?courseid=${courseId}`;
  const payload = JSON.stringify(generateStudentData());
  const headers = getHeadersWithCSRF();

  const res = http.put(url, payload, { headers });

  check(res, {
    'PE-STU-01: Status is 200 o 201': (r) => r.status === 200 || r.status === 201,
    'PE-STU-01: Response time < 5000ms': (r) => r.timings.duration < 5000,
    'PE-STU-01: No server errors': (r) => r.status < 500,
    'PE-STU-01: Student enrolled successfully': (r) => {
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
    console.error(`❌ Error ${res.status} enrollando estudiante en curso ${courseId}: ${res.body}`);
  }
}
