import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async () => {
  const client = await pool.connect()
  try {
    // On charge les 12 tables séquentiellement
    const categories = await client.query("SELECT * FROM categories ORDER BY name ASC")
    const brands = await client.query("SELECT * FROM brands ORDER BY name ASC")
    const suppliers = await client.query("SELECT * FROM suppliers ORDER BY name ASC")
    
    const cpu_brands = await client.query("SELECT * FROM cpu_brands ORDER BY name ASC")
    const cpu_ranges = await client.query("SELECT * FROM cpu_ranges ORDER BY name ASC")
    const cpu_models = await client.query("SELECT * FROM cpu_models ORDER BY name ASC")
    
    const gpu_brands = await client.query("SELECT * FROM gpu_brands ORDER BY name ASC")
    const gpu_ranges = await client.query("SELECT * FROM gpu_ranges ORDER BY name ASC")
    const gpu_models = await client.query("SELECT * FROM gpu_models ORDER BY name ASC")
    
    const os_list = await client.query("SELECT * FROM os_list ORDER BY name ASC")
    const ram_types = await client.query("SELECT * FROM ram_types ORDER BY name ASC")
    const storage_types = await client.query("SELECT * FROM storage_types ORDER BY name ASC")

    return {
      categories: categories.rows,
      brands: brands.rows,
      suppliers: suppliers.rows,
      cpu_brands: cpu_brands.rows,
      cpu_ranges: cpu_ranges.rows,
      cpu_models: cpu_models.rows,
      gpu_brands: gpu_brands.rows,
      gpu_ranges: gpu_ranges.rows,
      gpu_models: gpu_models.rows,
      os_list: os_list.rows,
      ram_types: ram_types.rows,
      storage_types: storage_types.rows
    }
  } catch (error: any) {
    console.error("❌ Erreur API References:", error.message)
    throw createError({ statusCode: 500, statusMessage: error.message })
  } finally {
    client.release()
  }
})