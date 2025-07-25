import http from 'k6/http';
import { check } from 'k6';
import { getHeadersWithCSRF } from '../login_token.js';

export const options = {
  vus: 50, // 50 instructores simultáneos
  duration: '2m',
};

export default function () {
  const courseId = '454454';
  const url = `https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/session?courseid=${courseId}`;

  const payload = JSON.stringify({
    feedbackSessionName: `Feedback_${__VU}_${__ITER}`,
    instructions: "<p>Please answer all the given questions.</p>",
    gracePeriod: 15,
    isClosingSoonEmailEnabled: true,
    isPublishedEmailEnabled: true,
    responseVisibleSetting: "LATER",
    sessionVisibleSetting: "AT_OPEN",
    submissionStartTimestamp: 1753282800000, // Wed, 23 Jul 2025 11:00:00 GMT
    submissionEndTimestamp: 1753416000000,   // Thu, 24 Jul 2025 23:59:00 GMT
    customSessionVisibleTimestamp: 0,
    customResponseVisibleTimestamp: 0
  });

  const headers = {
    ...getHeadersWithCSRF(),
    'Content-Type': 'application/json',
  };

  const res = http.post(url, payload, { headers });

  //console.log(`VU: ${__VU} | Status: ${res.status} | Body: ${res.body.slice(0, 80)}`);
  //console.log(`Payload enviado:\n${payload}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
}
