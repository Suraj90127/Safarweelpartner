/**
 * Logger Utility
 * Wraps console.* with environment-aware guards.
 * In production builds all logs are silenced.
 */

const IS_DEV = __DEV__;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[SafarweelPartner]';

const formatMessage = (level: LogLevel, tag: string, msg: string) =>
  `${PREFIX} [${level.toUpperCase()}] [${tag}] ${msg}`;

export const logger = {
  debug: (tag: string, msg: string, ...args: unknown[]) => {
    if (IS_DEV) {
      console.debug(formatMessage('debug', tag, msg), ...args);
    }
  },

  info: (tag: string, msg: string, ...args: unknown[]) => {
    if (IS_DEV) {
      console.info(formatMessage('info', tag, msg), ...args);
    }
  },

  warn: (tag: string, msg: string, ...args: unknown[]) => {
    if (IS_DEV) {
      console.warn(formatMessage('warn', tag, msg), ...args);
    }
  },

  error: (tag: string, msg: string, ...args: unknown[]) => {
    // Errors are always logged (even in prod — send to crash reporter)
    console.error(formatMessage('error', tag, msg), ...args);
  },
};

export default logger;
