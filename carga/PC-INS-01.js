import http from 'k6/http';
import { check } from 'k6';
import { getHeadersWithCSRF } from '../login_token.js';

export const options = {
  vus: 100, // 100 usuarios simultáneos
  duration: '5m',
};

export default function () {
  const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;
  const url = 'https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/account/request';

  const payload = JSON.stringify({
    captchaResponse: "", // campo obligatorio aunque esté vacío
    instructorEmail: `instructor${uniqueId}@unsa.edu.pe`,
    instructorInstitution: "UNSA, Perú",
    instructorName: `Instructor ${uniqueId}`
  });

  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': getHeadersWithCSRF()['X-CSRF-TOKEN'],
    'Cookie': getHeadersWithCSRF().Cookie,
  };

  const res = http.post(url, payload, { headers });

  //console.info(`VU: ${__VU} | Status: ${res.status} | Body: ${res.body.slice(0, 80)}`);

  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
}

