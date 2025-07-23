import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { getHeadersWithCSRF } from '../login_token.js';
import { randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Cargar los courseid desde el archivo CSV
const courseIds = new SharedArray('course IDs', function () {
  return open('./course_ids.csv')  // Ajusta la ruta si es necesario
    .split('\n')
	.slice(1)
	.map(row => row.trim())
    .filter(line => line.trim() !== ''); // quitar líneas vacías
});

export const options = {
  scenarios: {
    move_to_bin: {
      executor: 'constant-arrival-rate',
      rate: 20, // 20 ejecuciones por minuto
      timeUnit: '1m',
      duration: '1h',
      preAllocatedVUs: 20,
      maxVUs: 40,
    },
  },
  thresholds: {
    http_req_duration: ['p(98)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const courseId = randomItem(courseIds); // Elegir aleatoriamente un ID de curso
  const url = `https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/bin/course?courseid=${courseId}&entitytype=instructor`;

  const headers = {
    'Content-Type': 'application/json',
    'Cookie': getHeadersWithCSRF().Cookie,
    'X-CSRF-TOKEN': getHeadersWithCSRF()['X-CSRF-TOKEN'],
  };

  const res = http.put(url, null, { headers });

  //console.info(`VU: ${__VU} | Status: ${res.status} | CourseID: ${courseId} | Body: ${res.body.slice(0, 100)}`);

  check(res, {
    'status 200 o 204': (r) => r.status === 200 || r.status === 204,
    'tiempo de respuesta < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(60);
}

