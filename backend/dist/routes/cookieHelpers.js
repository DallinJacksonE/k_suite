import { SESSION_TTL_MS } from '@k_suite/shared';
export { SESSION_TTL_MS };
export function readCookie(req, name) {
    const rawCookie = req.headers.cookie ?? '';
    const cookie = rawCookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}
export function requireCookie(req, name) {
    const cookie = readCookie(req, name);
    if (!cookie)
        throw new Error(`${name} is required.`);
    return cookie;
}
export function setSessionCookie(res, value) {
    setCookie(res, 'session_cookie', value, true);
}
export function setClientCookie(res, value) {
    setCookie(res, 'client_cookie', value, true);
}
export function setAdminCookie(res, value) {
    setCookie(res, 'admin_cookie', value, true);
}
export function setCsrfCookie(res, value) {
    setCookie(res, 'csrf_token', value, false);
}
export function clearClientCookie(res) {
    clearCookie(res, 'client_cookie');
}
function setCookie(res, name, value, httpOnly) {
    res.cookie(name, value, {
        httpOnly,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESSION_TTL_MS,
    });
}
function clearCookie(res, name) {
    res.clearCookie(name, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
    });
}
