/**
 * HTTP Client для веб и мобильных платформ
 * Автоматически использует CapacitorHttp на iOS/Android и fetch на вебе
 */
import { CapacitorHttp } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

/**
 * Универсальный HTTP-запрос для всех платформ
 * 
 * @param {string} url - URL запроса
 * @param {Object} options - Опции fetch
 * @param {string} options.method - HTTP метод (GET, POST, DELETE, etc)
 * @param {Object} options.headers - HTTP заголовки
 * @param {Object|string} options.body - Тело запроса (объект будет преобразован в JSON)
 * @param {AbortSignal} options.signal - AbortController signal
 * @returns {Promise<Response>} - Response объект с методами json(), text(), ok, status
 */
export async function httpFetch(url, options = {}) {
  const { method = 'GET', headers = {}, body, signal } = options;

  if (isNative) {
    // Мобильная платформа: используем CapacitorHttp
    try {
      const response = await CapacitorHttp.request({
        url,
        method,
        headers,
        data: typeof body === 'string' ? body : body,
        // Capacitor не поддерживает AbortSignal напрямую
      });

      // Создаём объект, совместимый с fetch Response
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.status.toString(),
        headers: new Map(Object.entries(response.headers || {})),
        url: response.url || url,
        
        // CapacitorHttp автоматически парсит JSON
        json: async () => response.data,
        text: async () => typeof response.data === 'string' 
          ? response.data 
          : JSON.stringify(response.data),
        
        // Для совместимости с кодом проверки response.ok
        clone: () => ({ ...response }),
      };
    } catch (error) {
      // Преобразуем ошибку Capacitor в стандартную
      throw new Error(error.message || 'Network request failed');
    }
  } else {
    // Веб платформа: стандартный fetch
    return fetch(url, { method, headers, body, signal });
  }
}

/**
 * POST запрос с JSON телом
 */
export async function httpPost(url, data, headers = {}) {
  return httpFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
  });
}

/**
 * GET запрос
 */
export async function httpGet(url, headers = {}) {
  return httpFetch(url, {
    method: 'GET',
    headers,
  });
}

/**
 * DELETE запрос
 */
export async function httpDelete(url, headers = {}) {
  return httpFetch(url, {
    method: 'DELETE',
    headers,
  });
}

/**
 * PUT запрос с JSON телом
 */
export async function httpPut(url, data, headers = {}) {
  return httpFetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
  });
}
