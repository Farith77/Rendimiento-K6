import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { getHeaders } from '../login_token.js';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// Cargar datos desde el archivo CSV
const studentData = new SharedArray('students', function () {
  const f = open('./students_to_delete.csv');
  return f
    .split('\n')
    .slice(1) // saltar encabezado
    .map(row => row.trim())
    .filter(id => id); // evitar líneas vacías
});

export const options = {
  vus: 1,
  duration: '5s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const courseId = 'agarciaa.uns-demo';

  // Seleccionar estudiante por iteración
  const student = studentData[__ITER % studentData.length];
  const studentEmail = encodeURIComponent(student);

  const url = `https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/student?email=${studentEmail}&courseid=${courseId}`;

  const res = http.del(url, null, { headers: getHeaders() });
  
  console.info(
  `[VU ${__VU}] [ITER ${__ITER}] Status: ${res.status} | Email: ${studentEmail} | Duration: ${res.timings.duration}ms | Body: ${res.body.slice(0, 80)}`
);

  check(res, {
    'status is 200 or 204': (r) => r.status === 200 || r.status === 204,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1); // estabilidad
}
