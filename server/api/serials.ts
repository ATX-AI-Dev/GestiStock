import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const articleId = Number(query.article_id)
  
  // On récupère le site_id SEULEMENT s'il est fourni
  const siteId = query.site_id ? Number(query.site_id) : null

  // FIREWALL : L'article est toujours obligatoire
  if (!articleId || isNaN(articleId)) {
    return []
  }

  const client = await pool.connect()
  try {
    // 1. LA REQUÊTE AVEC JOINTURE
    // On récupère le S/N (a.serial_number) ET le nom du site (s.name)
    let sql = `
      SELECT 
        a.serial_number,
        s.name as site_name
      FROM article_serials a
      LEFT JOIN sites s ON a.site_id = s.id
      WHERE a.article_id = $1 
        AND (a.status IS NULL OR a.status != 'SOLD')
    `
    const params: any[] = [articleId]

    // 2. FILTRAGE DYNAMIQUE (Si on est sur la page des Stocks)
    if (siteId && !isNaN(siteId)) {
      sql += ` AND a.site_id = $2`
      params.push(siteId)
    }

    const { rows } = await client.query(sql, params)
    
    // Le serveur renverra un tableau d'objets : [{ serial_number: "cccc", site_name: "Camionnette A" }, ...]
    return rows
  } catch (error) {
    console.error("Erreur récupération S/N :", error)
    return []
  } finally {
    client.release()
  }
})