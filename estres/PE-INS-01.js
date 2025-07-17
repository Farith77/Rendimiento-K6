import http from 'k6/http';
import { check } from 'k6';
import CSV from "k6/x/csv";
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

// Cargar y procesar el archivo CSV (ruta relativa desde la raíz del proyecto)
const csvData = open('./request.csv');
const rows = CSV.parse(csvData, ',');

const requestIds = rows.map(row => row.requestId).filter(id => id);

export let options = {
  stages: [
    { duration: '1m', target: 50 },   // Subida inicial
    { duration: '1m', target: 100 },  // Más carga
    { duration: '1m', target: 200 },  // Carga media
    { duration: '1m', target: 300 },  // Carga alta
    { duration: '1m', target: 400 },  // Punto crítico
    { duration: '1m', target: 450 },  // Cerca del límite
    { duration: '1m', target: 500 },  // Máximo estrés
    { duration: '1m', target: 0 },    // Bajada
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'],    // 95% de requests < 5s
    'http_req_failed': ['rate<0.1'],        // <10% de fallos aceptable
    'checks': ['rate>0.9'],                 // 90% de validaciones exitosas
  },
};

function getRandomRequestId() {
  if (requestIds.length === 0) {
    throw new Error('No hay requestIds disponibles en el CSV');
  }
  return requestIds[__ITER % requestIds.length];
}

export default function () {
  const requestId = getRandomRequestId();
  const url = `${BASE_URL}/webapi/account/request?id=${requestId}`;
  const payload = JSON.stringify({ status: 'approved' });
  const headers = getHeadersWithCSRF();

  const res = http.put(url, payload, { headers });

  check(res, {
    'PE-INS-01: Status is 200 o 201': (r) => r.status === 200 || r.status === 201,
    'PE-INS-01: Response time < 5000ms': (r) => r.timings.duration < 5000,
    'PE-INS-01: No server errors': (r) => r.status < 500,
    'PE-INS-01: Request approved successfully': (r) => {
      try {
        const jsonResponse = JSON.parse(r.body);
        return jsonResponse.status === 'success' || r.status === 200;
      } catch (e) {
        return r.status === 200;
      }
    },
  });

  // Log de errores para debug
  if (res.status >= 400) {
    console.error(`❌ Error ${res.status} aprobando solicitud ${requestId}: ${res.body}`);
  }
}
