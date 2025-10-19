# Infrastructure

Pulumi infrastructure as code for {{PROJECT_NAME}}.

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- AWS CLI configured with credentials
- Cloudflare account and API token

## Configuration

Pulumi configuration is managed through environment-specific YAML files (`Pulumi.{environment}.yaml`). These files are automatically generated during project creation.

To switch between environments:

```bash
pulumi stack select production
pulumi stack select staging
pulumi stack select development
```

Configuration values are read from `@{{PROJECT_NAME}}/constants` package, including:
- Domain names per environment
- Resource naming conventions
- DynamoDB table names
- S3 bucket names
- Cognito pool names

## Scripts

```bash
bun run preview  # Preview infrastructure changes
bun run deploy   # Deploy infrastructure
bun run destroy  # Destroy infrastructure
```

## Resources

This infrastructure deploys:

- **Certificate**: ACM certificate for custom domains
- **S3 Website**: Static website hosting for the landing page
- **DNS**: Cloudflare DNS records
- **Backend Component** (optional, based on flags):
  - **DynamoDB**: Single-table design with TTL support
  - **S3 Storage**: Private bucket with CORS configuration
  - **Cognito**: User authentication pools
  - **API Gateway + Lambdas**: Serverless API endpoints

## Structure

- `src/index.ts` - Main infrastructure orchestration
- `src/components/` - Reusable infrastructure components
  - `backend.ts` - Backend resources component (DynamoDB, S3, Cognito, API Gateway)
- `src/resources/` - Individual resource definitions
  - `certificate/` - TLS certificate management
  - `s3-website/` - Static website hosting
  - `dns/` - DNS record management
  - `dynamo/` - DynamoDB table configuration
  - `s3-storage/` - S3 storage bucket
  - `cognito/` - Cognito user pools
  - `apigateway/` - API Gateway setup
  - `lambdas/` - Lambda function definitions
