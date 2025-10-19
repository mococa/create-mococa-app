# Constants

Shared constants for the {{PROJECT_NAME}} project.

## Usage

Import constants in any package:

```typescript
import { PROJECT_NAME, DOMAINS, DYNAMODB_TABLES, S3_STORAGE_BUCKETS } from '@{{PROJECT_NAME}}/constants';

// Get domain for current environment
const domain = DOMAINS[environment];

// Get DynamoDB table name
const tableName = DYNAMODB_TABLES[environment];

// Get S3 storage bucket name
const bucketName = S3_STORAGE_BUCKETS[environment];
```

## Available Constants

- `PROJECT_NAME` - Project name
- `ENVIRONMENTS` - Available environments (development, staging, production)
- `DOMAINS` - Domain configuration per environment (website and API domains)
- `DYNAMODB_TABLES` - DynamoDB table names per environment
- `S3_STORAGE_BUCKETS` - S3 storage bucket names per environment
