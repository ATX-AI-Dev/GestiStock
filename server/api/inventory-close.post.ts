import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const campRes = await client.query("SELECT * FROM inventory_campaigns WHERE id = $1", [body.campaign_id])
    const campaign = campRes.rows[0]
    if (campaign.status === 'COMPLETED') throw new Error("Inventaire déjà clôturé.")

    const lines = await client.query("SELECT * FROM inventory_lines WHERE campaign_id = $1", [body.campaign_id])

    // On parcourt chaque ligne pour régulariser le stock physique
    for (const line of lines.rows) {
      const delta = line.counted_quantity - line.expected_quantity

      // 1. Mise à jour brut de la quantité
      if (delta !== 0) {
        await client.query(`
          INSERT INTO site_article_stocks (site_id, article_id, quantity) VALUES ($1, $2, $3)
          ON CONFLICT (site_id, article_id) DO UPDATE SET quantity = $3
        `, [campaign.site_id, line.article_id, line.counted_quantity])
        
        // Traces d'historique (IN ou OUT selon le delta)
        const type = delta > 0 ? 'IN' : 'OUT'
        await client.query(`
          INSERT INTO stock_history (article_id, from_site_id, to_site_id, type, quantity, purchase_price, purchase_date)
          VALUES ($1, $2, $3, $4, $5, 0, NOW())
        `, [line.article_id, type === 'OUT' ? campaign.site_id : null, type === 'IN' ? campaign.site_id : null, type, Math.abs(delta)])
      }

      // 2. Gestion des Numéros de Série
      const expectedSns = line.expected_serials || []
      const countedSns = line.counted_serials || []
      
      const lostSns = expectedSns.filter((sn: string) => !countedSns.includes(sn))
      const foundSns = countedSns.filter((sn: string) => !expectedSns.includes(sn))

      // S/N Perdus
      for (const sn of lostSns) {
        await client.query("UPDATE article_serials SET status = 'LOST', site_id = NULL WHERE serial_number = $1", [sn])
      }
      
      // S/N Trouvés
      for (const sn of foundSns) {
        await client.query(`
          INSERT INTO article_serials (article_id, site_id, serial_number, purchase_price) VALUES ($1, $2, $3, 0)
          ON CONFLICT (serial_number) DO UPDATE SET site_id = $2, status = NULL
        `, [line.article_id, campaign.site_id, sn])
      }
    }

    // Clôture
    await client.query("UPDATE inventory_campaigns SET status = 'COMPLETED', completed_at = NOW() WHERE id = $1", [body.campaign_id])
    
    await client.query('COMMIT')
    return { success: true }
  } catch (e: any) {
    await client.query('ROLLBACK')
    throw createError({ statusCode: 500, statusMessage: e.message })
  } finally {
    client.release()
  }
})