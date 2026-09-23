import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const uploadDirectory = path.resolve('uploads');
export async function ensureUploadDirectory() { await fs.mkdir(uploadDirectory, { recursive: true }); }
export function savedFileName(originalName) {
  return `${Date.now()}-${crypto.randomUUID()}${path.extname(originalName).toLowerCase()}`;
}
export const uploadPath = (fileName) => path.join(uploadDirectory, fileName);
export async function removeFile(fileName) { if (fileName) await fs.rm(uploadPath(fileName), { force: true }); }
