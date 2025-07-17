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

// Generar 500 combinaciones para la prueba
const privilegesToUpdate = Array.from({ length: 500 }, (_, index) => ({
  courseId: data[index % data.length].courseId,
  instructorEmail: data[index % data.length].instructorEmail,
  role: roles[index % roles.length],
  index: index
}));

export let options = {
  vus: 1,
  iterations: privilegesToUpdate.length,
  thresholds: {
    'http_req_duration': ['p(95)<3000'],    // 95% de requests < 3s
    'http_req_failed': ['rate<0.05'],       // <5% de fallos aceptable
    'checks': ['rate>0.95'],                // 95% de validaciones exitosas
    'http_req_duration{group:::main}': ['avg<2000'], // Latencia promedio < 2s
  },
};

function generatePrivilegePayload(role, index) {
  const basePayload = {
    displayedToStudentsAs: `Instructor ${index + 1}`,
    role: role
  };

  // Si es Custom, agregar permisos específicos aleatorios
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
  const index = __ITER; // índice de iteración actual
  const privilege = privilegesToUpdate[index];

  const url = `${BASE_URL}/webapi/instructor/privilege?courseid=${privilege.courseId}&instructoremail=${privilege.instructorEmail}`;

  const payload = JSON.stringify(generatePrivilegePayload(privilege.role, privilege.index));

  const headers = getHeadersWithCSRF();

  const res = http.put(url, payload, { headers });

  check(res, {
    'PV-INS-02: Status is 200 o 201': (r) => r.status === 200 || r.status === 201,
    'PV-INS-02: Response time < 3000ms': (r) => r.timings.duration < 3000,
    'PV-INS-02: No server errors': (r) => r.status < 500,
    'PV-INS-02: Privilege updated successfully': (r) => {
      try {
        const jsonResponse = JSON.parse(r.body);
        return jsonResponse.status === 'success' || r.status === 200 || r.status === 201;
      } catch (e) {
        return r.status === 200;
      }
    },
  });

  // Log de errores para debug
  if (res.status >= 400) {
    console.error(`❌ Error ${res.status} actualizando privilegios para ${privilege.instructorEmail} en curso ${privilege.courseId}: ${res.body}`);
  }
}
