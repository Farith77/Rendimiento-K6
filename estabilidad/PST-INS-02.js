import http from 'k6/http';
import { check, sleep } from 'k6';
import { getHeaders } from '../login_token.js';

const courseId = "CS1030";

// Lista ficticia de 15 correos de instructores (puedes modificar o ampliar)
const instructorEmails = [
  "instructor1@uni.edu",
  "instructor2@uni.edu",
  "instructor3@uni.edu",
  "instructor4@uni.edu",
  "instructor5@uni.edu",
  "instructor6@uni.edu",
  "instructor7@uni.edu",
  "instructor8@uni.edu",
  "instructor9@uni.edu",
];

export let options = {
  vus: 15,               // 15 usuarios simulados
  duration: '1h',        // durante 1 hora
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% de las peticiones deben responder en menos de 2 segundos
    http_req_failed: ['rate<0.01'],    // menos del 1% de errores
  }
};

export default function () {
  const email = instructorEmails[__VU - 1];  
  const url = `https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/instructor?courseid=${courseId}&instructoremail=${encodeURIComponent(email)}`;

  const res = http.del(url, null, { headers: getHeaders() });

  console.log(`VU: ${__VU} | Deleting: ${email}`);
  // Detalle de la solicitud y respuesta
  console.log(`🔁 VU: ${__VU}
  ➤ Instructor email: ${email}
  ➤ URL: ${url}
  ➤ Status: ${res.status}
  ➤ Duration: ${res.timings.duration.toFixed(2)} ms
  ➤ Response (primeros 100 caracteres): ${res.body?.substring(0, 100)}`);

  check(res, {
    'status is 200, 204 or 403': r => r.status === 200 || r.status === 204 ||
    r.status === 403,
    'response time < 2s': r => r.timings.duration < 2000,
  });

  sleep(45);  // esperar 45 segundos antes de repetir
}
