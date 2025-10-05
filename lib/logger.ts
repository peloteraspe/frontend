/**
 * Centralized logging utility for the Peloteras application
 * Provides structured logging with different levels and environment-based configuration
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  timestamp: string;
  error?: Error;
}

class Logger {
  private readonly isDevelopment: boolean;
  private readonly isServer: boolean;
  private readonly minLogLevel: LogLevel;
  private readonly logApiCalls: boolean;
  private readonly logDatabaseOps: boolean;
  private readonly logAuthEvents: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isServer = typeof window === 'undefined';
    
    // Parse log level from environment or use defaults
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLogLevel && LogLevel[envLogLevel as keyof typeof LogLevel] !== undefined) {
      this.minLogLevel = LogLevel[envLogLevel as keyof typeof LogLevel];
    } else {
      this.minLogLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
    }
    
    // Feature flags for different types of logging
    this.logApiCalls = process.env.LOG_API_CALLS !== 'false';
    this.logDatabaseOps = process.env.LOG_DATABASE_OPS !== 'false';
    this.logAuthEvents = process.env.LOG_AUTH_EVENTS !== 'false';
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLogLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, context, timestamp } = entry;
    const levelName = LogLevel[level];
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${levelName} ${contextStr} ${message}`;
  }

  private log(level: LogLevel, message: string, context?: string, data?: any, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      context,
      data,
      timestamp: new Date().toISOString(),
      error,
    };

    const formattedMessage = this.formatMessage(entry);

    // In development, use console for immediate feedback
    if (this.isDevelopment) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage, data || '');
          break;
        case LogLevel.INFO:
          console.info(formattedMessage, data || '');
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, data || '');
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage, error || data || '');
          if (error?.stack) console.error(error.stack);
          break;
      }
    } else {
      // In production, you might want to send logs to a service like Sentry, LogRocket, etc.
      this.sendToLoggingService(entry);
    }
  }

  private sendToLoggingService(entry: LogEntry): void {
    // TODO: Integrate with your preferred logging service (Sentry, DataDog, etc.)
    // For now, we'll use console in production but with structured format
    const structuredLog = {
      ...entry,
      environment: process.env.NODE_ENV,
      userAgent: this.isServer ? 'server' : navigator?.userAgent,
    };

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error('[PELOTERAS_ERROR]', JSON.stringify(structuredLog));
        break;
      case LogLevel.WARN:
        console.warn('[PELOTERAS_WARN]', JSON.stringify(structuredLog));
        break;
      default:
        console.log('[PELOTERAS_LOG]', JSON.stringify(structuredLog));
    }
  }

  /**
   * Debug level - detailed information for development
   */
  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  /**
   * Info level - general information about application flow
   */
  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  /**
   * Warning level - something unexpected but not necessarily an error
   */
  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  /**
   * Error level - error conditions that should be investigated
   */
  error(message: string, context?: string, error?: Error | any, data?: any): void {
    if (error instanceof Error) {
      this.log(LogLevel.ERROR, message, context, data, error);
    } else {
      // If 'error' is actually data, treat it as such
      this.log(LogLevel.ERROR, message, context, error || data);
    }
  }

  /**
   * Log API request/response for debugging
   */
  apiCall(method: string, url: string, status?: number, data?: any): void {
    if (!this.logApiCalls) return;
    
    const message = `API ${method.toUpperCase()} ${url}${status ? ` (${status})` : ''}`;
    if (status && status >= 400) {
      this.error(message, 'API', data);
    } else {
      this.debug(message, 'API', data);
    }
  }

  /**
   * Log database operations
   */
  database(operation: string, table: string, error?: Error, data?: any): void {
    if (!this.logDatabaseOps) return;
    
    const message = `Database ${operation} on ${table}`;
    if (error) {
      this.error(message, 'DATABASE', error, data);
    } else {
      this.debug(message, 'DATABASE', data);
    }
  }

  /**
   * Log authentication events
   */
  auth(event: string, userId?: string, error?: Error): void {
    if (!this.logAuthEvents) return;
    
    const message = `Auth ${event}${userId ? ` for user ${userId}` : ''}`;
    if (error) {
      this.error(message, 'AUTH', error);
    } else {
      this.info(message, 'AUTH');
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions for easier migration from console statements
export const log = {
  debug: (message: string, context?: string, data?: any) => logger.debug(message, context, data),
  info: (message: string, context?: string, data?: any) => logger.info(message, context, data),
  warn: (message: string, context?: string, data?: any) => logger.warn(message, context, data),
  error: (message: string, context?: string, error?: Error | any, data?: any) => 
    logger.error(message, context, error, data),
  apiCall: (method: string, url: string, status?: number, data?: any) => 
    logger.apiCall(method, url, status, data),
  database: (operation: string, table: string, error?: Error, data?: any) => 
    logger.database(operation, table, error, data),
  auth: (event: string, userId?: string, error?: Error) => 
    logger.auth(event, userId, error),
};
