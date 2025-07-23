import http from 'k6/http';
import { check } from 'k6';
import CSV from "k6/x/csv";
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

// Cargar y procesar el archivo CSV (ruta relativa desde la raíz del proyecto)
const csvData = open('./../csv/feedback.csv');
const rows = CSV.parse(csvData, ',');

const feedbackSessions = rows.map(row => ({
  courseId: row.courseId,
  fsName: row.fsName
})).filter(item => item.courseId && item.fsName);

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
    'http_req_failed': ['rate<0.15'],       // <15% de fallos aceptable para alta carga
    'checks': ['rate>0.85'],                // 85% de validaciones exitosas
    'http_req_duration{group:::main}': ['avg<3000'], // Tiempo promedio < 3s
  },
};

function getRandomFeedbackSession() {
  if (feedbackSessions.length === 0) {
    throw new Error('No hay sesiones de feedback disponibles en el CSV');
  }
  return feedbackSessions[__ITER % feedbackSessions.length];
}

function generateUpdatedFeedbackSession() {
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

  return {
    instructions: `<p>Updated instructions for session ${__ITER} - ${Date.now()}. This is an automated stress test modification.</p>`,
    submissionStartTimestamp: Math.floor(startTime),
    submissionEndTimestamp: Math.floor(endTime),
    gracePeriod: Math.floor(Math.random() * 30) + 5, // 5-35 minutos
    sessionVisibleSetting: "AT_OPEN",
    customSessionVisibleTimestamp: Math.floor(currentTime),
    responseVisibleSetting: "LATER",
    customResponseVisibleTimestamp: Math.floor(endTime + 3600000), // 1 hora después
    isClosingSoonEmailEnabled: Math.random() > 0.5,
    isPublishedEmailEnabled: Math.random() > 0.5,
    studentDeadlines: {},
    instructorDeadlines: {}
  };
}

export default function () {
  const session = getRandomFeedbackSession();
  const url = `${BASE_URL}/webapi/session?courseid=${session.courseId}&fsname=${encodeURIComponent(session.fsName)}&notifydeadlines=false`;
  const payload = JSON.stringify(generateUpdatedFeedbackSession());
  const headers = getHeadersWithCSRF();

  const res = http.put(url, payload, { headers });

  check(res, {
    'PE-FB-02: Status is 200 o 201': (r) => r.status === 200 || r.status === 201,
    'PE-FB-02: Response time < 5000ms': (r) => r.timings.duration < 5000,
    'PE-FB-02: No server errors': (r) => r.status < 500,
    'PE-FB-02: No client errors': (r) => r.status < 400,
    'PE-FB-02: Session updated successfully': (r) => {
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
    console.error(`❌ Error ${res.status} editando sesión ${session.fsName} en curso ${session.courseId}: ${res.body}`);
  }
}
