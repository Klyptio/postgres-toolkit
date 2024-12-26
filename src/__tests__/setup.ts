import { PostgresConnection } from '../connection';

// Test database configuration
export const TEST_CONFIG = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5434'),
  database: process.env.POSTGRES_DB || 'test_db',
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
};

// Helper to create test tables
export async function createTestTable(connection: PostgresConnection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS test_users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// Helper to drop test tables
export async function dropTestTable(connection: PostgresConnection) {
  await connection.execute('DROP TABLE IF EXISTS test_users');
}