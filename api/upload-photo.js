// api/upload-photo.js — Vercel Blob Storage
// Guarda fotos en el servidor, accesibles desde cualquier dispositivo
//
// SETUP REQUERIDO (una vez):
// 1. Vercel Dashboard → tu proyecto → pestaña "Storage"
// 2. "Create Database" → elige "Blob" → "Create & Connect"
// 3. Vercel añade BLOB_READ_WRITE_TOKEN automáticamente

import { put, del, list } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — listar todas las fotos guardadas
  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: 'orc-boats/' });
      return res.json({ photos: blobs.map(b => ({ url: b.url, pathname: b.pathname })) });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST — subir una foto
  if (req.method === 'POST') {
    try {
      const { base64, sailNo, type } = req.body; // type: "beat" | "run"
      if (!base64 || !sailNo) return res.status(400).json({ error: 'base64 and sailNo required' });

      // Convertir base64 a buffer
      const imageData = base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(imageData, 'base64');
      const filename = `orc-boats/${sailNo.replace(/[^A-Z0-9]/gi, '')}-${type}.jpg`;

      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false, // mismo nombre = sobreescribe
      });

      return res.json({ url: blob.url, sailNo, type });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE — borrar una foto
  if (req.method === 'DELETE') {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: 'url required' });
      await del(url);
      return res.json({ deleted: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
