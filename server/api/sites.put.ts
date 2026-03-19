// server/api/sites.put.ts
import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Sécurité basique : on vérifie qu'on nous a bien fourni un ID
  if (!body.id) {
    throw createError({ statusCode: 400, statusMessage: 'ID du site manquant.' })
  }

  try {
    const client = await pool.connect()
    
    // Requête paramétrée d'UPDATE
    const query = `
      UPDATE sites 
      SET name = $1, description = $2, is_active = $3 
      WHERE id = $4 
      RETURNING *;
    `
    const values = [body.name, body.description, body.is_active, body.id]
    
    const result = await client.query(query, values)
    client.release()
    
    return result.rows[0]

  } catch (error: any) {
    console.error("Erreur Modification Site:", error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Impossible de modifier le site de stockage.'
    })
  }
})