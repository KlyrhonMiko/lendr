type LogContext = Record<string, unknown>;

const isDevelopment = process.env.NODE_ENV !== 'production';
const CORRELATION_ID_KEY = 'lendr_last_correlation_id';

export function setCorrelationId(correlationId: string | null | undefined): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!correlationId) {
    window.sessionStorage.removeItem(CORRELATION_ID_KEY);
    return;
  }

  window.sessionStorage.setItem(CORRELATION_ID_KEY, correlationId);
}

export function getCorrelationId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage.getItem(CORRELATION_ID_KEY);
}

function withCorrelationContext(context?: LogContext): LogContext | undefined {
  const correlationId = getCorrelationId();
  if (!correlationId) {
    return context;
  }

  return {
    correlationId,
    ...(context ?? {}),
  };
}

function writeLog(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: LogContext): void {
  if (!isDevelopment && level !== 'warn' && level !== 'error') {
    return;
  }

  const prefix = `[lendr] ${message}`;
  const logContext = withCorrelationContext(context);

  if (level === 'debug') {
    if (logContext) {
      console.debug(prefix, logContext);
      return;
    }
    console.debug(prefix);
    return;
  }

  if (level === 'info') {
    if (logContext) {
      console.info(prefix, logContext);
      return;
    }
    console.info(prefix);
    return;
  }

  if (level === 'warn') {
    if (logContext) {
      console.warn(prefix, logContext);
      return;
    }
    console.warn(prefix);
    return;
  }

  if (logContext) {
    console.error(prefix, logContext);
    return;
  }
  console.error(prefix);
}

export const logger = {
  debug: (message: string, context?: LogContext) => writeLog('debug', message, context),
  info: (message: string, context?: LogContext) => writeLog('info', message, context),
  warn: (message: string, context?: LogContext) => writeLog('warn', message, context),
  error: (message: string, context?: LogContext) => writeLog('error', message, context),
};
