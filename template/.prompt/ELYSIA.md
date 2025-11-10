# Elysia API Conventions

**Elysia** is a fast, type-safe web framework for Bun. This document outlines the patterns and conventions used in this project's API architecture.

**Documentation**: https://elysiajs.com

> **Note**: This guide uses example services (storage, notifications, payment providers) to demonstrate patterns. Replace these with your own service implementations based on your application's needs.

## Bootstrapping (Optional)

This architecture pattern can be scaffolded using:
```bash
bunx create-mococa-app [name]
```

This is optional - you can also manually create the structure described below. The scaffolding tool sets up the foundational architecture including the layered structure, dependency injection, and all the patterns described below.

## Project Structure

The API follows a layered architecture with clear separation of concerns:

```
apps/api/src/
├── main.ts                 # Application entry point
├── config.ts              # Environment validation
├── types/                 # TypeScript type definitions
│   └── types.ts          # AppContext, Services, Database types
├── handlers/             # Route handlers by access level
│   ├── public/          # Unauthenticated endpoints
│   ├── private/         # Authenticated user endpoints
│   └── admin/          # Admin-only endpoints
├── middlewares/         # Request middleware
│   ├── auth.ts         # Authentication middleware
│   ├── admin.ts        # Admin authorization middleware
│   └── *.ts            # Other middleware
├── services/           # Business logic and external integrations
│   ├── services.ts    # Dependency injection container
│   ├── auth/         # Authentication & sessions
│   ├── aws/          # AWS services (S3, etc.)
│   ├── payments/     # Payment providers
│   └── notifier/     # Notifications
├── db/               # Database layer
│   ├── db.ts        # Database factory & migrations runner
│   ├── schema.ts    # Drizzle schema definitions
│   └── migrations/  # SQL migration files (*.up.sql)
└── crons/           # Scheduled background jobs
```

## Core Concepts

### 1. Application Entry Point (`main.ts`)

The entry point creates the Elysia app, applies global middleware, decorates the context, and mounts handler groups:

```typescript
const app = new Elysia({ serve: { idleTimeout: 10 } })
  .use(openapi())
  .use(cors({ origin: allowedOrigins, credentials: false }))
  .use(cookie())
  .decorate('db', db)                    // Inject database
  .decorate('services', services)        // Inject services
  .get('/', () => 'API v1.0.0')
  .get('/health', () => 'OK')
  .use(crons({ services, db }))          // Mount cron jobs
  .use(Public.handlers)                  // Public routes
  .use(Private.handlers)                 // Authenticated routes
  .use(Admin.handlers);                  // Admin routes
```

**Key patterns:**
- Use `.decorate()` to inject dependencies into context (makes them available in all handlers)
- Mount handler groups with `.use()` for modular route organization
- Configure CORS with explicit allowed origins
- Set idle timeout for long-running connections

### 2. AppContext Pattern

The `AppContext` type defines what's available in all handlers:

```typescript
// types/types.ts
export interface AppContext extends SingletonBase {
  decorator: {
    db: Database;            // Or DB, ApiDatabase, etc. - name as you prefer
    services: Services;
    userId: string;          // Added by authMiddleware
    role: UserRole;          // Added by authMiddleware
    sessionId: string;       // Added by authMiddleware
  };
  store: Record<string, unknown>;
}

// Define your database type (name it as you prefer)
export type Database = Awaited<ReturnType<typeof createDatabase>>;
export type Services = typeof services;
```

**This is the backbone of type safety** - it tells TypeScript what properties are available on the context object in all handlers.

### 3. Handler Function Pattern

**This is the core pattern for creating routes.** Every resource handler follows this pattern:

```typescript
// handlers/private/posts.ts
import { Elysia, t } from 'elysia';
import type { AppContext } from '../../types/types';

/**
 * Post management routes for authenticated users.
 */
export function handlers() {
  return new Elysia<'/posts', AppContext>({ prefix: '/posts' })
    .post('/', async (ctx) => {
      const { db, services, userId, body } = ctx;

      const [post] = await db
        .insert(schema.posts)
        .values({
          userId,
          title: body.title,
          content: body.content,
        })
        .returning();

      return { post };
    }, {
      body: t.Object({
        title: t.String({ minLength: 1 }),
        content: t.String(),
      }),
      detail: {
        summary: 'Create post',
        description: 'Creates a new post',
        tags: ['Posts'],
      },
    })
    .get('/', async ({ db, userId }) => {
      const posts = await db.query.posts.findMany({
        where: eq(schema.posts.userId, userId),
      });

      return { posts };
    });
}
```

**Key patterns:**
- **Export a function named `handlers()`** that returns a new Elysia instance
- **Use the type `Elysia<'/prefix', AppContext>`** for full type safety
- **Specify a `prefix`** option to namespace all routes (e.g., `/posts`)
- **Destructure context** to access `db`, `services`, `userId`, `body`, `params`, `query`, `set`, etc.
- **Return plain objects** - Elysia automatically serializes to JSON
- **Define schemas** for body, params, query validation
- **Add `detail`** for OpenAPI documentation

### 4. Handler Organization by Access Level

Handlers are organized into **three groups** based on authentication requirements:

#### Public Handlers (`handlers/public/`)
Unauthenticated endpoints:

```typescript
// handlers/public/index.ts
import Elysia from 'elysia';
import * as auth from './auth';
import * as webhooks from './webhooks';

export const handlers = new Elysia()
  .use(auth.handlers())
  .use(webhooks.handlers());
```

#### Private Handlers (`handlers/private/`)
Authenticated user endpoints with `.derive(authMiddleware)`:

```typescript
// handlers/private/index.ts
import Elysia from 'elysia';
import { authMiddleware } from '../../middlewares';
import * as posts from './posts';
import * as comments from './comments';

export const handlers = new Elysia()
  .derive(authMiddleware)          // Apply auth to ALL routes
  .use(posts.handlers())
  .use(comments.handlers());
```

**Important:** `.derive(authMiddleware)` applies authentication to **all routes** mounted after it.

#### Admin Handlers (`handlers/admin/`)
Admin-only endpoints with both auth and admin middleware:

```typescript
// handlers/admin/index.ts
import Elysia from 'elysia';
import { authMiddleware, adminMiddleware } from '../../middlewares';
import * as users from './users';
import * as moderation from './moderation';

export const handlers = new Elysia({ prefix: '/admin' })
  .derive(authMiddleware)          // First check authentication
  .derive(adminMiddleware)         // Then check admin role
  .use(users.handlers())
  .use(moderation.handlers());
```

### 5. Context Access Pattern

Access context properties by **destructuring**:

```typescript
// Preferred: Destructure what you need
async (ctx) => {
  const { db, services, userId, body, params, query, set } = ctx;
  // Use destructured properties
}

// Alternative: Type cast for complex scenarios
async (ctx) => {
  const { db } = ctx as typeof ctx & AppContext['decorator'];
}
```

**Available context properties:**
- `db` - Database instance (Drizzle ORM)
- `services` - Services container (added via `.decorate()`)
- `userId` - Current user ID (added by authMiddleware)
- `role` - User role (added by authMiddleware)
- `sessionId` - Session ID (added by authMiddleware)
- `body` - Request body (typed from schema)
- `params` - Route parameters (typed from schema)
- `query` - Query parameters (typed from schema)
- `set` - Response configuration (status, headers)
- `request` - Raw Request object

**Setting response status:**
```typescript
async ({ set, db }) => {
  const item = await db.query.items.findFirst(/* ... */);

  if (!item) {
    set.status = 404;
    return { error: 'Not found' };
  }

  return { item };
}
```

### 6. Type-Safe Request Validation

Use Elysia's `t` schema for runtime validation with automatic TypeScript inference:

```typescript
import { t } from 'elysia';

.post('/items', async ({ body }) => {
  // body is automatically typed from schema
  const { name, price, tags } = body;
}, {
  body: t.Object({
    name: t.String({ minLength: 1, maxLength: 100 }),
    price: t.Integer({ minimum: 0 }),
    tags: t.Array(t.String()),
  }),
  params: t.Object({
    id: t.String(),
  }),
  query: t.Object({
    page: t.Optional(t.Integer({ minimum: 1 })),
    limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  }),
})
```

**Available schema types:**
- `t.String()` - String with optional constraints (minLength, maxLength, format, pattern)
- `t.Number()` / `t.Integer()` - Numbers with constraints (minimum, maximum)
- `t.Boolean()` - Boolean
- `t.Object()` - Object with typed properties
- `t.Array()` - Array of items
- `t.Optional()` - Optional property
- `t.Union()` - Union of types
- `t.Literal()` - Exact literal value

**Schema options:**
```typescript
t.String({
  description: 'User display name',  // For OpenAPI docs
  error: 'Invalid name provided',    // Custom error message
  minLength: 1,
  maxLength: 50,
})
```

### 7. Middleware Pattern

Middleware is applied using `.derive()` to add properties to context:

```typescript
// middlewares/auth.ts
export const authMiddleware = async (ctx: Context): Promise<void> => {
  const context = ctx as Context & AppContext['decorator'];

  const sessionId = context.headers['authorization']?.replace('Bearer ', '');
  if (!sessionId) throw new AuthError('No session token provided');

  const sessionData = await context.services.auth.sessions.getSession(sessionId);
  if (!sessionData) throw new AuthError('Invalid or expired session');

  // Add to context (now available in all handlers)
  context.userId = sessionData.userId;
  context.role = sessionData.role;
  context.sessionId = sessionId;
};
```

**Applying middleware:**
```typescript
// Apply to all routes
new Elysia()
  .derive(authMiddleware)
  .use(handlers());

// Apply to specific routes only
new Elysia()
  .get('/public', publicHandler)       // No auth
  .derive(authMiddleware)
  .get('/private', privateHandler);    // Requires auth
```

### 8. Redis/Cache Setup

**Create a single Redis client** and share it across all services that need caching:

```typescript
// services/services.ts
import { RedisClient } from 'bun';

// Create single Redis client instance
const redis = new RedisClient({
  url: process.env.REDIS_URL,  // Optional, defaults to localhost:6379
});

redis.connect();

redis.onconnect = () => {
  console.log('✓ Connected to Redis');
};

redis.onerror = (error) => {
  console.error('Redis connection error:', error);
};
```

**Alternative Redis clients:**
```typescript
// Using ioredis (Node.js)
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Using Upstash Redis (serverless)
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

// Using node-redis
import { createClient } from 'redis';
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();
```

**Common use cases for Redis:**
- **Sessions**: Store user session data with TTL (auth tokens, session state)
- **Caching**: Cache database queries, API responses, computed results
- **Rate limiting**: Track request counts per user/IP
- **Payment polling**: Track payment status checks to avoid duplicate polling
- **Pub/Sub**: Real-time notifications, webhooks, event broadcasting
- **Queue management**: Background job queues, task scheduling

**Pass the Redis client to services that need it:**
```typescript
export const services = {
  auth: new AuthService(redis),      // Sessions, token storage
  payments: new PaymentService(redis), // Payment status polling cache
  cache: redis,                        // Direct access if needed
  // ... other services
};
```

**Important:** Always use **one Redis client** for all services to:
- Reuse connection pool
- Avoid connection limit issues
- Share cache namespace
- Maintain consistent configuration

### 9. Service Layer & Dependency Injection

Services are organized in a **centralized container** (`services/services.ts`):

```typescript
// services/services.ts
export const services = {
  auth: new AuthService(redis),     // Pass Redis to services that need it
  storage: new StorageService(),
  notifications: new NotificationService(),
  payments: new PaymentService(redis),
  enums: { UserRole, Status, /* ... */ },
};

// Types for type safety
export type Services = typeof services;
```

> **Real-world example**: Your services might include AWS S3, SendGrid, Stripe, Discord, Twilio, etc. The pattern remains the same - centralize instantiation and inject via decorator.

**Accessing services in handlers:**
```typescript
async ({ services, db }) => {
  // Upload file to storage
  await services.storage.upload({
    key: 'uploads/file.pdf',
    body: fileBuffer,
  });

  // Send notification
  await services.notifications.send({
    userId: user.id,
    message: 'Something happened',
  });

  // Process payment
  const payment = await services.payments.createCharge({
    amount: 5000,  // in cents
    customerId: user.id,
  });
}
```

> **Note**: Service names and methods are examples. Adapt to your implementation (e.g., `services.aws.s3`, `services.email`, `services.stripe`, etc.).

The services are injected via `.decorate('services', services)` in `main.ts`.

### 10. Database Patterns (Drizzle ORM)

#### ID Generation with randomblob

**All IDs in the database are text strings** generated using SQLite's `randomblob()`:

```sql
-- In schema
CREATE TABLE items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(12)))),  -- 24-char lowercase hex string
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);
```

This generates **24-character lowercase hexadecimal strings** like `a3f5e9c2b1d4f6a8e7c9b2d1`.

> **Important**: Use `lower()` wrapper to ensure consistent lowercase IDs for easier comparison and debugging.

**In Drizzle schema:**
```typescript
import { sql } from 'drizzle-orm';

export const items = sqliteTable('items', {
  id: text('id').primaryKey().default(sql`(lower(hex(randomblob(12))))`),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});
```

**Alternative using TypeScript helper:**
```typescript
export const items = sqliteTable('items', {
  id: text('id').primaryKey().$defaultFn(() => randomId()),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Helper function
function randomId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24).toLowerCase();
}
```

#### Basic Queries

```typescript
// Query builder
const items = await db
  .select()
  .from(schema.items)
  .where(eq(schema.items.status, 'active'))
  .orderBy(desc(schema.items.createdAt));

// Query API (with relations)
const item = await db.query.items.findFirst({
  where: eq(schema.items.id, id),
  with: {
    owner: true,
    tags: true,
  },
});
```

#### Insert, Update, Delete

```typescript
// Insert
const [item] = await db
  .insert(schema.items)
  .values({ name: 'Item', price: 1000 })
  .returning();  // Returns inserted row

// Update
const [item] = await db
  .update(schema.items)
  .set({ name: 'Updated', updatedAt: new Date() })
  .where(eq(schema.items.id, id))
  .returning();

// Delete
await db
  .delete(schema.items)
  .where(eq(schema.items.id, id));
```

#### Common Query Operators

```typescript
import { eq, and, or, gt, lt, desc, asc, count } from 'drizzle-orm';

// Equality
where(eq(schema.items.id, itemId))

// Multiple conditions (AND)
where(and(
  eq(schema.items.status, 'active'),
  eq(schema.items.userId, userId)
))

// OR conditions
where(or(
  eq(schema.items.priority, 'high'),
  eq(schema.items.priority, 'urgent')
))

// Comparisons
where(gt(schema.items.expiresAt, new Date()))  // Greater than
where(lt(schema.items.price, 10000))           // Less than

// Ordering
orderBy(desc(schema.items.createdAt))

// Aggregations
const [result] = await db
  .select({ count: count() })
  .from(schema.items)
  .where(eq(schema.items.userId, userId));
```

### 11. Database Migrations

Migrations are **SQL files** that run automatically on startup:

#### File Pattern
```
apps/api/src/db/migrations/
├── 0001_initial_schema.up.sql
├── 0002_add_user_roles.up.sql
├── 0003_add_timestamps.up.sql
└── ...
```

**Naming convention:** `{number}_{description}.up.sql`

**Important:** Files **must** have `.up.sql` extension to be executed.

#### Creating Migrations

**Method 1: Manual SQL (RECOMMENDED)**
Create a new file in `migrations/` directory:

```sql
-- 0099_add_tags.up.sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(12)))),
  name TEXT NOT NULL UNIQUE,
  created_at INTEGER DEFAULT (unixepoch()) NOT NULL
);

CREATE INDEX idx_tags_name ON tags(name);
```

**Method 2: Generate from schema**
```bash
cd apps/api
bun run db:generate  # Generates migration from schema.ts changes
```

#### Migration Runner

The migration runner in `db/db.ts`:
1. Creates `_migrations` table to track executed migrations
2. Reads all `*.up.sql` files from `migrations/` directory (sorted alphabetically)
3. Skips migrations already recorded in `_migrations`
4. Executes new migrations
5. Records executed migrations

**Never modify existing migrations after they've been run in production.**

### 12. Fire-and-Forget Pattern for Notifications

**Notifications and background tasks should always be fire-and-forget** - don't block the response waiting for them:

```typescript
async ({ services, db, userId }) => {
  // Save to database first
  const [item] = await db
    .insert(schema.items)
    .values({ userId, name: 'Item' })
    .returning();

  // Fire-and-forget notification (don't await)
  services.notifications
    .notify('item.created', { userId, itemId: item.id })
    .catch((error) => {
      console.error('Failed to send notification:', error);
    });

  // Return immediately without waiting
  return { item };
}
```

**This applies to:**
- Email sending
- Push notifications
- Discord/Slack messages
- Background file processing
- Non-critical external API calls

**Rule:** If the user doesn't need to wait for it, don't make them wait.

### 13. Background Task Pattern

For longer background tasks (file processing, PDF generation, etc.), use the same fire-and-forget approach:

```typescript
async ({ services, db }) => {
  const [document] = await db
    .insert(schema.documents)
    .values({ key: documentKey, status: 'processing' })
    .returning();

  // Process document in background
  services.documents
    .generate({ documentId: document.id })
    .then(async (result) => {
      await services.aws.s3.upload({
        key: documentKey,
        body: result.buffer,
      });

      await db
        .update(schema.documents)
        .set({ status: 'completed' })
        .where(eq(schema.documents.id, document.id));
    })
    .catch(async (error) => {
      console.error('Document generation failed:', error);

      await db
        .update(schema.documents)
        .set({ status: 'failed' })
        .where(eq(schema.documents.id, document.id));
    });

  // Return immediately
  return { document };
}
```

### 14. Error Handling

There are **three layers** of error handling in this API architecture:

#### Layer 1: Automatic Validation (Elysia + TypeBox)

**Validation errors are handled automatically by Elysia.** When you define schemas with `t.Object()`, Elysia validates the request and returns errors automatically - you don't need to check validation manually:

```typescript
.post('/posts', async ({ body }) => {
  // If we reach here, body is already validated
  // No need to check if title exists or meets minLength
  const { title, content } = body;

  // ... proceed with business logic
}, {
  body: t.Object({
    title: t.String({
      minLength: 3,
      maxLength: 100,
      error: 'Title must be between 3 and 100 characters',
    }),
    content: t.String({
      minLength: 10,
      error: 'Content must be at least 10 characters',
    }),
    tags: t.Array(t.String(), {
      maxItems: 5,
      error: 'Maximum 5 tags allowed',
    }),
  }),
})
```

**Automatic validation error response:**
```json
{
  "type": "validation",
  "on": "body",
  "summary": "Expected string length greater or equal to 3",
  "property": "/title",
  "message": "Title must be between 3 and 100 characters",
  "expected": { "minLength": 3 },
  "found": "ab",
  "errors": [...]
}
```

**You never need to manually validate inputs** - Elysia handles it before your handler runs.

#### Layer 2: Business Logic Errors (set.status + JSON Response) - PREFERRED

**This is the standard pattern for business logic errors.** Set the HTTP status code and return a JSON object:

```typescript
async ({ db, params: { id }, userId, set }) => {
  // Resource not found
  const item = await db.query.items.findFirst({
    where: eq(schema.items.id, id),
  });

  if (!item) {
    set.status = 404;
    return { error: 'Item not found' };
  }

  // Access control
  if (item.userId !== userId) {
    set.status = 403;
    return { error: 'Access denied to this item' };
  }

  // Business rule violation
  if (item.status === 'archived') {
    set.status = 400;
    return { error: 'Cannot modify archived items' };
  }

  // Success response
  return { item };
}
```

**Error response format:**
```json
{
  "error": "Error message here"
}
```

**Common HTTP status codes:**
- `400` - Bad Request (business rule violations)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (authenticated but no permission)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate resource, constraint violation)
- `500` - Internal Server Error (unexpected errors)

**When to use this pattern:**
- Resource not found
- Access denied / permission checks
- Business rule violations
- Conflict errors (duplicates, constraints)
- **Most handler errors use this pattern**

#### Layer 3: Thrown Errors (FOR MIDDLEWARE ONLY)

**This pattern is for middleware** that needs to halt request processing immediately:

```typescript
// middlewares/auth.ts
class AuthError extends Error {
  status: number = 401;
  name = 'AuthError';

  constructor(message: string) {
    super(JSON.stringify({ message }));
  }
}

export const authMiddleware = async (ctx: Context): Promise<void> => {
  const sessionId = ctx.headers['authorization']?.replace('Bearer ', '');

  if (!sessionId) {
    throw new AuthError('No session token provided');
  }

  const session = await ctx.services.auth.getSession(sessionId);

  if (!session) {
    throw new AuthError('Invalid or expired session');
  }

  if (session.status === 'banned') {
    throw new AuthError('Account has been banned');
  }

  // Add to context and continue
  ctx.userId = session.userId;
  ctx.role = session.role;
};
```

**Common custom error classes:**

```typescript
class AuthError extends Error {
  status: number = 401;
  name = 'AuthError';
  constructor(message: string) {
    super(JSON.stringify({ message }));
  }
}

class ForbiddenError extends Error {
  status: number = 403;
  name = 'ForbiddenError';
  constructor(message: string) {
    super(JSON.stringify({ message }));
  }
}
```

**Thrown error response format:**
```json
{
  "message": "Error message"
}
```

**When to use this pattern:**
- **Middleware only** (auth, admin checks, rate limiting)
- Critical errors that should immediately halt processing
- When you want consistent error handling across all endpoints

#### Comparison: When to Use Which Pattern

**✅ Elysia validation (automatic):**
```typescript
// Input validation - handled by Elysia
.post('/items', handler, {
  body: t.Object({
    name: t.String({ minLength: 1, maxLength: 50 }),
    price: t.Integer({ minimum: 0 }),
  }),
})
```

**✅ set.status + return (business logic):**
```typescript
// Business logic errors in handlers
async ({ db, params: { id }, set }) => {
  const item = await db.query.items.findFirst({
    where: eq(schema.items.id, id),
  });

  if (!item) {
    set.status = 404;
    return { error: 'Item not found' };
  }

  return { item };
}
```

**✅ throw Error (middleware only):**
```typescript
// Middleware that halts processing
export const rateLimitMiddleware = async (ctx: Context) => {
  const requests = await redis.get(`rate:${ctx.userId}`);

  if (requests > 100) {
    throw new RateLimitError('Rate limit exceeded');
  }
};
```

#### Complete Handler Example

```typescript
export function handlers() {
  return new Elysia<'/posts', AppContext>({ prefix: '/posts' })
    .get('/:id', async ({ db, params: { id }, userId, set }) => {
      // No need to validate id format - params schema handles it
      const post = await db.query.posts.findFirst({
        where: eq(schema.posts.id, id),
      });

      if (!post) {
        set.status = 404;
        return { error: 'Post not found' };
      }

      if (post.visibility === 'private' && post.userId !== userId) {
        set.status = 403;
        return { error: 'Access denied' };
      }

      return { post };
    }, {
      params: t.Object({
        id: t.String({ minLength: 24, maxLength: 24 }),
      }),
    })
    .post('/', async ({ db, body, userId }) => {
      // No need to validate body - already validated by schema
      const [post] = await db
        .insert(schema.posts)
        .values({
          userId,
          title: body.title,
          content: body.content,
        })
        .returning();

      return { post };
    }, {
      body: t.Object({
        title: t.String({ minLength: 3, maxLength: 100 }),
        content: t.String({ minLength: 10 }),
        tags: t.Optional(t.Array(t.String())),
      }),
    })
    .delete('/:id', async ({ db, params: { id }, userId, set }) => {
      const post = await db.query.posts.findFirst({
        where: eq(schema.posts.id, id),
      });

      if (!post) {
        set.status = 404;
        return { error: 'Post not found' };
      }

      if (post.userId !== userId) {
        set.status = 403;
        return { error: 'Only the owner can delete this post' };
      }

      await db.delete(schema.posts).where(eq(schema.posts.id, id));

      return { success: true };
    }, {
      params: t.Object({
        id: t.String(),
      }),
    });
}
```

### 15. Cron Jobs

Scheduled background jobs using `@elysiajs/cron`:

```typescript
// crons/index.ts
import cron from '@elysiajs/cron';
import type { Services, Database } from '../types/types';

export const crons = ({ services, db }: { db: Database; services: Services }) =>
  new Elysia()
    .use(cron(cleanupOldRecords({ db })))
    .use(cron(sendDailyDigests({ services, db })));

// crons/cleanup-old-records.ts
export const cleanupOldRecords = ({ db }) => ({
  name: 'cleanup-old-records',
  pattern: '0 2 * * *',  // Every day at 2 AM
  run: async () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await db
      .delete(schema.logs)
      .where(lt(schema.logs.createdAt, cutoff));

    console.log('Cleaned up old records');
  },
});
```

**Alternative using Patterns helper:**
```typescript
import { Patterns, type CronConfig } from '@elysiajs/cron';

export const cleanupOldRecords = ({ db }): CronConfig<'cleanup-old-records'> => ({
  name: 'cleanup-old-records',
  pattern: Patterns.EVERY_DAY_AT('2:00'),  // Every day at 2 AM
  run: async () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db.delete(schema.logs).where(lt(schema.logs.createdAt, cutoff));
    console.log('Cleaned up old records');
  },
});
```

**Cron pattern syntax:**
```
┌───────────── minute (0-59)
│ ┌─────────── hour (0-23)
│ │ ┌───────── day of month (1-31)
│ │ │ ┌─────── month (1-12)
│ │ │ │ ┌───── day of week (0-6, 0=Sunday)
│ │ │ │ │
* * * * *
```

**String pattern examples:**
- `'0 9 * * *'` - Every day at 9 AM
- `'*/30 * * * *'` - Every 30 minutes
- `'0 0 1 * *'` - First day of month at midnight

**Patterns helper examples:**
- `Patterns.EVERY_DAY_AT('9:00')` - Every day at 9 AM
- `Patterns.everyMinutes(30)` - Every 30 minutes
- `Patterns.daily()` - Every day at midnight
- `Patterns.weekly()` - Every Sunday at midnight
- `Patterns.monthly()` - First day of every month at midnight

### 16. OpenAPI Documentation

Every route should include a `detail` object:

```typescript
.post('/items', handler, {
  body: t.Object({
    name: t.String({ description: 'Item name' }),
  }),
  detail: {
    summary: 'Create item',                    // Short summary
    description: 'Creates a new item',         // Longer description
    tags: ['Items'],                           // API grouping
  },
})
```

Access docs at: `http://localhost:PORT/swagger`

### 17. Access Control Pattern

Check if user has permission to access a resource:

```typescript
async ({ db, userId, params: { itemId }, set }) => {
  // Find item
  const item = await db.query.items.findFirst({
    where: eq(schema.items.id, itemId),
  });

  if (!item) {
    set.status = 404;
    return { error: 'Item not found' };
  }

  // Check ownership
  if (item.userId !== userId) {
    set.status = 403;
    return { error: 'Access denied' };
  }

  // User has access
  return { item };
}
```

### 18. Presigned URL Pattern

Generate temporary URLs for private storage objects:

```typescript
async ({ services, db, params: { id }, userId, set }) => {
  const file = await db.query.files.findFirst({
    where: eq(schema.files.id, id),
  });

  if (!file || file.userId !== userId) {
    set.status = 403;
    return { error: 'Access denied' };
  }

  // Generate presigned URL (expires in 15 minutes)
  const url = await services.storage.getPresignedUrl(
    file.key,
    900  // seconds
  );

  return { url };
}
```

> **Note**: This pattern works with S3, Azure Blob Storage, Google Cloud Storage, or any storage service that supports temporary signed URLs.

## Best Practices

### 1. Handler Organization
- **One resource per file** (`posts.ts`, `comments.ts`, `users.ts`)
- **Group by access level** (public, private, admin)
- **Export `handlers()` function** that returns `Elysia<'/prefix', AppContext>`
- **Use descriptive prefixes** matching the resource

### 2. Type Safety
- **Always use `AppContext`** as the second generic: `Elysia<'/prefix', AppContext>`
- **Define request schemas** using `t.Object()` for body, params, query
- **Add descriptions** for OpenAPI documentation
- **Destructure context** for cleaner code

### 3. Error Handling
- **Create custom error classes** with `status` property
- **Throw errors for auth/validation** failures
- **Return error objects with `set.status`** for business logic errors
- **Always log errors** for debugging

### 4. Performance
- **Fire-and-forget notifications** - never block responses
- **Run background tasks asynchronously** when possible
- **Use database indexes** for frequently queried columns
- **Cache in Redis** for frequently accessed data

### 5. Security
- **Validate all inputs** with Elysia schemas
- **Check permissions** before querying/modifying resources
- **Use middleware** for consistent auth/authz
- **Never expose sensitive data** in responses
- **Use presigned URLs** for private files

### 6. Database
- **Use `lower(hex(randomblob(12)))`** for IDs (24-char lowercase hex strings)
- **Use Unix timestamps** (integers) for dates
- **Store money in cents** (integers)
- **Always use indexes** on foreign keys and frequently queried columns
- **Use `.returning()`** to get inserted/updated rows

### 7. Documentation
- **Add `detail` to all routes**
- **Use descriptive summaries and tags**
- **Add descriptions to schema properties**

## Environment Configuration

Validate environment variables on startup:

```typescript
// config.ts
export function checkEnv() {
  const required = [
    'LISTEN_ADDR',
    'DATABASE_PATH',
    'AWS_REGION',
    // ... more
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
```

Call `checkEnv()` before creating the app in `main.ts`.

## Real-World Applications

This architecture pattern is suitable for various types of applications:

**Common service integrations:**
- **Cloud Storage**: AWS S3, Azure Blob Storage, Google Cloud Storage, Cloudflare R2
- **Notifications**: Discord bots, SendGrid (email), Twilio (SMS), Slack webhooks, Push notifications
- **Payments**: Stripe, PayPal, Square, Razorpay, or regional payment providers
- **Authentication**: AWS Cognito, Auth0, Firebase Auth, Supabase Auth, custom JWT
- **Caching & Sessions**: Redis, Memcached, Upstash, or in-memory stores
- **External APIs**: Third-party integrations, webhooks, API aggregations

**Use case examples:**
- **Multi-tenant SaaS**: Company/organization management with role-based access control
- **E-commerce platforms**: Product catalogs, shopping carts, payment processing, order management
- **Document management**: File uploads with presigned URLs, document processing, version control
- **Social platforms**: User profiles, posts, comments, notifications, media uploads
- **Booking systems**: Reservations, availability management, automated reminders
- **B2B platforms**: Client management, invoicing, subscription billing, reporting

**Typical file structure:**
- `handlers/public/` - Auth endpoints, webhooks, public APIs
- `handlers/private/` - Authenticated user features (profile, content, transactions)
- `handlers/admin/` - Administrative functions (user management, analytics, moderation)
- `services/` - External service integrations (storage, auth, payments, notifications)
- `crons/` - Background jobs (cleanups, reminders, data sync, analytics)
- `db/migrations/` - SQL migration files for schema changes

## Summary

**The key pattern:** Export a `handlers()` function that returns `new Elysia<'/prefix', AppContext>({ prefix: '/prefix' })`. This gives you full type safety with access to `db`, `services`, `userId`, and all context properties. Group handlers by access level (public, private, admin) and apply middleware with `.derive()`. Use fire-and-forget for notifications and background tasks. Generate IDs with `lower(hex(randomblob(12)))`. Follow this pattern for any API built with this architecture.
