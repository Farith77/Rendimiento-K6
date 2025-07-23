import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
import { getHeaders } from '../login_token.js';

// === CONFIGURACIÓN DE LA PRUEBA ===
export const options = {
  vus: 20,
  duration: '1h',
  thresholds: {
    http_req_duration: ['p(95)<2000'], // El 95% de las respuestas debe tardar menos de 2s
    http_req_failed: ['rate<0.01'],    // Menos del 1% de fallos permitidos
  },
};

// === LECTURA DEL CSV ===
// course_ids.csv debe tener un encabezado "courseId"
const courseIds = new SharedArray('course ids', function () {
  const csv = open('./course_ids.csv');
  return papaparse.parse(csv, { header: true }).data
    .map(row => row.courseId?.trim())
    .filter(id => id); // Elimina nulos o vacíos
});

export default function () {
  // Elegimos un courseId al azar
  const courseId = courseIds[Math.floor(Math.random() * courseIds.length)];

  // Endpoint con query param
  const url = `https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/instructor/privilege?courseid=${courseId}`;

  const res = http.get(url, { headers: getHeaders() });
  
  //console.info(`VU: ${__VU} | Status: ${res.status} | CourseID: ${courseId} | Body: ${res.body.slice(0, 100)}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  // Pausa de 30 segundos entre solicitudes
  sleep(30);
}
