import { Router, type Request, type Response } from 'express';
import type { AddUserInput, MariaDbAccess, UpdateUserInput, UserLoginInput } from '@k_suite/shared';
import { createMariaDbAccess } from '../db/mariadb_access.js';

export interface UserRouterDeps {
  access?: Pick<MariaDbAccess, 'addUser' | 'loginUser' | 'getUser' | 'updateUser' | 'deleteUser'>;
}

export function createUserRouter(deps: UserRouterDeps = {}): Router {
  const router = Router();
  const access = deps.access ?? createMariaDbAccess();

  router.get('/auth', asyncHandler(async (req, res) => {
    const input: UserLoginInput = {
      email: readQuery(req, 'email'),
      password: readQuery(req, 'password'),
    };
    const result = await access.loginUser(input);
    setCookie(res, 'client_cookie', result.cookie);
    res.json(result);
  }));

  router.post('/auth', asyncHandler(async (req, res) => {
    const input = { ...(req.body as AddUserInput), guestCookie: readCookie(req, 'session_cookie') };
    const result = await access.addUser(input);
    setCookie(res, 'client_cookie', result.cookie);
    res.status(201).json(result);
  }));

  router.get('/profile', asyncHandler(async (req, res) => {
    const profile = await access.getUser(readQuery(req, 'email'), requireCookie(req, 'client_cookie'));
    res.json(profile);
  }));

  router.post('/profile', asyncHandler(async (req, res) => {
    const user = await access.updateUser(req.body as UpdateUserInput, readBodyEmail(req), requireCookie(req, 'client_cookie'));
    res.json({ user });
  }));

  router.delete('/profile', asyncHandler(async (req, res) => {
    await access.deleteUser(readBodyEmail(req), requireCookie(req, 'client_cookie'));
    res.clearCookie('client_cookie');
    res.status(204).send();
  }));

  return router;
}

export const userRouter = createUserRouter();

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response): void => {
    handler(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const status = message.includes('required') || message.includes('Invalid') ? 400 : 401;
      res.status(status).json({ error: message });
    });
  };
}

function readQuery(req: Request, name: string): string {
  const value = req.query[name];
  if (typeof value !== 'string' || !value) throw new Error(`${name} is required.`);
  return value;
}

function readBodyEmail(req: Request): string {
  const email = (req.body as { email?: unknown }).email;
  if (typeof email !== 'string' || !email) throw new Error('email is required.');
  return email;
}

function readCookie(req: Request, name: string): string | undefined {
  const rawCookie = req.headers.cookie ?? '';
  const cookie = rawCookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}

function requireCookie(req: Request, name: string): string {
  const cookie = readCookie(req, name);
  if (!cookie) throw new Error(`${name} is required.`);
  return cookie;
}

function setCookie(res: Response, name: string, value: string): void {
  res.cookie(name, value, { httpOnly: true, sameSite: 'lax' });
}
