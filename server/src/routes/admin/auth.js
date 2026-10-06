import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { HttpError } from '../../utils/httpError.js';

const SESSION_TTL = 12 * 60 * 60;

function getConfig() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !secret) throw new HttpError(503, 'Admin access is not configured on this server');
  return { password, secret };
}

function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSession(password) {
  const { password: expected, secret } = getConfig();
  const suppliedHash = createHash('sha256').update(String(password ?? '')).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  if (!timingSafeEqual(suppliedHash, expectedHash)) throw new HttpError(401, 'Invalid admin password');

  const payload = Buffer.from(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL,
    nonce: randomBytes(12).toString('hex'),
  })).toString('base64url');
  return { token: `${payload}.${sign(payload, secret)}`, expires_in: SESSION_TTL };
}

export function requireAdmin(req, res, next) {
  try {
    const { secret } = getConfig();
    const authorization = String(req.headers.authorization || '');
    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
    const [payload, signature, extra] = (match?.[1] || '').split('.');
    if (!payload || !signature || extra) throw new HttpError(401, 'Admin session is invalid or expired');

    const actual = Buffer.from(signature);
    const expected = Buffer.from(sign(payload, secret));
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new HttpError(401, 'Admin session is invalid or expired');
    }

    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isInteger(session.exp) || session.exp <= Date.now() / 1000) {
      throw new HttpError(401, 'Admin session is invalid or expired');
    }
    next();
  } catch (error) {
    next(error);
  }
}