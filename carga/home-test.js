import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 50,          // 10 usuarios virtuales
  duration: '30s',  // durante 30 segundos
};

export default function () {
  let res = http.get('https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/web/front/home');

  check(res, {
    'status es 200': (r) => r.status === 200,
    'carga no vacía': (r) => r.body && r.body.length > 500,
  });

  sleep(1); // espera antes de repetir
}
