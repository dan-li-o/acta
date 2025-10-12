type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, payload?: LogPayload): void {
  const base = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...payload
  };

  if (level === 'error') {
    console.error(base);
    return;
  }

  if (level === 'warn') {
    console.warn(base);
    return;
  }

  console.info(base);
}

export const logger = {
  info: (message: string, payload?: LogPayload) => log('info', message, payload),
  warn: (message: string, payload?: LogPayload) => log('warn', message, payload),
  error: (message: string, payload?: LogPayload) => log('error', message, payload)
};
