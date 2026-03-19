import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  try {
    const client = await pool.connect()
    await client.query('DELETE FROM articles WHERE id = $1', [body.id])
    client.release()
    return { success: true }
  } catch (error: any) {
    // Si l'article est utilisé dans les stocks ou l'historique, Postgres bloquera
    throw createError({ statusCode: 400, statusMessage: 'Impossible : cet article est lié à des stocks ou un historique.' })
  }
})