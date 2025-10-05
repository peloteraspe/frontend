# Logging System

This project uses a centralized logging system that replaces all `console.log` and `console.error` statements with structured, configurable logging.

## Features

- **Structured Logging**: All logs include timestamp, level, context, and data
- **Environment-based Configuration**: Different log levels for development/production
- **Contextual Logging**: Specialized methods for API calls, database operations, and auth events
- **Production Ready**: Structured JSON output for log aggregation services

## Usage

### Basic Logging

```typescript
import { log } from '@/lib/logger';

// Debug information (development only)
log.debug('Processing user data', 'USER_SERVICE', { userId: 123 });

// General information
log.info('User successfully logged in', 'AUTH', { userId: 123 });

// Warnings
log.warn('API rate limit approaching', 'API_CLIENT', { remaining: 5 });

// Errors
log.error('Failed to save user', 'USER_SERVICE', error, { userId: 123 });
```

### Specialized Logging

```typescript
// API calls
log.apiCall('GET', '/users/123', 200, { userId: 123 });
log.apiCall('POST', '/users', 400, { error: 'Validation failed' });

// Database operations
log.database('SELECT', 'users', null, { query: 'SELECT * FROM users' });
log.database('INSERT', 'users', error, { userId: 123 });

// Authentication events
log.auth('login_success', '123');
log.auth('login_failed', null, error);
```

## Configuration

### Environment Variables

Create a `.env.local` file with:

```bash
# Log level (DEBUG=0, INFO=1, WARN=2, ERROR=3)
LOG_LEVEL=DEBUG  # Development
LOG_LEVEL=INFO   # Production

# Feature flags
LOG_API_CALLS=true
LOG_DATABASE_OPS=true
LOG_AUTH_EVENTS=true
```

### Log Levels

- **DEBUG (0)**: Detailed information for development debugging
- **INFO (1)**: General information about application flow
- **WARN (2)**: Potentially harmful situations
- **ERROR (3)**: Error events that should be investigated

## Development vs Production

### Development Mode
- Uses `console.*` methods for immediate feedback
- Shows all log levels (DEBUG and above)
- Includes stack traces for errors
- Human-readable format

### Production Mode
- Outputs structured JSON for log aggregation
- Shows INFO level and above (hides DEBUG)
- Ready for integration with services like:
  - Sentry
  - DataDog
  - LogRocket
  - CloudWatch

## Migration from Console Statements

All previous `console.log` and `console.error` statements have been replaced:

### Before
```typescript
console.log('User data:', userData);
console.error('API Error:', error);
```

### After
```typescript
import { log } from '@/lib/logger';

log.debug('User data retrieved', 'USER_SERVICE', userData);
log.error('API request failed', 'API_CLIENT', error);
```

## Integration with External Services

To integrate with external logging services, modify the `sendToLoggingService` method in `/lib/logger.ts`:

```typescript
private sendToLoggingService(entry: LogEntry): void {
  // Example: Sentry integration
  if (entry.level === LogLevel.ERROR && entry.error) {
    Sentry.captureException(entry.error, {
      tags: { context: entry.context },
      extra: entry.data
    });
  }
  
  // Example: Custom analytics
  if (entry.context === 'AUTH') {
    analytics.track('auth_event', entry.data);
  }
}
```

## Benefits

1. **Consistency**: Uniform logging format across the application
2. **Performance**: Conditional logging based on environment
3. **Debugging**: Rich context and structured data
4. **Monitoring**: Production-ready for log aggregation
5. **Security**: No sensitive data leakage in production logs
6. **Maintainability**: Centralized configuration and easy updates

## Best Practices

1. **Use appropriate log levels**: DEBUG for development details, INFO for business logic, ERROR for actual problems
2. **Include context**: Always provide a descriptive context string
3. **Add relevant data**: Include IDs, states, and other helpful debugging information
4. **Don't log sensitive data**: Avoid passwords, tokens, or personal information
5. **Be descriptive**: Write clear, searchable log messages

## Troubleshooting

### No logs appearing
- Check `LOG_LEVEL` environment variable
- Verify import: `import { log } from '@/lib/logger'`
- Ensure you're using the right log level for your environment

### Too many logs in production
- Set `LOG_LEVEL=INFO` or higher in production
- Use feature flags to disable specific log types

### Missing context in logs
- Always include a context parameter: `log.info('message', 'CONTEXT')`
- Use consistent context naming (UPPERCASE with underscores)
