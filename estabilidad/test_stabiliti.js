import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  vus: 20,
  duration: '1h',
};

export default function () {
  http.get('https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/web/front/home');
  sleep(2);
}
