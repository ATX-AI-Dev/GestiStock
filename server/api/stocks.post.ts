import pkg from 'pg'
const { Pool } = pkg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = await pool.connect()
  let inTransaction = false

  try {
    // 1. EXTRACTION ROBUSTE (Gère les objets Nuxt UI ou les valeurs directes)
    const extractVal = (val: any) => typeof val === 'object' && val !== null ? (val.value || val.id) : val;
    const extractId = (val: any) => typeof val === 'object' && val !== null ? (val.id || val.value) : val;

    const type = extractVal(body.type)
    const artId = Number(extractId(body.article_id))
    const fromId = body.from_site_id ? Number(extractId(body.from_site_id)) : null
    const toId = body.to_site_id ? Number(extractId(body.to_site_id)) : null

    // Validation
    if (!type) throw createError({ statusCode: 400, statusMessage: "Le type d'opération est requis." })
    if (!artId || isNaN(artId)) throw createError({ statusCode: 400, statusMessage: "L'article est obligatoire." })
    if (type === 'IN' && !toId) throw createError({ statusCode: 400, statusMessage: "Le site de destination est requis." })
    if (type === 'OUT' && !fromId) throw createError({ statusCode: 400, statusMessage: "Le site d'origine est requis." })
    if (type === 'TRANSFER' && (!fromId || !toId)) throw createError({ statusCode: 400, statusMessage: "Les sites sont requis pour un transfert." })

    // 2. RÉCUPÉRATION DES S/N
    const rawSerials = body.serials || []
    let serials: string[] = []

    if (Array.isArray(rawSerials)) {
      serials = rawSerials.map(s => typeof s === 'object' ? (s.text || s.value || s.serial_number || s) : s)
    } else if (typeof rawSerials === 'object') {
      serials = Object.values(rawSerials).map((s: any) => typeof s === 'object' ? (s.text || s.value || s.serial_number || s) : s)
    }

    const hasSerials = serials.length > 0
    const qty = hasSerials ? serials.length : (Number(body.quantity) || 1)

    // --- FIREWALL ANTI-DOUBLONS ---
    if (type === 'IN' && hasSerials) {
      const checkDuplicates = await client.query(`
        SELECT serial_number 
        FROM article_serials 
        WHERE serial_number = ANY($1::text[])
      `, [serials])

      if (checkDuplicates.rows.length > 0) {
        const duplicates = checkDuplicates.rows.map(row => row.serial_number).join(', ')
        throw createError({ statusCode: 409, statusMessage: `Conflit : Ces S/N existent déjà (${duplicates}).` })
      }
    }

    // DÉBUT DE LA TRANSACTION UNIQUE
    await client.query('BEGIN')
    inTransaction = true

    // 3. MISE À JOUR DU STOCK PHYSIQUE GLOBAL
    if (type === 'IN' || type === 'TRANSFER') {
      await client.query(`
        INSERT INTO site_article_stocks (site_id, article_id, quantity) VALUES ($1, $2, $3)
        ON CONFLICT (site_id, article_id) DO UPDATE SET quantity = site_article_stocks.quantity + $3
      `, [toId, artId, qty])
    }
    
    if (type === 'OUT' || type === 'TRANSFER') {
      await client.query(`
        UPDATE site_article_stocks SET quantity = quantity - $3
        WHERE site_id = $1 AND article_id = $2
      `, [fromId, artId, qty])
    }

    // 4. GESTION DES NUMÉROS DE SÉRIE ET HISTORIQUE
    const purchaseDate = body.purchase_date ? new Date(body.purchase_date).toISOString() : new Date().toISOString()

    if (hasSerials) {
      for (const sn of serials) {
        let effectivePrice = Number(body.purchase_price) || 0

        if (type === 'IN') {
          await client.query(`
            INSERT INTO article_serials (article_id, site_id, serial_number, purchase_price) 
            VALUES ($1, $2, $3, $4)
          `, [artId, toId, sn, effectivePrice])
          
        } else if (type === 'OUT') {
          const snData = await client.query("SELECT purchase_price FROM article_serials WHERE serial_number = $1 LIMIT 1", [sn])
          if (snData.rows.length > 0) effectivePrice = snData.rows.purchase_price
          
          await client.query("UPDATE article_serials SET status = 'SOLD', site_id = NULL WHERE serial_number = $1", [sn])
          
        } else if (type === 'TRANSFER') {
          const snData = await client.query("SELECT purchase_price FROM article_serials WHERE serial_number = $1 LIMIT 1", [sn])
          if (snData.rows.length > 0) effectivePrice = snData.rows.purchase_price
          
          await client.query("UPDATE article_serials SET site_id = $1 WHERE serial_number = $2", [toId, sn])
        }

        await client.query(`
          INSERT INTO stock_history (article_id, from_site_id, to_site_id, type, quantity, purchase_price, sale_price, purchase_date, serial_number)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [artId, fromId, toId, type, 1, effectivePrice, Number(body.sale_price) || null, purchaseDate, sn])
      }

    } else {
      await client.query(`
        INSERT INTO stock_history (article_id, from_site_id, to_site_id, type, quantity, purchase_price, sale_price, purchase_date, serial_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)
      `, [artId, fromId, toId, type, qty, Number(body.purchase_price) || 0, Number(body.sale_price) || null, purchaseDate])
    }

    await client.query('COMMIT')
    inTransaction = false
    return { success: true }

  } catch (e: any) {
    if (inTransaction) await client.query('ROLLBACK')
    console.error("ERREUR SERVEUR STOCKS:", e.message)
    throw createError({ 
      statusCode: e.statusCode || 500, 
      statusMessage: e.message || "Erreur interne du serveur lors de la transaction SQL." 
    })
  } finally {
    client.release()
  }
})