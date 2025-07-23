import http from 'k6/http';
import { check } from 'k6';
import CSV from "k6/x/csv";
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

// Cargar y procesar el archivo CSV (ruta relativa desde la raíz del proyecto)
const csvData = open('./../csv/students.csv');
const rows = CSV.parse(csvData, ',');

const students = rows.map(row => ({
  courseId: row.courseId,
  studentEmail: row.email
})).filter(student => student.courseId && student.studentEmail);

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
    'checks': ['rate>0.9'],                 // 90% de validaciones exitosas
    'http_req_duration{group:::main}': ['avg<5000'], // Throughput: latencia promedio < 5s
  },
};

function getRandomStudent() {
  if (students.length === 0) {
    throw new Error('No hay estudiantes disponibles en el CSV');
  }
  return students[__ITER % students.length];
}

function generateStudentUpdateData(email) {
  const sectionLetter = String.fromCharCode(65 + (__ITER % 26)); // A-Z
  const sectionNumber = Math.floor(__ITER / 26) % 100; // 0-99
  const section = `Section ${sectionLetter}${sectionNumber}`;
  return {
    name: `Updated Student ${__ITER}`,
    team: `Team_${__ITER}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    section: section,
    comments: `Updated via stress test - iteration ${__ITER}`,
    email: email,
    isSessionSummarySendEmail: true
  };
}

export default function () {
  const student = getRandomStudent();
  const url = `${BASE_URL}/webapi/student?courseid=${student.courseId}&studentemail=${student.studentEmail}`;
  const payload = JSON.stringify(generateStudentUpdateData(student.studentEmail));
  const headers = getHeadersWithCSRF();

  const res = http.put(url, payload, { headers });

  check(res, {
    'PE-STU-02: Status is 200 o 201': (r) => r.status === 200 || r.status === 201,
    'PE-STU-02: Response time < 5000ms': (r) => r.timings.duration < 5000,
    'PE-STU-02: No server errors': (r) => r.status < 500,
  });

  // Log de errores para debug
  if (res.status >= 400) {
    console.error(`❌ Error ${res.status} actualizando estudiante en curso ${student.courseId}: ${res.body}`);
  }
}
