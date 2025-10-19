// Project name
export const PROJECT_NAME = '{{PROJECT_NAME}}';

// Base domain (configure this for your project)
export const DOMAIN_BASE = '{{PROJECT_NAME}}.com';

// Environment-specific configuration
export const ENVIRONMENTS = {
  development: 'development',
  staging: 'staging',
  production: 'production',
} as const;

export type Environment = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];

// Domain configuration by app and environment
export const DOMAINS: Record<string, Record<Environment, string>> = {
  'landing-page': {
    development: `dev.${DOMAIN_BASE}`,
    staging: `staging.${DOMAIN_BASE}`,
    production: DOMAIN_BASE,
  },
  api: {
    development: `api-dev.${DOMAIN_BASE}`,
    staging: `api-staging.${DOMAIN_BASE}`,
    production: `api.${DOMAIN_BASE}`,
  },
  apigw: {
    development: `apigw-dev.${DOMAIN_BASE}`,
    staging: `apigw-staging.${DOMAIN_BASE}`,
    production: `apigw.${DOMAIN_BASE}`,
  },
};

// DynamoDB table names per environment
export const DYNAMODB_TABLES: Record<Environment, string> = {
  development: `${PROJECT_NAME}-Table-development`,
  staging: `${PROJECT_NAME}-Table-staging`,
  production: `${PROJECT_NAME}-Table-production`,
};

// S3 bucket names per environment
export const S3_STORAGE_BUCKETS: Record<Environment, string> = {
  development: `${PROJECT_NAME}-storage-development`,
  staging: `${PROJECT_NAME}-storage-staging`,
  production: `${PROJECT_NAME}-storage-production`,
};
