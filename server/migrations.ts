import pg from 'pg';

const { Pool } = pg;

interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

// Database migrations for proper schema management
const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      -- Create users table
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create inspiration_images table
      CREATE TABLE IF NOT EXISTS inspiration_images (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        image_url VARCHAR(255) NOT NULL,
        tags TEXT[] DEFAULT '{}',
        is_saved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create clothing_items table
      CREATE TABLE IF NOT EXISTS clothing_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        image_url VARCHAR(255) NOT NULL,
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_inspiration_images_user_id ON inspiration_images(user_id);
      CREATE INDEX IF NOT EXISTS idx_clothing_items_user_id ON clothing_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_clothing_items_category ON clothing_items(category);
    `,
    down: `
      DROP TABLE IF EXISTS clothing_items;
      DROP TABLE IF EXISTS inspiration_images;
      DROP TABLE IF EXISTS users;
    `
  },
  {
    version: 2,
    name: 'session_table_optimization',
    up: `
      -- Ensure session table exists with proper structure
      CREATE TABLE IF NOT EXISTS session (
        sid varchar NOT NULL COLLATE "default" PRIMARY KEY,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      );

      -- Add index for better session cleanup performance
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire);

      -- Create migrations tracking table
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `,
    down: `
      DROP INDEX IF EXISTS "IDX_session_expire";
      DROP TABLE IF EXISTS schema_migrations;
    `
  }
];

export class MigrationRunner {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      max: 5,
      min: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
    });
  }

  async runMigrations(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Ensure migrations table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Get applied migrations
      const appliedResult = await client.query(
        'SELECT version FROM schema_migrations ORDER BY version'
      );
      const appliedVersions = new Set(appliedResult.rows.map(row => row.version));

      // Apply pending migrations
      for (const migration of migrations) {
        if (!appliedVersions.has(migration.version)) {
          await client.query('BEGIN');
          try {
            await client.query(migration.up);
            await client.query(
              'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
              [migration.version, migration.name]
            );
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            console.error(`Failed to apply migration ${migration.version}:`, error);
            throw error;
          }
        }
      }
    } finally {
      client.release();
    }
  }

  async rollbackMigration(version: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      const migration = migrations.find(m => m.version === version);
      if (!migration) {
        throw new Error(`Migration version ${version} not found`);
      }

      await client.query('BEGIN');
      try {
        await client.query(migration.down);
        await client.query(
          'DELETE FROM schema_migrations WHERE version = $1',
          [version]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Failed to rollback migration ${version}:`, error);
        throw error;
      }
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Initialize and run migrations
export async function initializeMigrations(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const runner = new MigrationRunner(connectionString);

  try {
    await runner.runMigrations();
  } finally {
    await runner.close();
  }
}