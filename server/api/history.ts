import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const client = await pool.connect()
  try {
    // On récupère TOUT l'historique, sans limitation.
    // L'interface Vue.js (history.vue) se chargera de paginer par 10 et de filtrer.
    const query = `
      SELECT h.*, a.label as article_label, a.code_article,
             s1.name as from_site_name, s2.name as to_site_name
      FROM stock_history h
      JOIN articles a ON h.article_id = a.id
      LEFT JOIN sites s1 ON h.from_site_id = s1.id
      LEFT JOIN sites s2 ON h.to_site_id = s2.id
      ORDER BY h.created_at DESC
    `
    const result = await client.query(query)
    
    return result.rows
  } catch (error) {
    console.error("Erreur API Historique :", error)
    return []
  } finally {
    client.release()
  }
})