export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  user?: string;
  password?: string;
  ssl?: boolean | object;
  schema?: string;
  poolSize?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface QueryOptions<T> {
  where?: Partial<T>;
  orderBy?: { [K in keyof T]?: "asc" | "desc" };
  limit?: number;
  offset?: number;
  select?: (keyof T)[];
}
