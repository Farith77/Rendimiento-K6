import http from 'k6/http';
import { sleep, check } from 'k6';
import { getHeaders } from '../login_token.js';

export const options = {
  vus: 20, // 20 usuarios simultáneos
  duration: '40m', // 1 hora de prueba
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% de las respuestas deben tardar menos de 1s
    http_req_failed: ['rate<0.01'], // menos del 1% de errores permitidos
  },
};

const BASE_URL = 'https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com';
const COURSE_ID = 'CS1020';
const FS_NAME = 'feddddd';

export default function () {
  const url = `${BASE_URL}/webapi/session?intent=FULL_DETAIL&courseid=${COURSE_ID}&fsname=${FS_NAME}`;

  const res = http.get(url, { headers: getHeaders() });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'body is not empty': (r) => r.body && r.body.length > 0,
  });

  // Esperar 30 segundos antes del siguiente request (por usuario)
  sleep(30);
}
