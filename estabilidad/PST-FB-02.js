import http from 'k6/http';
import { check, sleep } from 'k6';
import { getHeaders } from '../login_token.js';

export let options = {
  vus: 15,              // 15 usuarios simultáneos
  duration: '1h',       // durante 1 hora
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% de peticiones deben demorar menos de 2s
    http_req_failed: ['rate<0.01'],    // menos del 1% de errores permitidos
  }
};

export default function () {
  const url = 'https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/questions?intent=FULL_DETAIL&courseid=CS1020&fsname=feddddd';

  const res = http.get(url, { headers: getHeaders() });

  // Log para depuración (opcional, puedes comentar si saturan la salida)
  //console.log(`VU: ${__VU} | Status: ${res.status}`);
  //console.log(`Response preview: ${res.body.substring(0, 100)}\n`);

  check(res, {
    'status is 200': r => r.status === 200,
    'response time < 2s': r => r.timings.duration < 2000,
    'body is not empty': r => r.body && r.body.length > 0
  });

  sleep(10); // Espera de 10 segundos entre solicitudes
}
