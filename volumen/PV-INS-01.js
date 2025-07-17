import http from 'k6/http';
import { check } from 'k6';
import CSV from "k6/x/csv";
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

// Cargar y procesar el archivo CSV (ruta relativa desde la raíz del proyecto)
const csvData = open('./instructors.csv');
const rows = CSV.parse(csvData, ',');

const instructors = rows.map(row => ({
  name: row.name,
  email: row.email,
  institute: row.institute,
  country: row.country,
  comments: row.comments || ''
})).filter(instructor => instructor.name && instructor.email);

// Limitar a 500 instructores para la prueba
const instructorsToRegister = instructors.slice(0, 500);

export let options = {
  vus: 1,
  iterations: instructorsToRegister.length,
  thresholds: {
    'http_req_duration': ['p(95)<3000'],    // 95% de requests < 3s
    'http_req_failed': ['rate<0.05'],       // <5% de fallos aceptable
    'checks': ['rate>0.95'],                // 95% de validaciones exitosas
    'http_req_duration{group:::main}': ['avg<2000'], // Latencia promedio < 2s
  },
};

export default function () {
  const index = __ITER; // índice de iteración actual
  const instructor = instructorsToRegister[index];

  const url = `${BASE_URL}/webapi/account/request`;
  const payload = JSON.stringify({
    name: instructor.name,
    email: instructor.email,
    institute: instructor.institute,
    country: instructor.country,
    comments: instructor.comments
  });

  const headers = getHeadersWithCSRF();

  const res = http.post(url, payload, { headers });

  check(res, {
    'PV-INS-01: Status is 200 o 201': (r) => r.status === 200 || r.status === 201,
    'PV-INS-01: Response time < 3000ms': (r) => r.timings.duration < 3000,
    'PV-INS-01: No server errors': (r) => r.status < 500,
    'PV-INS-01: Account request created successfully': (r) => {
      try {
        const jsonResponse = JSON.parse(r.body);
        return jsonResponse.status === 'success' || r.status === 200 || r.status === 201;
      } catch (e) {
        return r.status === 201;
      }
    },
  });

  // Log de errores para debug
  if (res.status >= 400) {
    console.error(`❌ Error ${res.status} registrando instructor ${instructor.email}: ${res.body}`);
  }
}
