import http from 'k6/http';
import { check } from 'k6';
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

// ID de curso fijo para todas las consultas de volumen
const COURSE_ID = 'cvaldivialu.uns-demo';

// Número de iteraciones para la prueba de volumen
const VOLUME_ITERATIONS = 500;

export let options = {
  scenarios: {
    query_all_instructors: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: VOLUME_ITERATIONS, // Total de consultas a realizar
      maxDuration: '4h',             // Tiempo máximo para terminar
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<3000'],    // 95% de requests < 3s
    'http_req_failed': ['rate<0.05'],       // <5% de fallos aceptable
    'checks': ['rate>0.95'],                // 95% de validaciones exitosas
    'http_req_duration{group:::main}': ['avg<2000'], // Latencia promedio < 2s
  },
};

export default function () {
  // URL para consultar instructores del curso fijo
  const url = `${BASE_URL}/webapi/instructors?courseid=${COURSE_ID}`;
  const headers = getHeadersWithCSRF();

  // Realizar petición GET para obtener lista de instructores
  const res = http.get(url, { headers });

  check(res, {
    'PV-INS-02: Status is 200': (r) => r.status === 200,
    'PV-INS-02: Response time < 3000ms': (r) => r.timings.duration < 3000,
    'PV-INS-02: No server errors': (r) => r.status < 500,
    'PV-INS-02: Instructors list retrieved': (r) => {
      if (r.status === 200) {
        try {
          const jsonResponse = JSON.parse(r.body);
          // Verificar que la respuesta contenga datos de instructores
          return Array.isArray(jsonResponse) || (jsonResponse && jsonResponse.instructors);
        } catch (e) {
          return false;
        }
      }
      return false;
    },
  });

  // Log de errores para debug
  if (res.status >= 400) {
    console.error(`❌ Error ${res.status} consultando instructores del curso ${COURSE_ID}: ${res.body}`);
  }
}
