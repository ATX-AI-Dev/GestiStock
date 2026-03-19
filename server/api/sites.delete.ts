// server/api/sites.delete.ts
import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.id) {
    throw createError({ statusCode: 400, statusMessage: 'ID du site manquant.' })
  }

  try {
    const client = await pool.connect()
    
    const query = 'DELETE FROM sites WHERE id = $1 RETURNING *;'
    const result = await client.query(query, [body.id])
    
    client.release()
    return { success: true, deleted: result.rows[0] }

  } catch (error: any) {
    console.error("Erreur Suppression Site:", error.message)
    
    // Code 23503 = Foreign Key Violation dans PostgreSQL
    if (error.code === '23503') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Impossible : Ce site contient encore du matériel en stock !'
      })
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Erreur lors de la suppression du site.'
    })
  }
})