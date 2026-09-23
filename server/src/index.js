import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdf from 'pdf-parse';
import crypto from 'node:crypto';
import path from 'node:path';
import { catalogueBucket, supabaseForRequest } from './services/supabase.js';
import { compactNumericText, matchesSearch, toCatalogue } from './services/catalogueRepository.js';

dotenv.config({ path: new URL('../../.env', import.meta.url) });
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 20 }, fileFilter: (_, file, callback) => callback(null, file.mimetype === 'application/pdf') });
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }));
app.use(express.json());

const fail = (response, error, fallback = 'Request could not be completed.') => response.status(error?.code === '23505' ? 409 : 500).json({ error: error?.message || fallback });
const requireAdmin = async (request, response) => {
  const client = supabaseForRequest(request); const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) { response.status(401).json({ error: 'Admin sign-in is required.' }); return null; }
  const { data: profile, error } = await client.from('profiles').select('role').eq('id', user.id).single();
  if (error || profile?.role !== 'admin') { response.status(403).json({ error: 'Admin access is required.' }); return null; }
  return { client, user };
};

app.get('/api/catalogues', async (request, response) => {
  const client = supabaseForRequest(request); const { q = '', company = '', category = '', year = '' } = request.query;
  let query = client.from('catalogues').select('*').order('uploaded_at', { ascending: false });
  if (company) query = query.eq('company', company); if (category) query = query.eq('category', category); if (year) query = query.eq('year', Number(year));
  const { data, error } = await query; if (error) return fail(response, error);
  response.json(data.filter(row => matchesSearch(row, q)).map(row => toCatalogue(row, client)));
});
app.get('/api/catalogues/filters', async (request, response) => {
  const client = supabaseForRequest(request); const { data, error } = await client.from('catalogues').select('company, category, year'); if (error) return fail(response, error);
  const values = (key) => [...new Set(data.map(row => row[key]).filter(Boolean))].sort(); response.json({ companies: values('company'), categories: values('category'), years: values('year').sort((a, b) => b - a) });
});
app.post('/api/catalogues/upload', upload.array('files', 20), async (request, response) => {
  const access = await requireAdmin(request, response); if (!access) return;
  const { company, category, year, title = '', description = '' } = request.body;
  if (!company || !category || !year || !request.files?.length) return response.status(400).json({ error: 'Company, category, year and at least one PDF are required.' });
  try {
    const created = [];
    for (const file of request.files) {
      let extracted = '', pages = null; try { const parsed = await pdf(file.buffer); extracted = parsed.text || ''; pages = parsed.numpages; } catch { /* Keep upload available even if its text cannot be extracted. */ }
      const documentTitle = (title || file.originalname.replace(/\.pdf$/i, '')).trim(); const storagePath = `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase() || '.pdf'}`;
      const { error: uploadError } = await access.client.storage.from(catalogueBucket).upload(storagePath, file.buffer, { contentType: 'application/pdf', upsert: false }); if (uploadError) throw uploadError;
      const searchText = `${company} ${category} ${year} ${documentTitle} ${description} ${extracted}`.toLowerCase();
      const { data, error } = await access.client.from('catalogues').insert({ company: company.trim(), category: category.trim(), year: Number(year), title: documentTitle, description: description.trim(), original_name: file.originalname, storage_path: storagePath, size_bytes: file.size, pages, search_text: searchText, compact_search_text: compactNumericText(searchText), uploaded_by: access.user.id }).select().single();
      if (error) { await access.client.storage.from(catalogueBucket).remove([storagePath]); throw error; } created.push(toCatalogue(data, access.client));
    }
    response.status(201).json(created);
  } catch (error) { fail(response, error, 'Could not process the upload.'); }
});
app.delete('/api/catalogues/:id', async (request, response) => {
  const access = await requireAdmin(request, response); if (!access) return;
  const { data: item, error: lookupError } = await access.client.from('catalogues').select('storage_path').eq('id', request.params.id).single(); if (lookupError) return response.sendStatus(404);
  const { error: deleteError } = await access.client.from('catalogues').delete().eq('id', request.params.id); if (deleteError) return fail(response, deleteError);
  const { error: storageError } = await access.client.storage.from(catalogueBucket).remove([item.storage_path]); if (storageError) console.error('Storage cleanup failed:', storageError.message);
  response.sendStatus(204);
});
app.get('/api/catalogues/export.csv', async (request, response) => {
  const client = supabaseForRequest(request); const { data, error } = await client.from('catalogues').select('*').order('uploaded_at', { ascending: false }); if (error) return fail(response, error);
  const esc = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`; const csv = [['Title', 'Company', 'Category', 'Year', 'File name', 'Pages', 'Upload date'], ...data.filter(row => matchesSearch(row, request.query.q || '')).map(row => [row.title, row.company, row.category, row.year, row.original_name, row.pages, row.uploaded_at])].map(row => row.map(esc).join(',')).join('\n'); response.type('text/csv').attachment('catalogue-search.csv').send(csv);
});
app.use((error, _, response, __) => { console.error(error); response.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 500).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Each PDF must be 50 MB or smaller.' : 'Could not process the request.' }); });
app.listen(process.env.PORT || 4000, () => console.log(`Catalogue API listening on ${process.env.PORT || 4000}`));
