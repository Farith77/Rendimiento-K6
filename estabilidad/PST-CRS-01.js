import http from 'k6/http';
import { check, sleep } from 'k6';
import { getHeadersWithCSRF } from '../login_token.js';

export const options = {
  vus: 15,
  duration: '1h',
  thresholds: {
    http_req_failed: ['rate<0.01'],         // Menos del 1% de errores
    http_req_duration: ['p(98)<2000'],      // 98% de respuestas bajo 2s
  },
};

export default function () {
  const courseId = "CS1030";
  const url = `https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/course?courseid=${courseId}&entitytype=course`;

  const payload = JSON.stringify({
    courseid: courseId,
    courseName: `Curso Actualizado`,
    timeZone: "America/Lima",
    instructorinstitution: "UNSA",
    entitytype: "instructor"
  });

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': getHeadersWithCSRF().Cookie,
    'X-CSRF-TOKEN': getHeadersWithCSRF()['X-CSRF-TOKEN']
  };

  const res = http.put(url, payload, { headers });

  check(res, {
    'Código de estado 200 o 201': (r) => r.status === 200 || r.status === 201,
    'Tiempo de respuesta < 2s': (r) => r.timings.duration < 2000,
  });

  // Cada instructor espera 30s antes de volver a enviar otra actualización
  sleep(30);
}

