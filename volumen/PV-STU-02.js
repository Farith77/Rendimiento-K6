import http from 'k6/http';
import { check } from 'k6';
import CSV from "k6/x/csv";
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

// Cargar y procesar el archivo CSV (ruta relativa desde la raíz del proyecto)
const csvData = open('./students.csv');
const rows = CSV.parse(csvData, ',');

const students = rows.map(row => ({
  courseId: row.courseId,
  studentEmail: row.email
})).filter(student => student.courseId && student.studentEmail);

// Limitar a 500 estudiantes para la prueba
const studentsToUpdate = students.slice(0, 500);

export let options = {
  vus: 1,
  iterations: studentsToUpdate.length,
  thresholds: {
    'http_req_duration': ['p(95)<3000'],    // 95% de requests < 3s
    'http_req_failed': ['rate<0.05'],       // <5% de fallos aceptable
    'checks': ['rate>0.95'],                // 95% de validaciones exitosas
    'http_req_duration{group:::main}': ['avg<2000'], // Latencia promedio < 2s
  },
};

function generateStudentUpdateData(email) {
  const sectionLetter = String.fromCharCode(65 + (__ITER % 26)); // A-Z
  const sectionNumber = Math.floor(__ITER / 26) % 100; // 0-99
  const section = `Section ${sectionLetter}${sectionNumber}`;

  return {
    name: `Updated Student ${__ITER}`,
    team: `Team_${__ITER}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    section: section,
    comments: `Updated via volume test - iteration ${__ITER}`,
    email: email,
    isSessionSummarySendEmail: true,
  };
}

export default function () {
  const index = __ITER; // índice de iteración actual
  const student = studentsToUpdate[index];

  const url = `${BASE_URL}/webapi/student?courseid=${student.courseId}&studentemail=${student.studentEmail}`;
  const payload = JSON.stringify(generateStudentUpdateData(student.studentEmail));
  const headers = getHeadersWithCSRF();

  const res = http.put(url, payload, { headers });

  check(res, {
    'PV-STU-02: Status is 200 o 201': (r) => r.status === 200 || r.status === 201,
    'PV-STU-02: Response time < 3000ms': (r) => r.timings.duration < 3000,
    'PV-STU-02: No server errors': (r) => r.status < 500,
    'PV-STU-02: Student updated successfully': (r) => {
      try {
        const jsonResponse = JSON.parse(r.body);
        return jsonResponse.status === 'success' || r.status === 200 || r.status === 201;
      } catch (e) {
        return r.status === 200;
      }
    },
  });
}
