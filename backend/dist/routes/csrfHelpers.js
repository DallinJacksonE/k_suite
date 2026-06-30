import { randomBytes } from 'node:crypto';
import { readCookie, setCsrfCookie } from './cookieHelpers.js';
export const CSRF_HEADER_NAME = 'x-csrf-token';
export function issueCsrfToken(res) {
    const token = randomBytes(32).toString('hex');
    setCsrfCookie(res, token);
    return { token, headerName: CSRF_HEADER_NAME };
}
export function requireCsrfToken(req) {
    const cookieToken = readCookie(req, 'csrf_token');
    const headerToken = req.header(CSRF_HEADER_NAME);
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        throw new CsrfError('Invalid CSRF token.');
    }
}
export class CsrfError extends Error {
    statusCode = 403;
}
