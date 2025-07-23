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

// Generar 500 combinaciones para la prueba
const sessionsToUpdate = Array.from({ length: 500 }, (_, index) => ({
  courseId: feedbackSessions[index % feedbackSessions.length].courseId,
  fsName: feedbackSessions[index % feedbackSessions.length].fsName,
  index: index
}));

export let options = {
  scenarios: {
    update_all_sessions: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: sessionsToUpdate.length, // Total de sesiones a actualizar
      maxDuration: '4h',                   // Tiempo máximo para terminar
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<3000'],    // 95% de requests < 3s
    'http_req_failed': ['rate<0.05'],       // <5% de fallos aceptable
    'checks': ['rate>0.95'],                // 95% de validaciones exitosas
    'http_req_duration{group:::main}': ['avg<2500'], // Latencia promedio < 2.5s
  },
};

function generateUpdatedFeedbackSession(index) {
  const currentTime = Date.now();

  // Calcular la próxima hora exacta
  const currentDate = new Date(currentTime);
  const nextHour = new Date(currentDate);
  nextHour.setHours(currentDate.getHours() + 1, 0, 0, 0); // Próxima hora, minutos y segundos en 0

  // Tiempo de inicio: próxima hora exacta + horas adicionales basadas en el índice
  const hoursToAdd = (index % 24); // 0-23 horas distribuidas
  const startTime = nextHour.getTime() + (hoursToAdd * 3600000);

  // Tiempo de fin: 1-8 horas después del inicio (en horas exactas)
  const durationHours = (index % 8) + 1; // 1-8 horas distribuidas
  const endTime = startTime + (durationHours * 3600000);

  return {
    instructions: `<p>Updated instructions for volume test session ${index} - ${Date.now()}. Mass update operation.</p>`,
    submissionStartTimestamp: Math.floor(startTime),
    submissionEndTimestamp: Math.floor(endTime),
    gracePeriod: (index % 30) + 5, // 5-34 minutos distribuidos
    sessionVisibleSetting: "AT_OPEN",
    customSessionVisibleTimestamp: Math.floor(currentTime),
    responseVisibleSetting: "LATER",
    customResponseVisibleTimestamp: Math.floor(endTime + 3600000), // 1 hora después
    isClosingSoonEmailEnabled: index % 2 === 0,
    isPublishedEmailEnabled: index % 3 === 0,
    studentDeadlines: {},
    instructorDeadlines: {}
  };
}

export default function () {
  const index = __ITER; // índice de iteración actual
  const session = sessionsToUpdate[index];

  const url = `${BASE_URL}/webapi/session?courseid=${session.courseId}&fsname=${encodeURIComponent(session.fsName)}&notifydeadlines=false`;
  const payload = JSON.stringify(generateUpdatedFeedbackSession(session.index));
  const headers = getHeadersWithCSRF();

  const res = http.put(url, payload, { headers });

  check(res, {
    'PV-FB-02: Status is 200 o 201': (r) => r.status === 200 || r.status === 201,
    'PV-FB-02: Response time < 3000ms': (r) => r.timings.duration < 3000,
    'PV-FB-02: No server errors': (r) => r.status < 500,
    'PV-FB-02: Session updated successfully': (r) => {
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
