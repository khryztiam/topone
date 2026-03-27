/**
 * Rate Limiting Middleware
 * Protege contra abuso de API (múltiples votos del mismo usuario)
 * 
 * Uso en endpoints:
 *   const limited = rateLimit(handler, { max: 1, window: 86400000 });
 *   export default limited;
 */

const requests = new Map();

/**
 * Middleware de rate limiting
 * @param {Function} handler - Función del endpoint
 * @param {Object} options - Configuración
 * @param {number} options.max - Máximo requests (default: 100)
 * @param {number} options.window - Ventana tiempo en ms (default: 15 min)
 * @param {string} options.key - Campo para identificar usuario: 'ip', 'user', o custom
 */
export function rateLimit(handler, options = {}) {
  const { max = 100, window = 15 * 60 * 1000, key = 'ip' } = options;

  return async (req, res) => {
    try {
      // Obtener identificador (IP o JWT user ID)
      let identifier;
      
      if (key === 'ip') {
        // Para límites por IP (público)
        identifier = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.socket.remoteAddress || 
                    'unknown';
      } else if (key === 'user') {
        // Para límites por usuario autenticado (JWT)
        const authHeader = req.headers.authorization;
        try {
          const token = authHeader?.substring(7);
          // Decodificar JWT y extraer subject (user ID)
          const payload = Buffer.from(token?.split('.')[1] || '', 'base64').toString();
          const decoded = JSON.parse(payload);
          identifier = decoded.sub || 'unknown';
        } catch (err) {
          console.error('[RateLimit] Error decoding JWT:', err.message);
          identifier = 'unknown';
        }
      } else {
        // Key personalizada
        identifier = key;
      }

      const now = Date.now();
      const endpoint = `${req.method} ${req.url}`;
      const rateLimitKey = `${identifier}:${endpoint}`;

      // Obtener o crear lista de timestamps
      if (!requests.has(rateLimitKey)) {
        requests.set(rateLimitKey, []);
      }

      // Limpiar requests fuera del tiempo ventana
      let timestamps = requests.get(rateLimitKey);
      const recentRequests = timestamps.filter(t => now - t < window);
      requests.set(rateLimitKey, recentRequests);

      // Verificar si se excedió el límite
      if (recentRequests.length >= max) {
        console.warn(`[RATELIMIT] Límite excedido para ${rateLimitKey} (${recentRequests.length}/${max})`);
        
        // Headers informativos
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', new Date(now + window).toISOString());
        
        return res.status(429).json({ 
          error: 'Demasiadas solicitudes. Intenta más tarde.',
          message: `Límite: ${max} solicitud(es) por ${Math.ceil(window / 1000)}s`,
          retryAfter: Math.ceil((recentRequests[0] + window - now) / 1000)
        });
      }

      // Agregar request actual
      recentRequests.push(now);
      requests.set(rateLimitKey, recentRequests);

      // Headers informativos de éxito
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - recentRequests.length);
      res.setHeader('X-RateLimit-Reset', new Date(now + window).toISOString());

      // Llamar al handler original
      return handler(req, res);
    } catch (err) {
      console.error('[RateLimit] Middleware error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Limpia todos los registros de rate limit
 * Útil para testing
 */
export function clearRateLimit() {
  requests.clear();
}

/**
 * Obtiene estadísticas de rate limiting
 * Útil para debugging
 */
export function getRateLimitStats() {
  return {
    totalKeys: requests.size,
    keys: Array.from(requests.entries()).map(([key, timestamps]) => ({
      key,
      count: timestamps.length,
      oldestRequest: timestamps[0] ? new Date(timestamps[0]) : null,
    }))
  };
}
