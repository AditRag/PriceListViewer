import { catalogueBucket } from './supabase.js';

export const compactNumericText = (value = '') => value.replace(/\s+/g, '');
export function matchesSearch(item, query) {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return tokens.every(token => /^\d+$/.test(token) ? (item.compact_search_text || '').includes(token) : (item.search_text || '').includes(token));
}
export function toCatalogue(row, client) {
  const { data } = client.storage.from(catalogueBucket).getPublicUrl(row.storage_path);
  return { id: row.id, company: row.company, category: row.category, year: row.year, title: row.title, description: row.description, originalName: row.original_name, fileName: row.storage_path, fileUrl: data.publicUrl, size: row.size_bytes, pages: row.pages, uploadedAt: row.uploaded_at, isSample: false };
}
