// Checks that every language has the same texts as English: the same keys, the
// plural forms its language needs, and the same {{placeholders}} and <tags>.
// Run by `npm run lint`.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n', 'locales');
const PLURAL = /_(zero|one|two|few|many|other)$/;
const languages = readdirSync(root).filter((l) => l !== 'en');
const namespaces = readdirSync(join(root, 'en')).map((f) => f.replace(/\.json$/, ''));

function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out.set(key, String(v));
  }
  return out;
}

/** base key -> { forms: Set, text: any form's text } */
function group(flat) {
  const out = new Map();
  for (const [key, text] of flat) {
    const m = PLURAL.exec(key);
    const base = m ? key.slice(0, -m[0].length) : key;
    const entry = out.get(base) ?? { forms: new Set(), text };
    entry.forms.add(m ? m[1] : '');
    out.set(base, entry);
  }
  return out;
}

const tokens = (text) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}|<\/?(\w+)\s*\/?>/g)].map((m) => m[1] ?? `<${m[2]}>`).sort().join(',');

const errors = [];
for (const lang of languages) {
  const needed = new Set(new Intl.PluralRules(lang).resolvedOptions().pluralCategories);
  for (const ns of namespaces) {
    let data;
    try {
      data = JSON.parse(readFileSync(join(root, lang, `${ns}.json`), 'utf8'));
    } catch (e) {
      errors.push(`${lang}/${ns}.json: ${e.message}`);
      continue;
    }
    const en = group(flatten(JSON.parse(readFileSync(join(root, 'en', `${ns}.json`), 'utf8'))));
    const tr = group(flatten(data));
    for (const [base, { forms, text }] of en) {
      const t = tr.get(base);
      if (!t) {
        errors.push(`${lang}/${ns}: missing "${base}"`);
        continue;
      }
      if (!forms.has('')) {
        const missing = [...needed].filter((f) => !t.forms.has(f));
        if (missing.length) errors.push(`${lang}/${ns}: "${base}" needs plural forms ${missing.map((f) => `_${f}`).join(', ')}`);
      }
      if (tokens(t.text) !== tokens(text)) {
        // {{count}} may be omitted in a form ("один кубер"), so compare ignoring it.
        const strip = (s) => s.split(',').filter((x) => x && x !== 'count').join(',');
        if (strip(tokens(t.text)) !== strip(tokens(text))) {
          errors.push(`${lang}/${ns}: "${base}" placeholders/tags differ from English: [${tokens(t.text)}] vs [${tokens(text)}]`);
        }
      }
    }
    for (const base of tr.keys()) if (!en.has(base)) errors.push(`${lang}/${ns}: extra key "${base}"`);
  }
}

if (errors.length) {
  console.error(`Locale check failed (${errors.length}):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`Locales OK: ${languages.join(', ')} × ${namespaces.length} namespaces`);
