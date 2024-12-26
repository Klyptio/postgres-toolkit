import { DatabaseConfig } from '@klypt/db-core';

export interface PostgresConfig extends DatabaseConfig {
  schema?: string;
  poolSize?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}