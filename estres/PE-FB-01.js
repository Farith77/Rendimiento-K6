import http from 'k6/http';
import { check } from 'k6';
import CSV from "k6/x/csv";
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

// Cargar y procesar el archivo CSV (ruta relativa desde la raíz del proyecto)
const csvData = open('./courses.csv');
const rows = CSV.parse(csvData, ',');

const courseIds = rows.map(row => row.courseId).filter(id => id);

export let options = {
  stages: [
    { duration: '1m', target: 100 },   // Subida inicial
    { duration: '1m', target: 200 },   // Más carga
    { duration: '1m', target: 400 },   // Carga media
    { duration: '1m', target: 500 },   // Máximo estrés
    { duration: '2m', target: 500 },   // Mantener máximo
    { duration: '1m', target: 0 },     // Bajada
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'],    // 95% de requests < 5s
    'http_req_failed': ['rate<0.15'],       // <15% de fallos aceptable para alta carga
    'checks': ['rate>0.85'],                // 85% de validaciones exitosas
  },
};

function getRandomCourseId() {
  if (courseIds.length === 0) {
    throw new Error('No hay courseIds disponibles en el CSV');
  }
  return courseIds[__ITER % courseIds.length];
}

function generateFeedbackSession() {
  const currentTime = Date.now();

  // Calcular la próxima hora exacta
  const currentDate = new Date(currentTime);
  const nextHour = new Date(currentDate);
  nextHour.setHours(currentDate.getHours() + 1, 0, 0, 0); // Próxima hora, minutos y segundos en 0

  // Tiempo de inicio: próxima hora exacta + horas adicionales aleatorias
  const hoursToAdd = Math.floor(Math.random() * 24); // 0-23 horas adicionales
  const startTime = nextHour.getTime() + (hoursToAdd * 3600000);

  // Tiempo de fin: 1-8 horas después del inicio (en horas exactas)
  const durationHours = Math.floor(Math.random() * 8) + 1; // 1-8 horas
  const endTime = startTime + (durationHours * 3600000);

  // Crear nombre único usando VU, iteración, timestamp y string aleatorio
  const uniqueId = `${__VU}_${__ITER}_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

  return {
    feedbackSessionName: `Feedback Session ${uniqueId}`,
    instructions: `<p>Please answer all the given questions for session ${__ITER}. This is an automated stress test.</p>`,
    submissionStartTimestamp: Math.floor(startTime),
    submissionEndTimestamp: Math.floor(endTime),
    gracePeriod: Math.floor(Math.random() * 30) + 5, // 5-35 minutos
    sessionVisibleSetting: "AT_OPEN",
    customSessionVisibleTimestamp: Math.floor(currentTime),
    responseVisibleSetting: "LATER",
    customResponseVisibleTimestamp: Math.floor(endTime + 3600000), // 1 hora después
    isClosingSoonEmailEnabled: Math.random() > 0.5,
    isPublishedEmailEnabled: Math.random() > 0.5
  };
}

export default function () {
  const courseId = getRandomCourseId();
  const url = `${BASE_URL}/webapi/session?courseid=${courseId}`;
  const payload = JSON.stringify(generateFeedbackSession());
  const headers = getHeadersWithCSRF();

  const res = http.post(url, payload, { headers });

  check(res, {
    'PE-FB-01: Status is 200 o 201': (r) => r.status === 200 || r.status === 201,
    'PE-FB-01: Response time < 5000ms': (r) => r.timings.duration < 5000,
    'PE-FB-01: No server errors': (r) => r.status < 500,
    'PE-FB-01: No client errors': (r) => r.status < 400,
    'PE-FB-01: Session created successfully': (r) => {
      try {
        const jsonResponse = JSON.parse(r.body);
        return jsonResponse.status === 'success' || r.status === 200 || r.status === 201;
      } catch (e) {
        return r.status === 200 || r.status === 201;
      }
    },
  });

  // Log de errores para debug
  if (res.status >= 400) {
    console.error(`❌ Error ${res.status} creando sesión de feedback en curso ${courseId}: ${res.body}`);
  }
}
