import { throwError } from './errors.js';
import { HTTP_STATUS } from '../config/constants.js';

/**
 * Valida y normaliza el mismo formato que `organizations/tree-template/update`:
 * array no vacío de { type, name }.
 * @returns {Array<{ type: string, name: string }>|null} null si input es null/undefined (sin cambiar en update)
 */
export function validateProjectTreeSnapshotInput(input) {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (!Array.isArray(input) || input.length === 0) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.projectTreeSnapshotInvalid');
  }
  const out = [];
  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (!item || typeof item !== 'object') {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.projectTreeSnapshotInvalid');
    }
    const type = typeof item.type === 'string' ? item.type.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!type || !name || name.length > 255) {
      throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.projectTreeSnapshotInvalid');
    }
    out.push({ type, name });
  }
  const hasEngagementRoot = out.some(
    r => r.type === 'engagement_file' || r.type === 'permanent_file'
  );
  if (!hasEngagementRoot) {
    throw throwError(HTTP_STATUS.BAD_REQUEST, 'permanentFile.projectTreeSnapshotMissingEngagementRoot');
  }
  return out;
}

/** Lee snapshot ya guardado (JSON en modelo). */
export function rootsFromStoredSnapshot(stored) {
  if (stored == null) return null;
  try {
    const raw = typeof stored === 'string' ? JSON.parse(stored) : stored;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const out = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') return null;
      const type = String(item.type || '').trim();
      const name = String(item.name || '').trim();
      if (!type || !name) return null;
      out.push({ type, name });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}
