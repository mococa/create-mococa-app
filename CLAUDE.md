# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`create-mococa-app` is a CLI template generator that scaffolds Bun monorepo projects with Nullstack (full-stack JavaScript framework), Biome (linting/formatting), and Tailwind CSS. The generator creates projects with optional AWS infrastructure (Lambda, DynamoDB, S3) managed via Pulumi.

## Core Architecture

### Template Generation System

The generator (`bin/cli.js`) copies and transforms the `template/` directory:
- Replaces `{{PROJECT_NAME}}` placeholders throughout files
- Conditionally includes/excludes files based on CLI flags (`--lambda`, `--dynamo`, `--s3`, `--environments`)
- Dynamically generates `packages/constants/src/index.ts` with environment configuration
- Creates Pulumi environment config files (`Pulumi.{environment}.yaml`)

### Monorepo Structure

Generated projects use Bun workspaces with this structure:
- `apps/landing-page/` - Nullstack SSG application with Tailwind CSS
- `packages/ui/` - Shared UI components (always included)
- `packages/constants/` - Environment and naming constants (always included)
- `packages/lambdas/` - Lambda functions (optional, with `--lambda`)
- `infrastructure/` - Pulumi IaC for AWS + Cloudflare (always included)

### Constants Package Pattern

`packages/constants/src/index.ts` is the single source of truth for:
- Project name and domain configuration
- Environment definitions (customizable via `--environments`)
- Domain naming per app per environment:
  - `landing-page`: production uses root domain, other envs use `{env}.{domain}`
  - `apigw`: production uses `apigw.{domain}`, other envs use `apigw-{env}.{domain}`
- DynamoDB table names: `{PROJECT_NAME}-Table-{environment}`
- S3 bucket names: `{PROJECT_NAME}-storage-{environment}`

This package is imported by both infrastructure code and application code.

### Infrastructure Architecture (Pulumi + TypeScript)

`infrastructure/src/index.ts` orchestrates:
1. **Certificate** (Cloudflare + ACM) - SSL certificates for the base domain
2. **S3 Website** - Hosts the Nullstack SSG output from `apps/landing-page/ssg`
3. **DNS Records** (Cloudflare) - CNAME records pointing to S3 and API Gateway
4. **DynamoDB** (optional) - Single-table design with `pk`/`sk` keys, TTL enabled
5. **S3 Storage** (optional) - Private bucket with CORS for uploads
6. **API Gateway** (optional) - HTTP API with Lambda integrations

Resources are environment-aware via Pulumi config (`config.get('environment')`).

### Lambda Build System

When `--lambda` is included, `packages/lambdas/build.js`:
- Uses esbuild to bundle all `src/**/*.ts` files (excluding `src/common/**`)
- Targets Node.js 20, CommonJS format
- Externalizes AWS SDK modules
- Outputs to `dist/` maintaining source structure

Lambda resource definitions in `infrastructure/src/resources/lambdas/` reference these built artifacts.

### Conditional Resource Inclusion

`bin/cli.js` removes unused infrastructure code when copying:
- Without `--lambda`: Removes Lambda/API Gateway imports and resource blocks from `infrastructure/src/index.ts`
- Without `--dynamo`: Removes DynamoDB imports and resource blocks
- Without `--s3`: Removes S3 Storage imports and resource blocks
- Script cleanup in root `package.json` (removes `build:lambdas` if no Lambda)

## Development Commands

**Generator development** (this repo):
```bash
# Test the generator locally
npx . --lambda --dynamo --s3 --environments

# Or with Bun
bunx .
```

**Generated project commands** (in created projects):
```bash
# Install dependencies
bun install

# Start Nullstack dev server (landing-page)
bun start

# Build for production
bun run build                # Builds lambdas + website
bun run build:lambdas        # Build Lambda functions only (if --lambda)
bun run build:website        # Build Nullstack SSG only

# Format code with Biome
bun run fmt

# Infrastructure deployment (from infrastructure/)
cd infrastructure
bun run deploy               # Deploy to Pulumi stack
bun run preview              # Preview changes
bun run destroy              # Tear down resources
```

## Key Files & Patterns

### Template Placeholders
- `{{PROJECT_NAME}}` - Replaced with kebab-cased project name throughout all files

### Biome Configuration
- Located at `template/biome.json`
- Enforces consistent formatting: 2-space indent, 100 char line width, single quotes, semicolons
- Linting rules with some relaxed settings (`noExplicitAny: off`, `useJsxKeyInIterable: off`)

### Nullstack Applications
- Entry points: `client.js` (browser) and `server.js` (Node.js)
- Main component: `src/Application.jsx`
- Build mode: SSG (Static Site Generation) via `nullstack build --mode=ssg`
- Output directory: `ssg/` (referenced by Pulumi for S3 deployment)

### GitHub Actions
- Template includes `.github/workflows/deploy.yml` for production deployments
- Triggered on pushes to `main` or manual workflow dispatch
- Requires secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `PULUMI_ACCESS_TOKEN`
- Runs: `bun install` → `bun run deploy` with Pulumi CLI

## Important Considerations

- All generated projects default to `production` environment unless `--environments` is used
- Infrastructure expects Cloudflare DNS management for domain setup
- Lambda functions must be built before infrastructure deployment
- The constants package must be updated if you add new apps or change naming conventions
- Pulumi stack names should match environment names for proper configuration loading
