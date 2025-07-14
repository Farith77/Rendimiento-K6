import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '1m', target: 40 },
    { duration: '1m', target: 60 },
    { duration: '1m', target: 80 },
    { duration: '1m', target: 100 },
  ],
};

export default function () {
  http.get('https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/web/front/home');
  sleep(1);
}