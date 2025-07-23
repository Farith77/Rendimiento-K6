import http from 'k6/http';
import { check } from 'k6';
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

const courseIds = [1,2,3,4,5]

// Generar 500 combinaciones para la prueba
const sessionsToCreate = Array.from({ length: 500 }, (_, index) => ({
  courseId: courseIds[index % courseIds.length],
  index: index
}));

export let options = {
  scenarios: {
    create_all_sessions: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: sessionsToCreate.length, // Total de sesiones a crear
      maxDuration: '4h',                   // Tiempo máximo para terminar
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<3000'],    // 95% de requests < 3s
    'http_req_failed': ['rate<0.05'],       // <5% de fallos aceptable
    'checks': ['rate>0.95'],                // 95% de validaciones exitosas
    'http_req_duration{group:::main}': ['avg<2000'], // Throughput: latencia promedio < 2s
  },
};

function generateFeedbackSession(index) {
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

  // Crear nombre único para volumen
  const uniqueId = `Volume_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  return {
    feedbackSessionName: `Feedback Session ${uniqueId}`,
    instructions: `<p>Please answer all the given questions for session ${index}. This is a volume test.</p>`,
    submissionStartTimestamp: Math.floor(startTime),
    submissionEndTimestamp: Math.floor(endTime),
    gracePeriod: (index % 30) + 5, // 5-34 minutos distribuidos
    sessionVisibleSetting: "AT_OPEN",
    customSessionVisibleTimestamp: Math.floor(currentTime),
    responseVisibleSetting: "LATER",
    customResponseVisibleTimestamp: Math.floor(endTime + 3600000), // 1 hora después
    isClosingSoonEmailEnabled: index % 2 === 0,
    isPublishedEmailEnabled: index % 3 === 0
  };
}

export default function () {
  const index = __ITER; // índice de iteración actual
  const session = sessionsToCreate[index];

  const url = `${BASE_URL}/webapi/session?courseid=${session.courseId}`;
  const payload = JSON.stringify(generateFeedbackSession(session.index));
  const headers = getHeadersWithCSRF();

  const res = http.post(url, payload, { headers });

  check(res, {
    'PV-FB-01: Status is 200 o 201': (r) => r.status === 200 || r.status === 201,
    'PV-FB-01: Response time < 3000ms': (r) => r.timings.duration < 3000,
    'PV-FB-01: No server errors': (r) => r.status < 500,
    'PV-FB-01: Session created successfully': (r) => {
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
    console.error(`❌ Error ${res.status} creando sesión de feedback en curso ${session.courseId}: ${res.body}`);
  }
}
