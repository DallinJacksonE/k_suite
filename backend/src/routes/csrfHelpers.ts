import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { readCookie, setCsrfCookie } from './cookieHelpers.js';

export const CSRF_HEADER_NAME = 'x-csrf-token';

export function issueCsrfToken(res: Response): { token: string; headerName: typeof CSRF_HEADER_NAME } {
  const token = randomBytes(32).toString('hex');
  setCsrfCookie(res, token);
  return { token, headerName: CSRF_HEADER_NAME };
}

export function requireCsrfToken(req: Request): void {
  const cookieToken = readCookie(req, 'csrf_token');
  const headerToken = req.header(CSRF_HEADER_NAME);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new CsrfError('Invalid CSRF token.');
  }
}

export class CsrfError extends Error {
  statusCode = 403;
}
