import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = await pool.connect()

  try {
    // Upsert (Mise à jour ou Création si l'article n'était pas attendu sur ce site)
    const checkLine = await client.query("SELECT id FROM inventory_lines WHERE campaign_id = $1 AND article_id = $2", [body.campaign_id, body.article_id])
    
    if (checkLine.rows.length > 0) {
      await client.query(`
        UPDATE inventory_lines 
        SET counted_quantity = $1, counted_serials = $2::jsonb 
        WHERE campaign_id = $3 AND article_id = $4
      `, [body.counted_quantity, JSON.stringify(body.counted_serials || []), body.campaign_id, body.article_id])
    } else {
      await client.query(`
        INSERT INTO inventory_lines (campaign_id, article_id, counted_quantity, counted_serials) 
        VALUES ($1, $2, $3, $4::jsonb)
      `, [body.campaign_id, body.article_id, body.counted_quantity, JSON.stringify(body.counted_serials || [])])
    }
    
    return { success: true }
  } finally {
    client.release()
  }
})