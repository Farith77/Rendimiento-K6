import http from 'k6/http';
import { check } from 'k6';
import { getHeaders } from '../login_token.js'; 

// Parámetros de carga
export const options = {
  vus: 200,          // 200 usuarios simultáneos
  duration: '60s',   // durante 20 segundos
};

const courseId = 'CS1030'; // Reemplaza con un ID real de curso existente

export default function () {
  const url = `https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/instructors?courseid=${courseId}`;

  const res = http.get(url, {
    headers: getHeaders(),
  });

  //console.info(`VU: ${__VU} | Status: ${res.status}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1.5s': (r) => r.timings.duration < 1500,
  });
}
