import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const client = await pool.connect()
  try {
    // On exécute les requêtes UNE PAR UNE (fini le Promise.all)
    const sites = await client.query('SELECT COUNT(*) FROM sites')
    const articles = await client.query('SELECT COUNT(*) FROM articles')
    const alerts = await client.query('SELECT COUNT(*) FROM site_article_stocks WHERE quantity <= alert_threshold')
    
    const totalValue = await client.query(`
      SELECT COALESCE(SUM(st.quantity * h.purchase_price), 0) as total
      FROM site_article_stocks st
      LEFT JOIN (
        SELECT DISTINCT ON (article_id) article_id, purchase_price
        FROM stock_history
        ORDER BY article_id, created_at DESC
      ) h ON st.article_id = h.article_id
    `)
    
    const distribution = await client.query(`
      SELECT s.name, s.id, COALESCE(SUM(st.quantity), 0) as total_qty
      FROM sites s
      LEFT JOIN site_article_stocks st ON s.id = st.site_id
      GROUP BY s.name, s.id
    `)
    
    // ... tes autres requêtes au-dessus (sites, articles, alerts, totalValue, distribution)

    // REQUÊTE OPTIMISÉE : Agrégation des événements (Log Correlation)
    // On groupe par date exacte de création (qui est identique pour tout le batch dans une transaction BEGIN/COMMIT)
    const lastMovements = await client.query(`
      SELECT 
        h.type, 
        SUM(h.quantity) as quantity, 
        h.created_at, 
        a.label as article_label,
        sf.name as from_site_name,
        st.name as to_site_name
      FROM stock_history h
      JOIN articles a ON h.article_id = a.id
      LEFT JOIN sites sf ON h.from_site_id = sf.id
      LEFT JOIN sites st ON h.to_site_id = st.id
      GROUP BY 
        h.type, 
        h.created_at, 
        a.label,
        sf.name,
        st.name
      ORDER BY h.created_at DESC 
      LIMIT 6
    `).catch((e) => {
      console.error("Erreur Query lastMovements:", e)
      return { rows: [] }
    })

    client.release()
    
    return {
      sitesCount: sites.rows[0].count || 0,
      articlesCount: articles.rows[0].count || 0,
      alertsCount: alerts.rows[0].count || 0,
      totalValue: parseFloat(totalValue.rows[0].total || 0).toLocaleString('fr-FR'),
      distribution: distribution.rows || [],
      lastMovements: lastMovements.rows || []
    }
  } catch (e: any) {
    client.release()
    console.error("DEBUG STATS ERROR:", e.message)
    return { sitesCount: 0, articlesCount: 0, alertsCount: 0, totalValue: "0", distribution: [], lastMovements: [] }
  }
})