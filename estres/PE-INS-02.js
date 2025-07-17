import http from 'k6/http';
import { check } from 'k6';
import CSV from "k6/x/csv";
import { getHeadersWithCSRF } from '../login_token.js';
import { BASE_URL } from '../config.js';

// Cargar y procesar el archivo CSV (ruta relativa desde la raíz del proyecto)
const csvData = open('./instructor.csv');
const rows = CSV.parse(csvData, ',');

const data = rows.map(row => ({
  courseId: row.courseId,
  instructorEmail: row.instructorEmail
})).filter(item => item.courseId && item.instructorEmail);


// Roles predefinidos disponibles
const roles = ['Co-owner', 'Manager', 'Observer', 'Tutor', 'Custom'];

export let options = {
  stages: [
    { duration: '1m', target: 50 },   // Subida inicial
    { duration: '1m', target: 100 },  // Más carga
    { duration: '1m', target: 150 },  // Carga media
    { duration: '1m', target: 200 },  // Carga alta
    { duration: '1m', target: 250 },  // Cerca del límite
    { duration: '1m', target: 300 },  // Máximo estrés
    { duration: '1m', target: 0 },    // Bajada
  ],
  thresholds: {
    'http_req_duration': ['p(95)<5000'],    // 95% de requests < 5s
    'http_req_failed': ['rate<0.1'],        // <10% de fallos aceptable
    'checks': ['rate>0.9'],                 // 90% de validaciones exitosas
    'http_req_duration{group:::main}': ['avg<3000'], // Latencia promedio < 3s
  },
};

function getRandomData() {
  if (data.length === 0) {
    throw new Error('No hay datos disponibles en el CSV');
  }
  return data[__ITER % data.length];
}

function getRandomRole() {
  return roles[__ITER % roles.length];
}

function generatePrivilegePayload(role) {
  const basePayload = {
    displayedToStudentsAs: `Instructor ${__ITER}`,
    role: role
  };

  // Si es Custom, agregar permisos específicos
  if (role === 'Custom') {
    basePayload.canModifyCourse = Math.random() > 0.5;
    basePayload.canModifyInstructor = Math.random() > 0.5;
    basePayload.canModifySession = Math.random() > 0.5;
    basePayload.canModifyStudent = Math.random() > 0.5;
    basePayload.canViewStudentInSections = Math.random() > 0.5;
    basePayload.canViewSessionInSections = Math.random() > 0.5;
    basePayload.canSubmitSessionInSections = Math.random() > 0.5;
    basePayload.canModifySessionCommentInSections = Math.random() > 0.5;
  }

  return basePayload;
}

export default function () {
  const { courseId, instructorEmail } = getRandomData();
  const role = getRandomRole();

  const url = `${BASE_URL}/webapi/instructor/privilege?courseid=${courseId}&instructoremail=${instructorEmail}`;
  const payload = JSON.stringify(generatePrivilegePayload(role));
  const headers = getHeadersWithCSRF();

  const res = http.put(url, payload, { headers });

  check(res, {
    'PE-INS-02: Status is 200 o 201': (r) => r.status === 200 || r.status === 201,
    'PE-INS-02: Response time < 5000ms': (r) => r.timings.duration < 5000,
    'PE-INS-02: No server errors': (r) => r.status < 500,
    'PE-INS-02: Privilege updated successfully': (r) => {
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
    console.error(`❌ Error ${res.status} actualizando privilegios para ${instructorEmail} en curso ${courseId}: ${res.body}`);
  }
}
