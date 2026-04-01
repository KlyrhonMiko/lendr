type LogContext = Record<string, unknown>;

const isDevelopment = process.env.NODE_ENV !== 'production';

function writeLog(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: LogContext): void {
  if (!isDevelopment && level !== 'warn' && level !== 'error') {
    return;
  }

  const prefix = `[lendr] ${message}`;

  if (level === 'debug') {
    if (context) {
      console.debug(prefix, context);
      return;
    }
    console.debug(prefix);
    return;
  }

  if (level === 'info') {
    if (context) {
      console.info(prefix, context);
      return;
    }
    console.info(prefix);
    return;
  }

  if (level === 'warn') {
    if (context) {
      console.warn(prefix, context);
      return;
    }
    console.warn(prefix);
    return;
  }

  if (context) {
    console.error(prefix, context);
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
