import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

const { Pool } = pg;

export class DatabaseBackupRestore {
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

  async createBackup(backupName?: string): Promise<string> {
    const client = await this.pool.connect();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = backupName || `stylematch-backup-${timestamp}.sql`;
    const backupPath = path.join(process.cwd(), 'backups', filename);

    try {
      // Ensure backup directory exists
      await fs.mkdir(path.dirname(backupPath), { recursive: true });

      // Export users table
      const usersResult = await client.query('SELECT * FROM users ORDER BY id');

      // Export inspiration_images table
      const inspirationResult = await client.query('SELECT * FROM inspiration_images ORDER BY id');

      // Export clothing_items table
      const clothingResult = await client.query('SELECT * FROM clothing_items ORDER BY id');

      // Generate SQL backup content
      let backupContent = `-- StyleMatch Database Backup
-- Created: ${new Date().toISOString()}
--
-- This backup contains user data, inspiration images, and clothing items
--

-- Clear existing data
TRUNCATE TABLE clothing_items, inspiration_images, users RESTART IDENTITY CASCADE;

`;

      // Add users data
      if (usersResult.rows.length > 0) {
        backupContent += `-- Users data\n`;
        for (const user of usersResult.rows) {
          const values = [
            user.id,
            `'${user.email.replace(/'/g, "''")}'`,
            `'${user.username.replace(/'/g, "''")}'`,
            `'${user.password.replace(/'/g, "''")}'`,
            user.created_at ? `'${user.created_at.toISOString()}'` : 'CURRENT_TIMESTAMP'
          ].join(', ');
          backupContent += `INSERT INTO users (id, email, username, password, created_at) VALUES (${values});\n`;
        }
        backupContent += `\n`;
      }

      // Add inspiration images data
      if (inspirationResult.rows.length > 0) {
        backupContent += `-- Inspiration images data\n`;
        for (const image of inspirationResult.rows) {
          const tags = image.tags ? `ARRAY[${image.tags.map((tag: string) => `'${tag.replace(/'/g, "''")}'`).join(', ')}]` : 'ARRAY[]::text[]';
          const values = [
            image.id,
            image.user_id,
            `'${image.image_url.replace(/'/g, "''")}'`,
            tags,
            image.is_saved,
            image.created_at ? `'${image.created_at.toISOString()}'` : 'CURRENT_TIMESTAMP'
          ].join(', ');
          backupContent += `INSERT INTO inspiration_images (id, user_id, image_url, tags, is_saved, created_at) VALUES (${values});\n`;
        }
        backupContent += `\n`;
      }

      // Add clothing items data
      if (clothingResult.rows.length > 0) {
        backupContent += `-- Clothing items data\n`;
        for (const item of clothingResult.rows) {
          const tags = item.tags ? `ARRAY[${item.tags.map((tag: string) => `'${tag.replace(/'/g, "''")}'`).join(', ')}]` : 'ARRAY[]::text[]';
          const values = [
            item.id,
            item.user_id,
            `'${item.name.replace(/'/g, "''")}'`,
            `'${item.category.replace(/'/g, "''")}'`,
            `'${item.image_url.replace(/'/g, "''")}'`,
            tags,
            item.created_at ? `'${item.created_at.toISOString()}'` : 'CURRENT_TIMESTAMP'
          ].join(', ');
          backupContent += `INSERT INTO clothing_items (id, user_id, name, category, image_url, tags, created_at) VALUES (${values});\n`;
        }
        backupContent += `\n`;
      }

      // Reset sequences
      backupContent += `-- Reset sequences\n`;
      backupContent += `SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));\n`;
      backupContent += `SELECT setval('inspiration_images_id_seq', (SELECT COALESCE(MAX(id), 1) FROM inspiration_images));\n`;
      backupContent += `SELECT setval('clothing_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM clothing_items));\n`;

      // Write backup file
      await fs.writeFile(backupPath, backupContent, 'utf8');

      return backupPath;
    } catch (error) {
      console.error('Error creating database backup:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async restoreBackup(backupPath: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Read backup file
      const backupContent = await fs.readFile(backupPath, 'utf8');

      // Execute backup SQL in a transaction
      await client.query('BEGIN');

      try {
        // Split backup content into individual statements and execute
        const statements = backupContent
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement);
          }
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during database restore, transaction rolled back:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error restoring database backup:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async listBackups(): Promise<string[]> {
    const backupDir = path.join(process.cwd(), 'backups');

    try {
      const files = await fs.readdir(backupDir);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return []; // No backup directory exists
      }
      throw error;
    }
  }

  async deleteBackup(filename: string): Promise<void> {
    const backupPath = path.join(process.cwd(), 'backups', filename);

    try {
      await fs.unlink(backupPath);
    } catch (error) {
      console.error(`Error deleting backup ${filename}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Utility functions for automated backups
export async function createAutomaticBackup(): Promise<string> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const backupRestore = new DatabaseBackupRestore(connectionString);

  try {
    return await backupRestore.createBackup();
  } finally {
    await backupRestore.close();
  }
}

export async function scheduleAutomaticBackups(): Promise<void> {
  // Create backup every 6 hours
  const BACKUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

  const performBackup = async () => {
    try {
      await createAutomaticBackup();
    } catch (error) {
      console.error('Automatic backup failed:', error);
    }
  };

  // Create initial backup
  await performBackup();

  // Schedule recurring backups
  setInterval(performBackup, BACKUP_INTERVAL);
}