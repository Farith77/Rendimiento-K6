import http from 'k6/http';
import { check } from 'k6';
import CSV from "k6/x/csv";
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

// Cargar y procesar el archivo CSV (ruta relativa desde la raíz del proyecto)
const csvData = open('./../csv/instructors.csv');
const rows = CSV.parse(csvData, ',');

const instructors = rows.map(row => ({
  instructorEmail: row.email,
  instructorName: row.name,
  instructorInstitution: row.institutetion
})).filter(item => item.instructorEmail && item.instructorName && item.instructorInstitution);


// Limitar a 500 instructores para la prueba
const instructorsToRegister = instructors.slice(0, 500);

export let options = {
  scenarios: {
    register_all_instructors: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 500, // Total de instructores a registrar
      maxDuration: '4h',                        // Tiempo máximo para terminar
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<3000'],    // 95% de requests < 3s
    'http_req_failed': ['rate<0.05'],       // <5% de fallos aceptable
    'checks': ['rate>0.95'],                // 95% de validaciones exitosas
    'http_req_duration{group:::main}': ['avg<2000'], // Latencia promedio < 2s
  },
};

function getRandomData() {
  if (instructors.length === 0) {
    throw new Error('No hay datos de instructores disponibles en el CSV');
  }
  return instructors[__ITER % instructors.length];
}

export default function () {
  const url = `${BASE_URL}/webapi/account/request`;
  const payload = JSON.stringify(getRandomData());
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
}
