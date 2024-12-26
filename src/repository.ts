import { Repository, QueryOptions } from '@klypt/db-core';
import { PostgresConnection } from './connection';

export class PostgresRepository<T extends Record<string, any>> implements Repository<T> {
  constructor(
    private readonly connection: PostgresConnection,
    private readonly table: string
  ) {}

  async findById(id: string | number): Promise<T | null> {
    const result = await this.connection.execute<T[]>(
      `SELECT * FROM ${this.table} WHERE id = $1 LIMIT 1`,
      [id]
    );
    return result[0] || null;
  }

  async findMany(options: QueryOptions = {}): Promise<T[]> {
    let query = `SELECT * FROM ${this.table}`;
    const params: any[] = [];

    if (options.where) {
      const conditions = Object.entries(options.where).map(([key, value], index) => {
        params.push(value);
        return `${key} = $${params.length}`;
      });
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (options.orderBy) {
      const orderClauses = Object.entries(options.orderBy)
        .map(([key, direction]) => `${key} ${direction}`);
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    if (options.limit) {
      params.push(options.limit);
      query += ` LIMIT $${params.length}`;
    }

    if (options.offset) {
      params.push(options.offset);
      query += ` OFFSET $${params.length}`;
    }

    return this.connection.execute<T[]>(query, params);
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO ${this.table} (${keys.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await this.connection.execute<T[]>(query, values);
    return result[0];
  }

  async update(id: string | number, data: Partial<T>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');

    const query = `
      UPDATE ${this.table}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.connection.execute<T[]>(
      query,
      [id, ...values]
    );
    return result[0];
  }

  async delete(id: string | number): Promise<boolean> {
    const result = await this.connection.execute<T[]>(
      `DELETE FROM ${this.table} WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.length > 0;
  }

  async query<R = any>(query: string, params?: any[]): Promise<R> {
    return this.connection.execute<R>(query, params);
  }

  async withTransaction<R>(
    callback: (repository: this) => Promise<R>
  ): Promise<R> {
    return this.connection.transaction(async (client) => {
      const transactionRepo = new PostgresRepository<T>(
        Object.create(this.connection, {
          pool: { value: { query: client.query.bind(client) } }
        }),
        this.table
      );
      return callback(transactionRepo as this);
    });
  }
}