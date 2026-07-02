import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ToastRequest {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

export interface ToastContextValue {
  toasts: ToastMessage[];
  showToast(request: ToastRequest): string;
  closeToast(toastId: string): void;
  clearToasts(): void;
}

export interface ToastProviderProps {
  children: ReactNode;
  defaultDurationMs?: number;
  maxToasts?: number;
}

export const DEFAULT_TOAST_DURATION_MS = 4_000;
export const DEFAULT_MAX_TOASTS = 4;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children, defaultDurationMs = DEFAULT_TOAST_DURATION_MS, maxToasts = DEFAULT_MAX_TOASTS }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const closeToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback((request: ToastRequest): string => {
    const message = request.message.trim();
    if (!message) throw new Error('Toast message is required.');
    const toast: ToastMessage = {
      id: `toast-${Date.now()}-${nextId.current++}`,
      message,
      variant: request.variant ?? 'info',
      durationMs: normalizeDuration(request.durationMs, defaultDurationMs),
    };
    setToasts((current) => [...current, toast].slice(-maxToasts));
    return toast.id;
  }, [defaultDurationMs, maxToasts]);

  const value = useMemo<ToastContextValue>(() => ({ toasts, showToast, closeToast, clearToasts }), [toasts, showToast, closeToast, clearToasts]);

  return createElement(ToastContext.Provider, { value }, children, createElement(ToastViewport, null));
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider.');
  return context;
}

export function ToastViewport() {
  const { toasts, closeToast } = useToast();
  return createElement(
    'div',
    { className: 'ks-toast-viewport', 'aria-live': 'polite', 'aria-label': 'Notifications' },
    toasts.map((toast) => createElement(ToastItem, { key: toast.id, toast, onClose: closeToast })),
  );
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose(toastId: string): void }) {
  useEffect(() => {
    if (toast.durationMs <= 0) return undefined;
    const timeout = window.setTimeout(() => onClose(toast.id), toast.durationMs);
    return () => window.clearTimeout(timeout);
  }, [toast.durationMs, toast.id, onClose]);

  return createElement(
    'section',
    { className: `ks-toast ks-toast--${toast.variant}`, role: toast.variant === 'danger' ? 'alert' : 'status' },
    createElement('p', { className: 'ks-toast__message' }, toast.message),
    createElement('button', { type: 'button', className: 'ks-toast__close', 'aria-label': 'Close notification', onClick: () => onClose(toast.id) }, '×'),
  );
}

function normalizeDuration(durationMs: number | undefined, fallbackMs: number): number {
  const duration = durationMs ?? fallbackMs;
  if (!Number.isFinite(duration) || duration < 0) throw new Error('Toast duration must be zero or a positive number.');
  return duration;
}
