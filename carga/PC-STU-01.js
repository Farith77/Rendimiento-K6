import http from 'k6/http';
import { check } from 'k6';
import { getHeadersWithCSRF } from '../login_token.js';

export const options = {
  vus: 50,       // 50 usuarios simultáneos
  duration: '2m'
};

export default function () {
  const courseId = 'C12345678901234567890'; // <-- Actualiza si es necesario
  const url = `https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/students?courseid=${courseId}`;

  const studentList = [];
  const sections = ['G1', 'G2', 'G3', 'G4', 'G5'];
  const teams = ['A', 'B', 'C', 'D', 'E'];

  for (let i = 0; i < 10; i++) {
    const section = sections[i % sections.length];           // Rota entre G1-G5
    const team = teams[i % teams.length];                    // Rota entre A-E
    studentList.push({
      section: section,
      team: team,
      name: `Estudiante${__VU}-${i}`,
      email: `estudiante${__VU}-${i}@gmail.com`,
      comments: ''
    });
  }

  const payload = JSON.stringify({
    studentEnrollRequests: studentList
  });

  const headers = {
    ...getHeadersWithCSRF(),
    'Content-Type': 'application/json',
  };

  const res = http.put(url, payload, { headers });

  console.log(`VU: ${__VU} | Status: ${res.status} | Response: ${res.body.slice(0, 80)}`);
  console.log(`Payload enviado:\n${payload}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 3s': (r) => r.timings.duration < 3000,
  });
}
