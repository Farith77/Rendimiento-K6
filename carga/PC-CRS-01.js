import http from 'k6/http';
import { check } from 'k6';
import { getHeadersWithCSRF } from '../login_token.js';

export const options = {
  vus: 1,
  duration: '10s',
};

export default function () {
  const courseId = "CS1030";
  const url = `https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/course?courseid=${courseId}&entitytype=course`;

  // ID de curso existente para pruebas (puedes cambiarlo si tienes uno fijo)
  

  // Crear el cuerpo en formato JSON
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

  console.info(`VU: ${__VU} | Status: ${res.status} | Body: ${res.body.slice(0, 100)}`);

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'response time < 4s': (r) => r.timings.duration < 4000,
  });
}
