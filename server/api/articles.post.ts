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

      await client.query(`
        INSERT INTO cpu_ranges (brand, name) VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [finalSpecs.cpu_brand, famName.trim()])

      if (modName) {
        await client.query(`
          INSERT INTO cpu_models (family_name, name, device_type) VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [famName.trim(), modName.trim(), deviceType])
      }
    }

    // --- HARMONISATION GPU ---
    if (finalSpecs.has_dedicated_gpu && finalSpecs.gpu_brand && finalSpecs.gpu_family) {
      const gpuFamName = typeof finalSpecs.gpu_family === 'object' ? finalSpecs.gpu_family.name : String(finalSpecs.gpu_family)
      const gpuModName = finalSpecs.gpu_model ? (typeof finalSpecs.gpu_model === 'object' ? finalSpecs.gpu_model.name : String(finalSpecs.gpu_model)) : null
      
      finalSpecs.gpu_family = gpuFamName
      if (gpuModName) finalSpecs.gpu_model = gpuModName

      await client.query(`
        INSERT INTO gpu_ranges (brand, name) VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [finalSpecs.gpu_brand, gpuFamName.trim()])

      if (gpuModName) {
        await client.query(`
          INSERT INTO gpu_models (family_name, name, device_type) VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [gpuFamName.trim(), gpuModName.trim(), deviceType])
      }
    }

    const query = `
      INSERT INTO articles (code_article, label, has_serial_number, category_id, brand_id, supplier_id, specs) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `
    const result = await client.query(query, [
      body.code_article, body.label, body.has_serial_number || false, 
      catId, brandId, suppId, JSON.stringify(finalSpecs)
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