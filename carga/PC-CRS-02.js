import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { BASE_URL } from '../config.js';
import { getHeaders } from '../login_token.js';

// Cargar IDs de cursos desde CSV
const courseIds = new SharedArray("courseIds", function () {
  const f = open('./course_ids.csv');
  return f
    .split('\n')
    .slice(1) // saltar encabezado
    .map(row => row.trim())
    .filter(id => id); // evitar líneas vacías
});

export let options = {
  vus: 100,               // 100 estudiantes simultáneamente
  duration: '1m',         // durante 1 minuto
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% de peticiones < 2s
    http_req_failed: ['rate<0.01'],    // Menos del 1% de errores
  }
};

export default function () {
  const index = __VU % courseIds.length; // distribuye por usuario virtual
  const courseId = courseIds[index];
  const url = `https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/course?courseid=${courseId}&entitytype=course`;

  const res = http.get(url, { headers: getHeaders() });
  
  //console.log(`VU: ${__VU} | CourseID: ${courseId} | Status: ${res.status} | Body: ${res.body.substring(0, 100)}`);
  //console.log(`Headers: ${JSON.stringify(getHeaders())}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  // Para no saturar si repite muchos accesos
  sleep(Math.random() * 1);
}
