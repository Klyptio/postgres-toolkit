export class PostgresError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "PostgresError";
  }
}

export class ConnectionError extends PostgresError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = "ConnectionError";
  }
}

export class QueryError extends PostgresError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = "QueryError";
  }
}
