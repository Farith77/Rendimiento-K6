import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  vus: 20,
  duration: '2m',
};

export default function () {
  const url = 'https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/feedback/submit'; // ajustar si corresponde

  const payload = JSON.stringify({
    courseId: 'CS101',
    feedback: 'Buen curso',
    rating: 5
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  http.post(url, payload, params);
  sleep(1);
}
