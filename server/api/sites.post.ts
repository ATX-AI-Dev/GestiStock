// server/api/sites.post.ts
import pkg from 'pg'
const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export default defineEventHandler(async (event) => {
  // 1. On intercepte le "Payload" envoyé par le navigateur
  const body = await readBody(event)

  try {
    const client = await pool.connect()
    
    // 2. REQUÊTE PARAMÉTRÉE (Sécurité absolue)
    // Au lieu de concaténer la string (danger!), on utilise $1, $2, $3.
    // Le pilote 'pg' va nettoyer (sanitize) les données avant de les insérer.
    const query = `
      INSERT INTO sites (name, description, is_active) 
      VALUES ($1, $2, $3) 
      RETURNING *;
    `
    // On mappe nos variables sur les $1, $2, $3
    const values = [body.name, body.description, body.is_active]
    
    // On exécute l'insertion
    const result = await client.query(query, values)
    client.release()
    
    // On renvoie la ligne fraîchement créée au frontend
    return result.rows[0]

  } catch (error: any) {
    console.error("Erreur Insertion Site:", error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Impossible de créer le site de stockage.'
    })
  }
})