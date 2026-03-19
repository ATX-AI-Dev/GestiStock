import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async () => {
  const client = await pool.connect()
  try {
    const query = `
      SELECT 
        sas.site_id, 
        sas.article_id, 
        sas.quantity,
        sas.alert_threshold,
        s.name as site_name, 
        a.label as article_label, 
        a.has_serial_number
      FROM site_article_stocks sas
      JOIN sites s ON sas.site_id = s.id
      JOIN articles a ON sas.article_id = a.id
      ORDER BY s.name ASC, a.label ASC
    `
    const result = await client.query(query)
    return result.rows
  } catch (e: any) {
    console.error("ERREUR GET STOCKS:", e.message)
    return [] 
  } finally {
    client.release()
  }
})