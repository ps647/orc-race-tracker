// Vercel Serverless Function — api/orc-cert.js
// Proxy hacia la API pública de ORC para evitar CORS desde el navegador.
//
// Uso desde la app:
//   GET /api/orc-cert?sailNo=ESP-52801&ext=json
//   GET /api/orc-cert?refNo=03510004RH9&ext=json
//   GET /api/orc-cert?yachtName=URBANIA&country=ESP&ext=json
//
// Devuelve el JSON tal como llega de ORC. Si ORC devuelve texto plano
// (formato RMS) lo devolvemos como string en `{ raw: "..." }`.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed (usa GET)' });

  // Construimos la URL hacia ORC con los parámetros que vengan
  const q = req.query || {};
  const params = new URLSearchParams({ action: 'DownBoatRMS' });
  if (q.sailNo)     params.set('SailNo',     String(q.sailNo));
  if (q.refNo)      params.set('RefNo',      String(q.refNo));
  if (q.yachtName)  params.set('YachtName',  String(q.yachtName));
  if (q.country)    params.set('CountryId',  String(q.country));
  if (q.family)     params.set('Family',     String(q.family));
  if (q.ext)        params.set('ext',        String(q.ext));
  else              params.set('ext',        'json');

  const url = `https://data.orc.org/public/WPub.dll?${params.toString()}`;

  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'orc-race-tracker/1.0 (https://orc-race-tracker.vercel.app)',
        'Accept': 'application/json, text/plain, */*',
      },
    });

    if (!r.ok) {
      return res.status(r.status).json({
        error: `ORC API respondió ${r.status} ${r.statusText}`,
        url: url,
      });
    }

    const contentType = r.headers.get('content-type') || '';
    const text = await r.text();

    // Si vino JSON, lo parseamos y reenviamos tal cual
    if (contentType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const json = JSON.parse(text);
        return res.status(200).json(json);
      } catch (e) {
        // No es JSON válido, lo enviamos como raw
      }
    }

    // Si no es JSON (formato RMS de ORC), devolvemos el texto crudo para
    // que el cliente lo parsee. Útil para debug.
    return res.status(200).json({
      raw: text,
      contentType: contentType,
      url: url,
      note: 'ORC devolvió un formato no-JSON. Inspecciona "raw" para entender la estructura.',
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Fallo al consultar la API de ORC: ' + err.message,
      url: url,
    });
  }
}
