import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = await pool.connect()
  try {
    const extractId = (val: any) => typeof val === 'object' && val !== null ? (val.id || val.value) : val;
    
    const siteId = extractId(body.site_id);
    const artId = extractId(body.article_id);

    await client.query(`
      UPDATE site_article_stocks 
      SET quantity = $1, alert_threshold = $2
      WHERE site_id = $3 AND article_id = $4
    `, [Number(body.quantity), Number(body.alert_threshold), siteId, artId])

    return { success: true }
  } catch (e: any) {
    console.error("ERREUR PUT STOCKS:", e.message)
    throw createError({ statusCode: 500, statusMessage: e.message })
  } finally {
    client.release()
  }
})