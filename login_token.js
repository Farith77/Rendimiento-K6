/**
 * Módulo para generar cookies de autenticación automáticamente
 * Importa este archivo en tus otros tests para obtener las cookies actuales
 * 
 * Uso:
 * 1. Crea un archivo .env con tus tokens
 * 2. Ejecuta: k6 run tu-script.js
 */
import http from 'k6/http';
import { check } from 'k6';

/**
 * Función para obtener tokens desde variables de entorno (.env)
 * @returns {Object} Objeto con tokens del archivo .env
 */
export function getTokens() {
  try {
    const tokens = {
      jsessionId: __ENV.JSESSIONID,
      csrfToken: __ENV.CSRF_TOKEN,
      authToken: __ENV.AUTH_TOKEN,
    };

    // Validar que todos los tokens están presentes
    if (!tokens.jsessionId || !tokens.csrfToken || !tokens.authToken) {
      throw new Error('Tokens faltantes en el archivo .env');
    }
    
    return tokens;
  } catch (error) {
    console.error('❌ Error al cargar tokens desde .env:', error.message);
    console.error('💡 Asegúrate de tener un archivo .env con:');
    console.error('   JSESSIONID=tu_jsession_id');
    console.error('   CSRF_TOKEN=tu_csrf_token');
    console.error('   AUTH_TOKEN=tu_auth_token');
    throw new Error('No se pudieron cargar los tokens desde .env');
  }
}

/**
 * Función para generar las cookies automáticamente
 * @returns {string} String completa de cookies lista para usar
 */
export function getCookies() {
  const tokens = getTokens();
  return `JSESSIONID=${tokens.jsessionId}; CSRF-TOKEN=${tokens.csrfToken}; AUTH-TOKEN=${tokens.authToken}`;
}

/**
 * Función para obtener headers completos con cookies
 * @returns {Object} Headers object listo para requests HTTP
 */
export function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Cookie': getCookies(),
  };
}

/**
 * Función para obtener headers con CSRF token separado (para POST requests)
 * @returns {Object} Headers object con X-CSRF-TOKEN separado
 */
export function getHeadersWithCSRF() {
  const tokens = getTokens();
  return {
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN': tokens.csrfToken,
    'Cookie': getCookies(),
  };
}

export const options = {
  vus: 1,
  duration: '1s',
};

export default function () {
  const url = 'https://8-0-0-dot-teammates-grasshoppers-testing.uw.r.appspot.com/webapi/auth';
  const res = http.get(url, { headers: getHeaders() });
  console.log(res.body)

  check(res, {
    'Página cargada con éxito (status 200)': (r) => r.status === 200,
  });
}