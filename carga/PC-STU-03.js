import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { getHeaders } from '../login_token.js';

const studentEmails = new SharedArray("studentEmails", function () {
  const data = open('./students.csv');
  return data
    .split('\n')
    .slice(1) // omitir encabezado
    .map(line => line.trim())
    .filter(email => email); // descartar vacíos
});

export let options = {
  vus: 100,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  }
};

export default function () {
  const index = (__VU - 1) % studentEmails.length;
  const email = studentEmails[index];
  const courseId = 'agarciaa.uns-demo';

  const url = `https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/student?courseid=${courseId}&studentemail=${encodeURIComponent(email)}`;

  const headers = getHeaders();
  const res = http.get(url, { headers });

  /*console.log(`VU: ${__VU} | Email: ${email} | Status: ${res.status}`);
  console.log(`URL: ${url}`);
  console.log(`Body: ${res.body.substring(0, 100)}...`);
  console.log(`Headers: ${JSON.stringify(headers)}\n`);*/

  check(res, {
    'status is 200': r => r.status === 200,
    'body includes student name or email': r => r.body && r.body.includes(email.split('@')[0])
  });

  sleep(Math.random() * 1);
}
