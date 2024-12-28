# @klypt/postgres-toolkit

A lightweight, type-safe PostgreSQL adapter with connection pooling and repository pattern support.

## Installation

```bash
npm install @klypt/postgres-toolkit
```

## Features

- ✅ Type-safe repository pattern implementation
- ✅ Connection pooling with configurable settings
- ✅ Support for multiple PostgreSQL hosting solutions (Local, Docker, Supabase, etc.)
- ✅ SSL support for secure connections
- ✅ Transaction support
- ✅ Query filtering, sorting, and pagination
- ✅ Error handling with custom error types
- ✅ Connection string support
- ✅ Next.js compatible

## Usage in Next.js

### 1. Database Configuration

Create a database config file (`lib/db.ts`):

```typescript
import { PostgresConnection } from '@klypt/postgres-toolkit';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.NODE_ENV === 'production',
  // Optional configurations
  poolSize: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create a singleton instance
const connection = new PostgresConnection();

// Connect on server initialization
if (process.env.NODE_ENV !== 'development') {
  connection.connect(dbConfig).catch(console.error);
}

export default connection;
```

### 2. Create Repositories

Example user repository (`repositories/userRepository.ts`):

```typescript
import { PostgresRepository } from '@klypt/postgres-toolkit';
import connection from '../lib/db';

interface User {
  id: number;
  email: string;
  name: string;
  created_at: Date;
}

export class UserRepository extends PostgresRepository<User> {
  constructor() {
    super(connection, 'users');
  }

  async findByEmail(email: string) {
    const [user] = await this.findMany({ where: { email } });
    return user || null;
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
```

### 3. Use in API Routes

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { userRepository } from '../../../repositories/userRepository';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'GET':
        const users = await userRepository.findMany();
        return res.json(users);

      case 'POST':
        const newUser = await userRepository.create(req.body);
        return res.status(201).json(newUser);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
```

### 4. Transaction Support

```typescript
await userRepository.withTransaction(async (repo) => {
  const user = await repo.create({ name: 'John', email: 'john@example.com' });
  await repo.update(user.id, { status: 'active' });
});
```

## Environment Setup

Add to your `.env.local`:

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=your_database
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_SSL=true  # For production environments
```

## API Reference

### PostgresConnection

```typescript
interface PostgresConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  ssl?: boolean | object;
  poolSize?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

const connection = new PostgresConnection();
await connection.connect(config: PostgresConfig);
await connection.disconnect();
await connection.execute<T>(query: string, params?: any[]): Promise<T[]>;
```

### PostgresRepository<T>

```typescript
interface QueryOptions<T> {
  where?: Partial<T>;
  orderBy?: { [K in keyof T]?: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
}

const repository = new PostgresRepository<T>(connection, 'table_name');

// Available methods
repository.findById(id: string | number): Promise<T | null>;
repository.findMany(options?: QueryOptions<T>): Promise<T[]>;
repository.create(data: Omit<T, 'id'>): Promise<T>;
repository.update(id: string | number, data: Partial<T>): Promise<T>;
repository.delete(id: string | number): Promise<boolean>;
repository.query<R>(query: string, params?: any[]): Promise<R[]>;
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## License

MIT

## Author

Priyajit Mukherjee