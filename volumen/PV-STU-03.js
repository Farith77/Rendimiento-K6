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

// Limitar a 500 estudiantes para la prueba
const studentsToDelete = students.slice(0, 500);

export let options = {
  scenarios: {
    delete_students: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: studentsToDelete.length, // Total de estudiantes a eliminar
      maxDuration: '4h',                   // Tiempo máximo para terminar
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<5000'],    // 95% de requests < 5s
    'http_req_failed': ['rate<0.05'],       // <5% de fallos aceptable
    'checks': ['rate>0.95'],                // 95% de validaciones exitosas
    'http_req_duration{group:::main}': ['avg<5000'], // Latencia promedio < 5s
  },
};


export default function () {
  const index = __ITER; // índice de iteración actual
  const student = studentsToDelete[index];

  const url = `${BASE_URL}/webapi/student?courseid=${student.courseId}&studentemail=${student.studentEmail}`;
  const headers = getHeadersWithCSRF();

  const res = http.del(url, null, { headers });

  check(res, {
    'PV-STU-03: Status is 200 o 204': (r) => r.status === 200 || r.status === 204,
    'PV-STU-03: Response time < 5000ms': (r) => r.timings.duration < 5000,
    'PV-STU-03: No server errors': (r) => r.status < 500,
    'PV-STU-03: Student deleted successfully': (r) => {
      if (r.status === 204 || r.status === 200) return true;
    },
  });
}
