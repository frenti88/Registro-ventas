/**
 * Vercel Serverless Function - Proxy Seguro a Supabase PostgreSQL
 * Mantiene SUPABASE_URL y SUPABASE_KEY (o SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY)
 * 100% ocultos en las variables de entorno del servidor de Vercel.
 * El navegador (index.html, DevTools, localStorage y GitHub) nunca recibe ni expone el token.
 */

const ALLOWED_TABLES = new Set([
  'vendedores',
  'comercios',
  'productos',
  'comercio_productos',
  'visitas_ventas',
  'registros_ventas',
  'backups_ventas'
]);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Prefer');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({
      error: 'Variables de entorno SUPABASE_URL / SUPABASE_KEY no configuradas en el servidor.'
    });
  }

  try {
    const table = String(req.query.table || '').trim();

    // Endpoint de verificación de salud sin exponer credenciales
    if (!table || table === 'health') {
      const checkRes = await fetch(
        `${supabaseUrl}/rest/v1/registros_ventas?select=registro_id`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
          }
        }
      );
      if (!checkRes.ok) {
        const errText = await checkRes.text();
        return res.status(checkRes.status).json({ status: 'error', detail: errText });
      }
      const rows = await checkRes.json();
      return res.status(200).json({
        status: 'connected',
        secureProxy: true,
        totalRegistros: Array.isArray(rows) ? rows.length : 0
      });
    }

    if (!ALLOWED_TABLES.has(table)) {
      return res.status(400).json({ error: `Tabla no permitida: ${table}` });
    }

    // Construir query string limpia hacia PostgREST
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query || {})) {
      if (k === 'table') continue;
      if (Array.isArray(v)) {
        v.forEach(val => params.append(k, val));
      } else if (v !== undefined) {
        params.append(k, String(v));
      }
    }

    const qs = params.toString();
    const targetUrl = `${supabaseUrl}/rest/v1/${table}${qs ? `?${qs}` : ''}`;
    const preferHeader =
      req.headers['prefer'] ||
      (req.method === 'DELETE'
        ? 'return=minimal'
        : 'resolution=merge-duplicates,return=minimal');

    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: preferHeader
    };

    const fetchOptions = {
      method: req.method,
      headers
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
      fetchOptions.body =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const upstream = await fetch(targetUrl, fetchOptions);
    const text = await upstream.text();

    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);
    return res.send(text || JSON.stringify({ ok: upstream.ok }));
  } catch (err) {
    return res.status(500).json({
      error: 'Error interno en el proxy de Supabase',
      message: err.message || String(err)
    });
  }
};
