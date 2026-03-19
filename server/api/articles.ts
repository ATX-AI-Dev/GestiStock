import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async () => {
  const client = await pool.connect()
  try {
    const query = `
      SELECT 
        a.id, a.code_article, a.label, a.has_serial_number, a.specs,
        c.name as category_name, b.name as brand_name, s.name as supplier_name
      FROM articles a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN brands b ON a.brand_id = b.id
      LEFT JOIN suppliers s ON a.supplier_id = s.id
      ORDER BY a.label ASC;
    `
    const result = await client.query(query)
    return result.rows
  } finally {
    client.release()
  }
})