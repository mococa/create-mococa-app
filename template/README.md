# {{PROJECT_NAME}}

A monorepo project built with Nullstack, featuring Biome for linting and formatting.

## Getting Started

### Install dependencies

```bash
bun install
```

### Development

Start the development server:

```bash
bun start
```

The landing page will be available at http://localhost:3000

### Build

Build the project:

```bash
bun run build
```

### Format Code

Format code with Biome:

```bash
bun run fmt
```

## Project Structure

- `apps/landing-page` - Nullstack landing page with Tailwind CSS
- `apps/api` - Elysia API server (if included)
- `packages/ui` - Shared UI components library
- `packages/constants` - Project constants and environment configuration
- `packages/lambdas` - Lambda functions (if included)
- `infrastructure` - Pulumi infrastructure as code

## Tech Stack

- [Nullstack](https://nullstack.app/) - Full-stack JavaScript framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Biome](https://biomejs.dev/) - Fast formatter and linter
- [Bun](https://bun.sh/) - Fast JavaScript runtime and package manager with workspaces
- [Elysia](https://elysiajs.com/) - Fast Bun web framework (if API included)
- [Pulumi](https://www.pulumi.com/) - Infrastructure as Code

## Infrastructure

This project uses Pulumi for infrastructure management with a component-based architecture:

### Backend Component

All AWS backend resources are organized in `infrastructure/src/components/backend.ts`:

- **Cognito** - User authentication with email/password + OAuth
- **DynamoDB** - NoSQL database with single-table design
- **S3 Storage** - Private bucket for file uploads
- **API Gateway + Lambdas** - Serverless API endpoints

Deploy infrastructure:
```bash
cd infrastructure
bun run deploy
```

Preview changes:
```bash
cd infrastructure
bun run preview
```

Tear down resources:
```bash
cd infrastructure
bun run destroy
```
