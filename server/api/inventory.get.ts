import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const client = await pool.connect()
  
  try {
    // Si on demande un inventaire spécifique (avec ses lignes)
    if (query.id) {
      const campRes = await client.query(`
        SELECT ic.*, s.name as site_name FROM inventory_campaigns ic 
        JOIN sites s ON ic.site_id = s.id WHERE ic.id = $1
      `, [query.id])
      
      const linesRes = await client.query(`
        SELECT il.*, a.code_article, a.label, a.has_serial_number 
        FROM inventory_lines il
        JOIN articles a ON il.article_id = a.id
        WHERE il.campaign_id = $1 ORDER BY a.label ASC
      `, [query.id])
      
      return { campaign: campRes.rows[0], lines: linesRes.rows }
    }

    // Sinon, on liste toutes les campagnes
    const result = await client.query(`
      SELECT ic.*, s.name as site_name,
      (SELECT COUNT(*) FROM inventory_lines WHERE campaign_id = ic.id) as total_lines
      FROM inventory_campaigns ic
      JOIN sites s ON ic.site_id = s.id
      ORDER BY ic.created_at DESC
    `)
    return result.rows

  } finally {
    client.release()
  }
})