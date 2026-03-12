/**
 * Ejecutar después de migración 0028 (tablas renombradas).
 * node scripts/patch-engagement-models.js
 * Reemplaza PermanentFile* por Engagement* en rutas y helpers que aún apunten al modelo viejo.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const replacements = [
  [/PermanentFileTemplateSection/g, 'EngagementFileTemplateSection'],
  [/PermanentFileTemplateItem/g, 'EngagementFileTemplateItem'],
  [/PermanentFileSection/g, 'EngagementFileSection'],
  [/findPermanentFileRoot/g, 'findEngagementFileRoot'],
  [/projects\.permanentFile\.manage/g, 'projects.engagementFile.manage'],
  [/projects\.permanentFile\./g, 'projects.engagementFile.'],
  [/'permanentFile\./g, "'engagementFile."]
];

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name === '.git') continue;
      walk(p);
    } else if (name.name.endsWith('.js')) {
      let s = fs.readFileSync(p, 'utf8');
      const orig = s;
      for (const [re, to] of replacements) s = s.replace(re, to);
      if (s !== orig) {
        fs.writeFileSync(p, s);
        console.log('patched', p);
      }
    }
  }
}

walk(path.join(root, 'app'));
walk(path.join(root, 'helpers'));
console.log('done');
