import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export const sql = {
  query: async (text: string, params?: unknown[]) => {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }
};

export async function query(text: string, params?: unknown[]) {
  return sql.query(text, params);
}