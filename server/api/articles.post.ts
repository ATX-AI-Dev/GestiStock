import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')

    const getOrCreateRef = async (tableName: string, value: any) => {
      if (!value) return null
      if (typeof value === 'object' && value.id) return value.id
      const valStr = typeof value === 'object' ? value.name : String(value)
      
      // On tente de récupérer l'ID existant, ou on crée une nouvelle entrée basique
      const exist = await client.query(`SELECT id FROM ${tableName} WHERE name = $1`, [valStr.trim()])
      if (exist.rows.length > 0) return exist.rows.id
      
      const res = await client.query(`
        INSERT INTO ${tableName} (name) VALUES ($1) 
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id
      `, [valStr.trim()])
      return res.rows.id
    }

    const catId = await getOrCreateRef('categories', body.category)
    const brandId = await getOrCreateRef('brands', body.brand)
    const suppId = await getOrCreateRef('suppliers', body.supplier)

    // Les spécifications sont directement stockées dans le JSON
    const finalSpecs = { ...(body.specs || {}) }

    const query = `
      INSERT INTO articles (code_article, label, has_serial_number, category_id, brand_id, supplier_id, specs) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `
    const result = await client.query(query, [
      body.code_article, body.label, body.has_serial_number || false, 
      catId, brandId, suppId, JSON.stringify(finalSpecs)
    ])
    
    await client.query('COMMIT')
    return result.rows
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error("ERREUR POST ARTICLE:", error.message)
    throw createError({ statusCode: 500, statusMessage: error.message })
  } finally {
    client.release()
  }
})