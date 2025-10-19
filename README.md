# create-mococa-app

A template generator for creating Mococa-style monorepo projects with Nullstack, Biome, and Tailwind CSS.

## Usage

### With npx (npm)

```bash
npx create-mococa-app
```

### With bunx (Bun)

```bash
bunx create-mococa-app
```

### With npm

```bash
npm create mococa-app
```

### Usage

```bash
npx create-mococa-app [directory] [flags]
```

**Arguments:**
- `[directory]` - Optional. Target directory for the project (e.g., `.`, `./my-app`, `my-app`)

**Flags:**
- `--name <project-name>` - Project name (skips prompt for non-interactive use)
- `--domain <domain>` - Domain name (skips prompt for non-interactive use)
- `--skip` - Skip all optional features (creates minimal project)
- `--api` - Include Elysia API server (Bun-based)
- `--cognito` - Include AWS Cognito authentication (requires `--api`)
- `--lambda` - Include AWS Lambda + API Gateway infrastructure
- `--dynamo` - Include DynamoDB infrastructure
- `--s3` - Include S3 storage bucket infrastructure
- `--environments` - Configure multiple environments (prompts for environment names)

### Examples

```bash
# Interactive prompts (default)
npx create-mococa-app

# Create in current directory
npx create-mococa-app . --skip

# Create in specific directory
npx create-mococa-app my-app --api --cognito

# Minimal project (no optional features)
npx create-mococa-app --skip

# Non-interactive mode (useful for CI/CD)
npx create-mococa-app my-app --name my-app --domain my-app.com --skip

# With Elysia API server
npx create-mococa-app --api

# With Elysia API + Cognito authentication
npx create-mococa-app --api --cognito

# With Lambda support
npx create-mococa-app --lambda

# With DynamoDB support
npx create-mococa-app --dynamo

# With S3 storage support
npx create-mococa-app --s3

# With custom environments (prompts for input)
npx create-mococa-app --environments

# Combine multiple flags
npx create-mococa-app my-project --api --cognito --lambda --dynamo --s3 --environments
```

**Note:** Without `--environments`, only a `production` environment is created by default.

## Features

- ✨ Bun workspaces monorepo structure
- 🎯 Nullstack framework for full-stack development
- 🎨 Tailwind CSS for styling
- 🔧 Biome for fast formatting and linting
- 📦 Shared UI components package
- 🚀 Pre-configured build scripts
- 📝 TypeScript configuration
- 🔐 Optional Elysia API server with OAuth + Cognito support
- ☁️ Optional AWS infrastructure (Lambda, DynamoDB, S3, Cognito)
- 🏗️ Pulumi IaC with component-based architecture

## What's Included

```
your-app/
├── apps/
│   ├── landing-page/          # Nullstack app with Tailwind CSS
│   │   ├── src/
│   │   │   ├── Application.jsx
│   │   │   └── Home.jsx
│   │   ├── client.js
│   │   ├── server.js
│   │   ├── webpack.config.js
│   │   ├── tailwind.config.js
│   │   └── package.json
│   └── api/                   # Elysia API server (with --api)
│       ├── src/
│       │   ├── handlers/      # Route handlers (public, private, admin)
│       │   ├── services/      # Business logic & integrations
│       │   └── main.ts
│       └── package.json
├── packages/
│   ├── ui/                    # Shared UI components
│   │   ├── src/
│   │   └── package.json
│   ├── constants/             # Project constants & environment config
│   │   ├── src/index.ts
│   │   └── package.json
│   └── lambdas/               # Lambda functions (with --lambda)
│       ├── src/
│       ├── build.js
│       └── package.json
├── infrastructure/            # Pulumi IaC
│   ├── src/
│   │   ├── components/        # High-level infrastructure components
│   │   │   └── backend.ts     # Backend component (Cognito, DynamoDB, S3, API Gateway)
│   │   ├── resources/         # Individual AWS resources
│   │   │   ├── certificate.ts
│   │   │   ├── cognito.ts     # (with --cognito)
│   │   │   ├── dns.ts
│   │   │   ├── dynamo.ts      # (with --dynamo)
│   │   │   ├── s3-storage.ts  # (with --s3)
│   │   │   ├── s3-website.ts
│   │   │   ├── apigateway.ts  # (with --lambda)
│   │   │   └── lambdas/       # (with --lambda)
│   │   └── index.ts
│   ├── Pulumi.yaml
│   └── package.json
├── biome.json                 # Biome configuration
├── package.json               # Root package with workspaces
└── README.md
```

## After Creation

1. Navigate to your project:
   ```bash
   cd your-app
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the development server:
   ```bash
   bun start
   ```

4. Open http://localhost:3000 in your browser

### If you included Elysia API (`--api`)

Your project includes:
- `apps/api/` - Elysia API server with TypeScript
- Route handlers organized by access level (public, private, admin)
- OAuth support (Google, GitHub) via bun-mococa
- Session management with in-memory storage
- CORS configured for your domains via constants
- Optional Cognito integration (with `--cognito`)

Start the API server:
```bash
cd apps/api
bun run dev
```

### If you included Cognito (`--cognito`)

Your project includes:
- Cognito User Pool with email/password authentication
- Custom attributes: `full_name`, `phone`, `profile_picture`, `provider`
- Email verification required
- Password policy enforced
- Cognito endpoints in Elysia API:
  - `POST /auth/login` - Login with email/password
  - `POST /auth/register` - Register new user
  - `POST /auth/confirm-email` - Confirm email with code
  - `POST /auth/resend-confirmation-code` - Resend verification
  - `POST /auth/forgot-password` - Initiate password reset
  - `POST /auth/reset-password` - Complete password reset

**Note:** Without `--cognito`, these endpoints are removed from the API.

### If you included Lambda (`--lambda`)

Your project includes:
- `packages/lambdas/` - Lambda functions with example GET/POST handlers
- API Gateway infrastructure with Lambda integrations
- Example endpoints at `/example` (GET and POST)

To use DynamoDB with your Lambdas, pass the `dynamodb` prop to `ApiLambdas` in `infrastructure/src/resources/lambdas/index.ts` and update your Lambda functions to interact with the table.

### If you included DynamoDB (`--dynamo`)

Your project includes:
- DynamoDB table resource in `infrastructure/src/resources/dynamo.ts`
- Table configured with `pk` and `sk` keys (single-table design)
- TTL enabled on `timetolive` attribute
- Deletion protection for production environment

The DynamoDB resource is created but not automatically connected to Lambdas. To use it:
1. Pass `dynamodb` to your Lambda resources
2. Add DynamoDB permissions to your Lambda IAM role
3. Pass the table name as an environment variable to your Lambda functions

### If you included S3 Storage (`--s3`)

Your project includes:
- S3 storage bucket resource in `infrastructure/src/resources/s3-storage.ts`
- Bucket naming via constants: `{projectName}-storage-{environment}`
- Versioning enabled for all environments
- Private bucket with blocked public access
- CORS configuration for web uploads

The bucket name is managed in `packages/constants/src/index.ts` via `S3_STORAGE_BUCKETS`.

## Infrastructure Architecture

### Backend Component

All AWS backend resources are organized in a single `BackendComponent` (`infrastructure/src/components/backend.ts`):

```typescript
backend.cognito      // CognitoResource (with --cognito)
backend.dynamo       // DynamoResource (with --dynamo)
backend.storage      // S3StorageResource (with --s3)
backend.apigateway   // ApigatewayResource + Lambdas (with --lambda)
```

This component-based approach:
- Groups related resources together
- Simplifies dependency management
- Makes infrastructure more maintainable
- Enables conditional resource creation via CLI flags

### Constants Package

All projects include a `packages/constants/` package with:
- Project name and base domain
- Environment configuration (customizable with `--environments`)
- Domain names per app per environment
  - `landing-page`: `{env}.{domain}` (production uses root domain)
  - `api`: `api-{env}.{domain}` (production uses `api.{domain}`)
  - `apigw`: `apigw-{env}.{domain}` (production uses `apigw.{domain}`)
- DynamoDB table names per environment
- S3 bucket names per environment
- Cognito User Pool names per environment

Use it across your infrastructure and application code for consistent naming.

### Default Environments

- **Without `--environments`**: Only `production` environment
- **With `--environments`**: You'll be prompted to enter comma-separated environment names (e.g., `development,staging,production`)

## Available Scripts

- `bun start` - Start the development server
- `bun run build` - Build for production
- `bun run fmt` - Format code with Biome

## Development & Testing

To test this generator locally before publishing to npm:

```bash
# From any directory, run the local generator
bunx /path/to/create-mococa-app

# Or navigate to a test directory and run
cd /tmp/test-project
bunx ../create-mococa-app . --api --cognito

# Using relative paths
mkdir test-app
bunx ../create-mococa-app test-app --lambda --dynamo
```

## License

MIT
