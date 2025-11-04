# @{{PROJECT_NAME}}/sdk

Type-safe SDK for the {{PROJECT_NAME}} API built with Elysia's Treaty client.

## Features

- 🔒 **Full Type Safety**: Complete TypeScript type inference for all API endpoints
- 🌍 **Environment Switching**: Easy switching between local, production, and other environments
- 🚀 **Zero Configuration**: Works out of the box with sensible defaults
- 📦 **Lightweight**: Built on top of [@elysiajs/eden](https://elysiajs.com/eden/overview.html)

## Installation

```bash
bun add @{{PROJECT_NAME}}/sdk
```

## Quick Start

### Using the Default Instance

The simplest way to use the SDK is with the default exported instance:

```typescript
import { sdk } from '@{{PROJECT_NAME}}/sdk';

// Make API calls with full type safety
const { data, error } = await sdk.api.profile.patch({
  age: 21,
  name: 'John Doe'
});

if (error) {
  console.error('Failed to update profile:', error);
} else {
  console.log('Profile updated:', data);
}
```

### Creating Custom Instances

For more control, create your own SDK instances:

```typescript
import { SDK } from '@{{PROJECT_NAME}}/sdk';

// Create a production client
const prodClient = new SDK('production');
await prodClient.api.companies.index.get();

// Create a local development client
const devClient = new SDK('local');
await devClient.api.users.index.get();
```

## Environment Management

### Available Environments

- **`local`**: Local development server (`http://localhost:3333`)
- **`production`**: Production environment (configured via `@{{PROJECT_NAME}}/constants`)

### Switching Environments

```typescript
import { sdk } from '@{{PROJECT_NAME}}/sdk';

// Start with local
console.log(sdk.baseUrl); // http://localhost:3333

// Switch to production
sdk.setEnvironment('production');
console.log(sdk.baseUrl); // https://api.{{PROJECT_NAME}}.com

// Get current environment
console.log(sdk.environment); // 'production'
```

## Usage Examples

### Authentication

```typescript
import { sdk } from '@{{PROJECT_NAME}}/sdk';

// OAuth callback handling
window.addEventListener('message', (event) => {
  if (event.data.type === 'oauth-callback') {
    const { sessionId, user } = event.data.data;
    sdk.setSession(sessionId);
    // Redirect to dashboard
  }
});
```

### CRUD Operations

```typescript
import { sdk } from '@{{PROJECT_NAME}}/sdk';

// GET request
const { data: items } = await sdk.api.items.index.get();

// POST request
const { data: newItem } = await sdk.api.items.post({
  name: 'New Item',
  description: 'Item description'
});

// PATCH request
const { data: updated } = await sdk.api.items({ id: '123' }).patch({
  name: 'Updated Item'
});

// DELETE request
const { data: deleted } = await sdk.api.items({ id: '123' }).delete();
```

### File Uploads

```typescript
import { sdk } from '@{{PROJECT_NAME}}/sdk';

const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });

const { data, error } = await sdk.api.uploads.post({
  file,
  metadata: { type: 'document' }
});
```

### Error Handling

```typescript
import { sdk } from '@{{PROJECT_NAME}}/sdk';

const { data, error } = await sdk.api.items.post({
  name: 'Test Item',
  invalid: 'field'
});

if (error) {
  switch (error.status) {
    case 400:
      console.error('Validation error:', error.value);
      break;
    case 401:
      console.error('Unauthorized');
      break;
    case 500:
      console.error('Server error');
      break;
    default:
      console.error('Unknown error:', error);
  }
} else {
  console.log('Success:', data);
}
```

## API Structure

The SDK automatically mirrors your API's structure. Access endpoints using dot notation:

```typescript
sdk.api.auth.login.post()          // POST /auth/login
sdk.api.profile.get()              // GET /profile
sdk.api.items.index.get()          // GET /items
sdk.api.items.post()               // POST /items
sdk.api.items({ id: '1' }).get()   // GET /items/:id
```

## Type Safety

All API calls are fully typed based on your Elysia app definition:

```typescript
// TypeScript knows the exact shape of request and response
const { data } = await sdk.api.items.post({
  name: string,    // ✅ Required
  description: string,    // ✅ Required
  invalid: 123     // ❌ TypeScript error: property doesn't exist
});

// Response is also typed
console.log(data.id);         // ✅ TypeScript knows this exists
console.log(data.invalidProp); // ❌ TypeScript error
```

## Configuration

The SDK uses the `@{{PROJECT_NAME}}/constants` package for environment configuration:

```typescript
// packages/constants/src/index.ts
export const DOMAINS: Record<string, Record<Environment, string>> = {
  api: {
    production: 'api.{{PROJECT_NAME}}.com'
  }
};
```

To add new environments:

1. Update `Environment` type in `@{{PROJECT_NAME}}/constants`
2. Add domain configuration to `DOMAINS`
3. Use the new environment: `sdk.setEnvironment('staging')`

## Session Management

### Restore Session on App Load

```typescript
async hydrate() {
  sdk.restoreSession();
  await this.checkAuth();
}
```

### Handle Session Expiration

```typescript
sdk.setOnSessionExpired((message) => {
  // Show notification
  alert(message || 'Session expired');
  // Redirect to login
  window.location.href = '/login';
});
```

### Check for Session Errors

```typescript
const { data, error } = await sdk.api.profile.get();
if (sdk.checkSessionError(error)) {
  return; // User will be logged out automatically
}
```

## Development

```bash
# Install dependencies
bun install

# Run type checking
bun tsc --noEmit

# Format code
bun run fmt
```

## License

ISC
