import { ConnectionError, QueryError } from '@klypt/db-core';
import { PostgresConnection } from '../connection';
import { TEST_CONFIG } from './setup';

describe('PostgresConnection', () => {
  let connection: PostgresConnection;

  beforeEach(() => {
    connection = new PostgresConnection();
  });

  afterEach(async () => {
    await connection.disconnect();
  });

  it('should connect successfully with valid configuration', async () => {
    await expect(connection.connect(TEST_CONFIG)).resolves.not.toThrow();
    expect(connection.isConnected()).toBe(true);
  });

  it('should throw ConnectionError with invalid configuration', async () => {
    const invalidConfig = { ...TEST_CONFIG, password: 'wrong' };
    await expect(connection.connect(invalidConfig)).rejects.toThrow(ConnectionError);
  });

  it('should execute queries successfully when connected', async () => {
    await connection.connect(TEST_CONFIG);
    const result = await connection.execute('SELECT 1 as number');
    expect(result).toEqual([{ number: 1 }]);
  });

  it('should throw QueryError when executing invalid query', async () => {
    await connection.connect(TEST_CONFIG);
    await expect(connection.execute('INVALID SQL')).rejects.toThrow(QueryError);
  });

  it('should throw ConnectionError when executing query without connection', async () => {
    await expect(connection.execute('SELECT 1')).rejects.toThrow(ConnectionError);
  });
});