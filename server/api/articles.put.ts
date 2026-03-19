import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = await pool.connect()
  
  try {
    if (!body.id) throw createError({ statusCode: 400, statusMessage: "ID manquant" })
    await client.query('BEGIN')

    const getOrCreateRef = async (tableName: string, value: any) => {
      if (!value) return null
      if (typeof value === 'object' && value.id) return value.id
      const valStr = typeof value === 'object' ? value.name : String(value)
      const res = await client.query(`
        INSERT INTO ${tableName} (name) VALUES ($1) 
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id
      `, [valStr.trim()])
      return res.rows[0].id
    }

    const catId = await getOrCreateRef('categories', body.category)
    const brandId = await getOrCreateRef('brands', body.brand)
    const suppId = await getOrCreateRef('suppliers', body.supplier)

    let deviceType = 'Desktop'
    const catName = typeof body.category === 'object' ? body.category.name : String(body.category)
    if (['PC portable', 'PC tablette'].includes(catName)) deviceType = 'Mobile'
    if (['Serveur'].includes(catName)) deviceType = 'Server'

    const finalSpecs = { ...(body.specs || {}) }
    
    // --- HARMONISATION CPU ---
    if (finalSpecs.cpu_brand && finalSpecs.cpu_family) {
      const famName = typeof finalSpecs.cpu_family === 'object' ? finalSpecs.cpu_family.name : String(finalSpecs.cpu_family)
      const modName = finalSpecs.cpu_model ? (typeof finalSpecs.cpu_model === 'object' ? finalSpecs.cpu_model.name : String(finalSpecs.cpu_model)) : null
      finalSpecs.cpu_family = famName
      if (modName) finalSpecs.cpu_model = modName

      await client.query(`INSERT INTO cpu_ranges (brand, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [finalSpecs.cpu_brand, famName.trim()])
      if (modName) {
        await client.query(`INSERT INTO cpu_models (family_name, name, device_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [famName.trim(), modName.trim(), deviceType])
      }
    }

    const query = `
      UPDATE articles 
      SET code_article = $1, label = $2, has_serial_number = $3, 
          category_id = $4, brand_id = $5, supplier_id = $6, specs = $7
      WHERE id = $8 RETURNING *;
    `
    const result = await client.query(query, [
      body.code_article, body.label, body.has_serial_number || false, 
      catId, brandId, suppId, JSON.stringify(finalSpecs), body.id
    ])
    
    await client.query('COMMIT')
    return result.rows[0]
  } catch (error: any) {
    await client.query('ROLLBACK')
    throw createError({ statusCode: 500, statusMessage: error.message })
  } finally {
    client.release()
  }
})