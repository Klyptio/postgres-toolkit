import { PostgresConnection } from "./connection";
import { QueryOptions } from "./types";

export class PostgresRepository<T extends Record<string, any>> {
  constructor(
    protected connection: PostgresConnection,
    protected tableName: string
  ) {}

  async findById(id: string | number): Promise<T | null> {
    const [result] = await this.connection.execute<T>(
      `SELECT * FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return result || null;
  }

  async findMany(options: QueryOptions<T> = {}): Promise<T[]> {
    const { where = {}, orderBy, limit, offset } = options;
    const conditions = Object.entries(where).map(
      ([key, value], index) => `${key} = $${index + 1}`
    );
    const values = Object.values(where);

    let query = `SELECT * FROM ${this.tableName}`;
    if (conditions.length) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }
    if (orderBy) {
      const orderClauses = Object.entries(orderBy)
        .map(([key, dir]) => `${key} ${dir}`)
        .join(", ");
      query += ` ORDER BY ${orderClauses}`;
    }
    if (limit) query += ` LIMIT ${limit}`;
    if (offset) query += ` OFFSET ${offset}`;

    return this.connection.execute<T>(query, values);
  }

  async create(data: Omit<T, "id">): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO ${this.tableName} (${keys.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *
    `;

    const result = await this.connection.execute<T>(query, values);
    return result[0] || null;
  }

  async update(id: string | number, data: Partial<T>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(", ");

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.connection.execute<T>(query, [id, ...values]);
    return result[0] || null;
  }

  async delete(id: string | number): Promise<boolean> {
    const result = await this.connection.execute<T[]>(
      `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.length > 0;
  }

  async query<R = any>(query: string, params?: any[]): Promise<R[]> {
    return this.connection.execute<R>(query, params);
  }

  async withTransaction<R>(
    callback: (repository: this) => Promise<R>
  ): Promise<R> {
    return this.connection.transaction(async (client) => {
      const transactionRepo = new PostgresRepository<T>(
        Object.create(this.connection, {
          pool: { value: { query: client.query.bind(client) } },
        }),
        this.tableName
      );
      return callback(transactionRepo as this);
    });
  }
}
