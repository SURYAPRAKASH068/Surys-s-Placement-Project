import Database from 'better-sqlite3';
import path from 'path';

export interface DatabaseInterface {
  execute(sql: string, params?: any[]): Promise<any>;
  get(sql: string, params?: any[]): Promise<any>;
  all(sql: string, params?: any[]): Promise<any[]>;
  transaction(callback: (db: DatabaseInterface) => Promise<void>): Promise<void>;
}

export class SQLiteDB implements DatabaseInterface {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(process.cwd(), 'spas.db');
    console.log(`🏗️ Initializing SQLite at ${dbPath}`);
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return {
      insertId: result.lastInsertRowid,
      affectedRows: result.changes
    };
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  async transaction(callback: (db: DatabaseInterface) => Promise<void>): Promise<void> {
    const tx = this.db.transaction(async (cb: (db: DatabaseInterface) => Promise<void>) => {
      const txDB: DatabaseInterface = {
        execute: async (sql, params) => {
          const stmt = this.db.prepare(sql);
          const result = stmt.run(...(params || []));
          return { insertId: result.lastInsertRowid, affectedRows: result.changes };
        },
        get: async (sql, params) => {
          const stmt = this.db.prepare(sql);
          return stmt.get(...(params || []));
        },
        all: async (sql, params) => {
          const stmt = this.db.prepare(sql);
          return stmt.all(...(params || []));
        },
        transaction: async () => { throw new Error("Nested transactions not supported"); }
      };
      await cb(txDB);
    });
    
    await tx(callback);
  }
}

let dbInstance: DatabaseInterface | undefined;

export function getDB(): DatabaseInterface {
  if (!dbInstance) {
    console.log("🔌 Using SQLite Backend");
    dbInstance = new SQLiteDB();
  }
  return dbInstance;
}
