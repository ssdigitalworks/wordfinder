/**
 * A tiny structured logger that prefixes messages with log level and timestamp.
 */
export const logger = {
  info: (msg: string, ...args: unknown[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, ...args);
  },
  error: (msg: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, ...args);
  },
  debug: (msg: string, ...args: unknown[]) => {
    if (!import.meta.env.PROD) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${msg}`, ...args);
    }
  },
};
