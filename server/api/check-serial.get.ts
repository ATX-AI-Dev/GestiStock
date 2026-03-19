import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  // On récupère le S/N passé dans l'URL (ex: /api/check-serial?sn=12345)
  const query = getQuery(event)
  const sn = query.sn as string

  if (!sn) return false

  const client = await pool.connect()
  try {
    // Requête ultra-légère : on cherche juste 1 résultat correspondant
    const res = await client.query('SELECT 1 FROM article_serials WHERE serial_number = $1 LIMIT 1', [sn])
    
    // Retourne TRUE si le S/N existe déjà, FALSE sinon
    return res.rows.length > 0
  } catch (e) {
    console.error("Erreur vérification S/N :", e)
    throw createError({ statusCode: 500, statusMessage: "Erreur base de données" })
  } finally {
    client.release()
  }
})