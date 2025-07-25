import http from 'k6/http';
import { check, sleep } from 'k6';
import { getHeaders } from '../login_token.js'; // Ajusta la ruta si es necesario

export let options = {
  vus: 100,             // 100 usuarios simultáneos
  duration: '5m',       // prueba de carga durante 5 minutos
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% de las respuestas deben ser < 2s
    http_req_failed: ['rate<0.01'],    // menos del 1% de errores permitidos
  }
};

export default function () {
  const url = 'https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/result?courseid=agarciaa.uns-demo&fsname=Session%20with%20different%20question%20types&intent=STUDENT_RESULT';

  const res = http.get(url, { headers: getHeaders() });

  //console.log(`VU: ${__VU} | Status: ${res.status} | Duration: ${res.timings.duration}ms`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(Math.random()); // Espera entre 0 y 1 segundo antes de la siguiente iteración
}
