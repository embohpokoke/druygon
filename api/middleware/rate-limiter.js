const requestLog = {};

function getClientId(req) {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

function cleanOldEntries() {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  for (const [clientId, data] of Object.entries(requestLog)) {
    data.requests = data.requests.filter(timestamp => timestamp > oneDayAgo);
    if (data.requests.length === 0) {
      delete requestLog[clientId];
    }
  }
}

function rateLimiter(req, res, next) {
  // Skip non-AI endpoints
  if (!req.path.startsWith('/api/ai/')) {
    return next();
  }

  // Skip GET requests (status, config)
  if (req.method === 'GET') {
    return next();
  }

  const clientId = getClientId(req);
  const now = Date.now();
  const maxPerDay = parseInt(process.env.MAX_REQUESTS_PER_DAY || '50');
  const maxPerHour = parseInt(process.env.MAX_REQUESTS_PER_HOUR || '15');

  // Clean old entries periodically
  if (Math.random() < 0.1) cleanOldEntries();

  // Initialize client log
  if (!requestLog[clientId]) {
    requestLog[clientId] = { requests: [] };
  }

  const requests = requestLog[clientId].requests;
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const hourlyCount = requests.filter(t => t > oneHourAgo).length;
  const dailyCount = requests.filter(t => t > oneDayAgo).length;

  if (hourlyCount >= maxPerHour) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: `Maksimal ${maxPerHour} request per jam. Coba lagi nanti ya!`,
      retryAfter: 3600
    });
  }

  if (dailyCount >= maxPerDay) {
    return res.status(429).json({
      success: false,
      error: 'Daily limit exceeded',
      message: `Maksimal ${maxPerDay} request per hari. Lanjut besok ya!`,
      retryAfter: 86400
    });
  }

  // Log this request
  requests.push(now);

  next();
}

module.exports = rateLimiter;
