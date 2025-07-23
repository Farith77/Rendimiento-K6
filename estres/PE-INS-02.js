import http from 'k6/http';
import { check } from 'k6';
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

const COURSE_ID = 'cvaldivialu.uns-demo';

export let options = {
  stages: [
    { duration: '1m', target: 50 },   // Subida inicial
    { duration: '1m', target: 100 },  // Más carga
    { duration: '1m', target: 150 },  // Carga media
    { duration: '1m', target: 200 },  // Carga alta
    { duration: '1m', target: 250 },  // Cerca del límite
    { duration: '1m', target: 300 },  // Máximo estrés - degradación esperada después de 250
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'],    // 95% de requests < 5s
    'http_req_failed': ['rate<0.1'],        // <10% de fallos aceptable
    'checks': ['rate>0.9'],                 // 90% de validaciones exitosas
    'http_req_duration{group:::main}': ['avg<3000'], // Latencia promedio < 3s
  },
};

export default function () {
  // URL para consultar instructores de un curso específico
  const url = `${BASE_URL}/webapi/instructors?courseid=${COURSE_ID}`;
  const headers = getHeadersWithCSRF();

  const res = http.get(url, { headers });

  check(res, {
    'PE-INS-02: Status is 200': (r) => r.status === 200,
    'PE-INS-02: Response time < 5000ms': (r) => r.timings.duration < 5000,
    'PE-INS-02: No server errors': (r) => r.status < 500,
    'PE-INS-02: Instructors list retrieved': (r) => {
      if (r.status === 200) {
        try {
          const jsonResponse = JSON.parse(r.body);
          return Array.isArray(jsonResponse) || (jsonResponse && jsonResponse.instructors);
        } catch (e) {
          return false;
        }
      }
      return false;
    },
    'PE-INS-02: Latency acceptable': (r) => r.timings.duration < 3000, // Latencia promedio objetivo
  });
}
