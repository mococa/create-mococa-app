# Lambda Functions

AWS Lambda functions for {{PROJECT_NAME}}.

## Development

Lambda functions are organized by domain in the `src/` directory. Each Lambda handler is a separate TypeScript file that gets bundled independently.

## Building

Build all Lambda functions:

```bash
bun run build
```

This uses esbuild to bundle each Lambda function (excluding `src/common/**`) into the `dist/` directory.

## Structure

- `src/common/` - Shared utilities and helpers (not bundled as Lambdas)
  - `index.ts` - safewrapper for error handling
  - `constants.ts` - Shared constants
- `src/example/` - Example Lambda functions
  - `get.ts` - GET endpoint example
  - `post.ts` - POST endpoint example

## Adding New Lambdas

1. Create a new directory under `src/` (e.g., `src/users/`)
2. Add your Lambda handlers (e.g., `create.ts`, `list.ts`, `delete.ts`)
3. Use the `safewrapper` for consistent error handling:

```typescript
import { safewrapper } from '../common';

export const handler = safewrapper(async (event) => {
  // Your Lambda logic here
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Success' }),
  };
});
```

4. Run `bun run build` to bundle your Lambdas
5. Reference them in the infrastructure (see `infrastructure/src/resources/lambdas/`)
