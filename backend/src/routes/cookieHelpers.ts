import type { Request, Response } from 'express';
import { SESSION_TTL_MS } from '@k_suite/shared';

export { SESSION_TTL_MS };

export type CookieName = 'session_cookie' | 'client_cookie' | 'admin_cookie' | 'csrf_token';

export function readCookie(req: Request, name: CookieName): string | undefined {
  const rawCookie = req.headers.cookie ?? '';
  const cookie = rawCookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}

export function requireCookie(req: Request, name: CookieName): string {
  const cookie = readCookie(req, name);
  if (!cookie) throw new Error(`${name} is required.`);
  return cookie;
}

export function setSessionCookie(res: Response, value: string): void {
  setCookie(res, 'session_cookie', value, true);
}

export function setClientCookie(res: Response, value: string): void {
  setCookie(res, 'client_cookie', value, true);
}

export function setAdminCookie(res: Response, value: string): void {
  setCookie(res, 'admin_cookie', value, true);
}

export function setCsrfCookie(res: Response, value: string): void {
  setCookie(res, 'csrf_token', value, false);
}

export function clearClientCookie(res: Response): void {
  clearCookie(res, 'client_cookie');
}

function setCookie(res: Response, name: CookieName, value: string, httpOnly: boolean): void {
  res.cookie(name, value, {
    httpOnly,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
  });
}

function clearCookie(res: Response, name: CookieName): void {
  res.clearCookie(name, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}
