import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const method = event.method
  const query = getQuery(event)
  const body = await readBody(event).catch(() => ({}))
  const client = await pool.connect()

  const allowedTables = [
    'categories', 'brands', 'suppliers', 'cpu_brands', 'cpu_ranges', 
    'cpu_models', 'gpu_brands', 'gpu_ranges', 'gpu_models', 
    'os_list', 'ram_types', 'storage_types'
  ]

  const table = query.table as string
  if (!table || !allowedTables.includes(table)) {
    client.release()
    throw createError({ statusCode: 400, message: 'Table non autorisée' })
  }

  try {
    // ==========================================
    // 1. LECTURE (GET)
    // ==========================================
    if (method === 'GET') {
      const res = await client.query(`SELECT * FROM ${table} ORDER BY name ASC`)
      return res.rows
    }

    // ==========================================
    // 2. CRÉATION (POST)
    // ==========================================
    if (method === 'POST') {
      const { name, brand_id, range_id, device_type, has_gpu, is_computer } = body
      let res;
      
      if (table === 'categories') {
        res = await client.query(
          `INSERT INTO categories (name, has_gpu, is_computer) VALUES ($1, $2, $3) RETURNING *`, 
          [name, has_gpu || false, is_computer || false]
        )
      } else if (range_id) {
        res = await client.query(
          `INSERT INTO ${table} (name, range_id, device_type) VALUES ($1, $2, $3) RETURNING *`, 
          [name, range_id, device_type]
        )
      } else if (brand_id) {
        res = await client.query(
          `INSERT INTO ${table} (name, brand_id) VALUES ($1, $2) RETURNING *`, 
          [name, brand_id]
        )
      } else {
        res = await client.query(
          `INSERT INTO ${table} (name) VALUES ($1) RETURNING *`, 
          [name]
        )
      }
      return res.rows
    }

    // ==========================================
    // 3. MODIFICATION (PUT)
    // ==========================================
    if (method === 'PUT') {
      const { id, name, brand_id, range_id, device_type, has_gpu, is_computer } = body
      if (!id) throw new Error("ID manquant pour la mise à jour")
      
      let res;
      if (table === 'categories') {
        res = await client.query(
          `UPDATE categories SET name = $1, has_gpu = $2, is_computer = $3 WHERE id = $4 RETURNING *`, 
          [name, has_gpu || false, is_computer || false, id]
        )
      } else if (range_id) {
        res = await client.query(
          `UPDATE ${table} SET name = $1, range_id = $2, device_type = $3 WHERE id = $4 RETURNING *`, 
          [name, range_id, device_type, id]
        )
      } else if (brand_id) {
        res = await client.query(
          `UPDATE ${table} SET name = $1, brand_id = $2 WHERE id = $3 RETURNING *`, 
          [name, brand_id, id]
        )
      } else {
        res = await client.query(
          `UPDATE ${table} SET name = $1 WHERE id = $2 RETURNING *`, 
          [name, id]
        )
      }
      return res.rows
    }

    // ==========================================
    // 4. SUPPRESSION (DELETE)
    // ==========================================
    if (method === 'DELETE') {
      await client.query(`DELETE FROM ${table} WHERE id = $1`, [query.id])
      return { success: true }
    }

  } catch (err: any) {
    console.error(`❌ Erreur SQL [${table}]:`, err.message)
    throw createError({ statusCode: 500, statusMessage: err.message })
  } finally {
    client.release()
  }
})