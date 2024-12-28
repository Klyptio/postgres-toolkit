import { PostgresConnection } from '../connection';
import { PostgresRepository } from '../repository';
import { TEST_CONFIG, createTestTable, dropTestTable } from './setup';

interface TestUser {
  id: number;
  name: string;
  email: string;
  created_at?: Date;
}

describe('PostgresRepository', () => {
  let connection: PostgresConnection;
  let repository: PostgresRepository<TestUser>;

  beforeAll(async () => {
    connection = new PostgresConnection();
    await connection.connect(TEST_CONFIG);
    await createTestTable(connection);
  });

  afterAll(async () => {
    await dropTestTable(connection);
    await connection.disconnect();
  });

  beforeEach(() => {
    repository = new PostgresRepository<TestUser>(connection, 'test_users');
  });

  afterEach(async () => {
    await connection.execute('TRUNCATE test_users RESTART IDENTITY');
  });

  describe('CRUD operations', () => {
    it('should create a new record', async () => {
      const user = await repository.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      expect(user.id).toBe(1);
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user.created_at).toBeInstanceOf(Date);
    });

    it('should find record by id', async () => {
      const created = await repository.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      const found = await repository.findById(created.id);
      expect(found).toMatchObject({
        id: created.id,
        name: 'Test User',
        email: 'test@example.com',
      });
    });

    it('should update record', async () => {
      const created = await repository.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      const updated = await repository.update(created.id, {
        name: 'Updated Name',
      });

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe('Updated Name');
      expect(updated.email).toBe(created.email);
    });

    it('should delete record', async () => {
      const created = await repository.create({
        name: 'Test User',
        email: 'test@example.com',
      });

      const deleted = await repository.delete(created.id);
      expect(deleted).toBe(true);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });
  });

  describe('Query options', () => {
    beforeEach(async () => {
      await repository.create({ name: 'User 1', email: 'user1@example.com' });
      await repository.create({ name: 'User 2', email: 'user2@example.com' });
      await repository.create({ name: 'User 3', email: 'user3@example.com' });
    });

    it('should filter records with where clause', async () => {
      const users = await repository.findMany({
        where: { name: 'User 2' },
      });

      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('User 2');
    });

    it('should order records', async () => {
      const users = await repository.findMany({
        orderBy: { name: 'desc' },
      });

      expect(users).toHaveLength(3);
      expect(users[0].name).toBe('User 3');
      expect(users[2].name).toBe('User 1');
    });

    it('should limit and offset records', async () => {
      const users = await repository.findMany({
        limit: 2,
        offset: 1,
      });

      expect(users).toHaveLength(2);
      expect(users[0].name).toBe('User 2');
      expect(users[1].name).toBe('User 3');
    });
  });

  describe("Transactions", () => {
    it("should commit transaction successfully", async () => {
      await repository.withTransaction(async (repo) => {
        await repo.create({
          name: "Transaction User",
          email: "transaction@example.com",
        });
      });

      const user = await repository.findMany({
        where: { email: "transaction@example.com" },
      });
      expect(user).toHaveLength(1);
    });

    it("should rollback transaction on error", async () => {
      try {
        await repository.withTransaction(async (repo) => {
          await repo.create({
            name: "Rollback User",
            email: "rollback@example.com",
          });
          throw new Error("Test rollback");
        });
      } catch (error) {
        // Expected error
      }

      const user = await repository.findMany({
        where: { email: "rollback@example.com" },
      });
      expect(user).toHaveLength(0);
    });
  });
});