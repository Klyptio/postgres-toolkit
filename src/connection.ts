import { Pool, PoolClient } from 'pg';
import { parse as parseConnectionString } from 'pg-connection-string';
import { 
  DatabaseConnection, 
  ConnectionError,
  QueryError 
} from '@klypt/db-core';
import { PostgresConfig } from './types';

export class PostgresConnection implements DatabaseConnection<PostgresConfig> {
  private pool: Pool | null = null;
  private client: PoolClient | null = null;

  async connect(config: PostgresConfig): Promise<void> {
    try {
      const parsedConfig = config.connectionString ? parseConnectionString(config.connectionString) : config;
      const poolConfig = {
        host: parsedConfig.host ?? undefined,
        port: parsedConfig.port,
        database: parsedConfig.database ?? undefined,
        user: ('username' in parsedConfig ? parsedConfig.username : parsedConfig.user) ?? undefined,
        password: parsedConfig.password,
        ssl: parsedConfig.ssl
      } as const;

      this.pool = new Pool({
        ...poolConfig,
        port: poolConfig.port ? parseInt(String(poolConfig.port), 10) : undefined,
        ssl: typeof poolConfig.ssl === 'string' ? poolConfig.ssl === 'true' : poolConfig.ssl,
        max: config.poolSize,
        idleTimeoutMillis: config.idleTimeoutMillis,
        connectionTimeoutMillis: config.connectionTimeoutMillis,
      });

      // Test the connection
      this.client = await this.pool.connect();
      this.client.release();
    } catch (error) {
      throw new ConnectionError(
        `Failed to connect to PostgreSQL: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.client = null;
    }
  }

  isConnected(): boolean {
    return this.pool !== null && !this.pool.ended;
  }

  async execute<T = any>(query: string, params?: any[]): Promise<T> {
    if (!this.isConnected()) {
      throw new ConnectionError('Not connected to PostgreSQL');
    }

    try {
      const result = await this.pool!.query(query, params);
      return result.rows as T;
    } catch (error) {
      throw new QueryError(
        `PostgreSQL query failed: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}