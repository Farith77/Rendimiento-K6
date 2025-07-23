import http from 'k6/http';
import { check } from 'k6';
import { getHeaders } from '../login_token.js';
import { sleep } from 'k6';

export const options = {
  vus: 15, 
  duration: '1h', // duración total de la prueba
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% de las respuestas deben ser < 2s
    http_req_failed: ['rate<0.01'], // menos de 1% de errores
  },
};

export default function () {
  const courseId = 'agarciaa.uns-demo';
  const url = `https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/students?courseid=${courseId}`;

  const res = http.get(url, { headers: getHeaders() });
  
  //console.info(`VU: ${__VU} | Status: ${res.status} | CourseID: ${courseId} | Body: ${res.body.slice(0, 100)}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
  sleep(10);
}
