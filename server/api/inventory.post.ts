import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Vérifier qu'il n'y a pas déjà un inventaire en cours sur ce site
    const check = await client.query("SELECT id FROM inventory_campaigns WHERE site_id = $1 AND status = 'IN_PROGRESS'", [body.site_id])
    if (check.rows.length > 0) throw new Error("Un inventaire est déjà en cours sur ce site.")

    // 2. Créer la campagne
    const campRes = await client.query("INSERT INTO inventory_campaigns (site_id) VALUES ($1) RETURNING id", [body.site_id])
    const campaignId = campRes.rows[0].id

    // 3. Prendre la photo des quantités
    const stocks = await client.query("SELECT article_id, quantity FROM site_article_stocks WHERE site_id = $1 AND quantity > 0", [body.site_id])
    
    // 4. Prendre la photo des numéros de série
    const serials = await client.query("SELECT article_id, serial_number FROM article_serials WHERE site_id = $1 AND status IS NULL", [body.site_id])
    const serialsByArticle: Record<number, string[]> = {}
    serials.rows.forEach(s => {
       if (!serialsByArticle[s.article_id]) serialsByArticle[s.article_id] = []
       serialsByArticle[s.article_id].push(s.serial_number)
    })

    // 5. Générer les lignes d'attente
    for (const st of stocks.rows) {
       const expectedSns = JSON.stringify(serialsByArticle[st.article_id] || [])
       await client.query(`
         INSERT INTO inventory_lines (campaign_id, article_id, expected_quantity, expected_serials) 
         VALUES ($1, $2, $3, $4)
       `, [campaignId, st.article_id, st.quantity, expectedSns])
    }

    await client.query('COMMIT')
    return { id: campaignId }
  } catch (e: any) {
    await client.query('ROLLBACK')
    throw createError({ statusCode: 400, statusMessage: e.message })
  } finally {
    client.release()
  }
})