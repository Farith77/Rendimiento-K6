import http from 'k6/http';
import { check, sleep } from 'k6';
import { getHeaders } from '../login_token.js';

export let options = {
  vus: 200,                // 200 usuarios simultáneos
  duration: '60s',         // durante 30 segundos
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% de las solicitudes deben durar < 2s
    http_req_failed: ['rate<0.01'],    // menos del 1% de solicitudes fallidas
  },
};

const BASE_URL = 'https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com';
const COURSES_ENDPOINT = '/webapi/courses?entitytype=instructor&coursestatus=active';

export default function () {
  const res = http.get(`${BASE_URL}${COURSES_ENDPOINT}`, {
    headers: getHeaders(),
  });

  //console.log(`VU: ${__VU} | Status: ${res.status} | Duration: ${res.timings.duration}ms`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(Math.random() * 1); // descanso aleatorio para simular realismo
}
