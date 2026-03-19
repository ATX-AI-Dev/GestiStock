import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const client = await pool.connect()
  try {
    // On récupère simplement tous les sites par ordre alphabétique
    const query = 'SELECT * FROM sites ORDER BY name ASC'
    const result = await client.query(query)
    
    return result.rows
  } catch (e: any) {
    console.error("ERREUR GET SITES:", e.message)
    return [] // Anti-crash de la page
  } finally {
    client.release()
  }
})