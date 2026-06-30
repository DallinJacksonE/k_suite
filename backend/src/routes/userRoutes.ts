import { Router, type Request, type Response } from 'express';
import type { AddUserInput, MariaDbAccess, UpdateUserInput, UserLoginInput } from '@k_suite/shared';
import { createMariaDbAccess } from '../db/mariadb_access.js';
import { clearClientCookie, readCookie, requireCookie, setClientCookie } from './cookieHelpers.js';
import { issueCsrfToken, requireCsrfToken } from './csrfHelpers.js';
import { assertNotRateLimited, createRateLimiter, type RateLimitOptions } from './rateLimitHelpers.js';

export interface UserRouterDeps {
  access?: Pick<MariaDbAccess, 'addUser' | 'loginUser' | 'getSession' | 'logoutUser' | 'getUser' | 'updateUser' | 'deleteUser'>;
  rateLimit?: RateLimitOptions;
}

export function createUserRouter(deps: UserRouterDeps = {}): Router {
  const router = Router();
  const access = deps.access ?? createMariaDbAccess();
  const limiter = createRateLimiter(deps.rateLimit);

  router.get('/auth', asyncHandler(async (req, res) => {
    assertNotRateLimited(limiter, req, `login:${readQuery(req, 'email').toLowerCase()}`);
    const input: UserLoginInput = {
      email: readQuery(req, 'email'),
      password: readQuery(req, 'password'),
    };
    const result = await access.loginUser(input);
    setClientCookie(res, result.cookie);
    res.json(result);
  }));

  router.post('/login', asyncHandler(async (req, res) => {
    const input = req.body as UserLoginInput;
    assertNotRateLimited(limiter, req, `login:${String(input.email ?? '').toLowerCase()}`);
    const result = await access.loginUser(input);
    setClientCookie(res, result.cookie);
    res.json({ status: 'authenticated', user: result.user });
  }));

  router.post('/auth', asyncHandler(async (req, res) => {
    assertNotRateLimited(limiter, req, `register:${String((req.body as { email?: unknown }).email ?? req.ip)}`);
    const input = { ...(req.body as AddUserInput), guestCookie: readCookie(req, 'session_cookie') };
    const result = await access.addUser(input);
    setClientCookie(res, result.cookie);
    res.status(201).json(result);
  }));

  router.get('/csrf', (_req, res) => {
    res.json(issueCsrfToken(res));
  });

  router.get('/session', asyncHandler(async (req, res) => {
    res.json(await access.getSession({ sessionCookie: readCookie(req, 'session_cookie'), clientCookie: readCookie(req, 'client_cookie') }));
  }));

  router.post('/logout', asyncHandler(async (req, res) => {
    await access.logoutUser(readCookie(req, 'client_cookie'));
    clearClientCookie(res);
    res.status(204).send();
  }));

  router.get('/profile', asyncHandler(async (req, res) => {
    const clientCookie = requireCookie(req, 'client_cookie');
    const email = readOptionalQuery(req, 'email') ?? await readSessionEmail(access, req);
    const profile = await access.getUser(email, clientCookie);
    res.json(profile);
  }));

  router.post('/profile', asyncHandler(async (req, res) => {
    requireCsrfToken(req);
    const user = await access.updateUser(req.body as UpdateUserInput, readBodyEmail(req), requireCookie(req, 'client_cookie'));
    res.json({ user });
  }));

  router.delete('/profile', asyncHandler(async (req, res) => {
    requireCsrfToken(req);
    await access.deleteUser(readBodyEmail(req), requireCookie(req, 'client_cookie'));
    clearClientCookie(res);
    res.status(204).send();
  }));

  return router;
}

export const userRouter = createUserRouter();

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response): void => {
    handler(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 429) res.status(429).json({ error: 'rate_limited', message, retryAfterSeconds: (error as { retryAfterSeconds?: number }).retryAfterSeconds ?? 60 });
      else res.status(statusCode ?? (message.includes('required') || message.includes('Invalid CSRF') ? 400 : message.includes('Invalid') ? 400 : 401)).json({ error: message });
    });
  };
}

function readQuery(req: Request, name: string): string {
  const value = readOptionalQuery(req, name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function readOptionalQuery(req: Request, name: string): string | undefined {
  const value = req.query[name];
  return typeof value === 'string' && value ? value : undefined;
}

async function readSessionEmail(access: Pick<MariaDbAccess, 'getSession'>, req: Request): Promise<string> {
  const session = await access.getSession({ sessionCookie: readCookie(req, 'session_cookie'), clientCookie: readCookie(req, 'client_cookie') });
  if (session.status !== 'authenticated') throw new Error('Invalid or expired cookie.');
  return session.user.email;
}

function readBodyEmail(req: Request): string {
  const email = (req.body as { email?: unknown }).email;
  if (typeof email !== 'string' || !email) throw new Error('email is required.');
  return email;
}


