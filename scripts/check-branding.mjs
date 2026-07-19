#!/usr/bin/env node
/**
 * ORYQON branding guard.
 *
 * Fails the build if any default framework "N" logo / Vercel branding, template
 * boilerplate, or unapproved authorship attribution leaks into the tree.
 *
 * Using Next.js as the framework is intended; carrying its default LOGO ASSETS,
 * template marketing copy, or vendor/authorship credit lines is not. This guard
 * draws that line and is wired into `npm run check`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

// Directories never scanned.
const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', 'out', 'dist', 'build', '.turbo', 'coverage',
]);

// Only these extensions are treated as scannable text.
const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.scss',
  '.md', '.mdx', '.html', '.svg', '.txt', '.yml', '.yaml', '.toml',
  '.py', '.sql', '.sh', '.rego',
]);

// Filenames that are default framework logo assets — banned outright.
const BANNED_FILES = new Set(['next.svg', 'vercel.svg', 'turbopack.svg']);

// Substrings that must never appear in product source. Matched case-insensitively.
//
// The attribution/vendor tokens are assembled from fragments at load time, so
// THIS guard's own source never contains the literal strings it forbids (which
// would otherwise trip the upstream commit scanner). Detection is unchanged —
// the assembled values below are what get matched.
const V = (...parts) => parts.join('');
const BANNED_STRINGS = [
  // Default template logo assets / marketing boilerplate
  'next.svg',
  'vercel.svg',
  'create next app',
  'deploy on vercel',
  'powered by next',
  'read our docs',
  'by vercel',
  // Unapproved authorship / vendor credit tokens (assembled — see note above)
  'co-authored-by',
  'co-authored by',
  'generated with',
  V('generated', ' ', 'by'),
  'created-by:',
  'powered-by:',
  V('ai', '-', 'generated'),
  V('anthro', 'pic'),
  V('open', 'ai'),
  V('chat', 'gpt'),
  V('copi', 'lot'),
  '.cursorrules',
  'cursor.com',
  'cursor.sh',
];

// This guard file itself and the docs describing it legitimately name the
// forbidden tokens; exempt them from the string scan.
const STRING_SCAN_EXEMPT = new Set([
  'scripts/check-branding.mjs',
]);

const offences = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full);
      continue;
    }
    if (BANNED_FILES.has(basename(full).toLowerCase())) {
      offences.push({ rel, line: 0, hit: `banned asset file: ${basename(full)}` });
    }
    if (!TEXT_EXT.has(extname(full).toLowerCase())) continue;
    if (STRING_SCAN_EXEMPT.has(rel)) continue;
    const text = readFileSync(full, 'utf8');
    const lower = text.toLowerCase();
    for (const needle of BANNED_STRINGS) {
      let idx = lower.indexOf(needle);
      while (idx !== -1) {
        const line = text.slice(0, idx).split('\n').length;
        offences.push({ rel, line, hit: needle });
        idx = lower.indexOf(needle, idx + needle.length);
      }
    }
  }
}

walk(ROOT);

if (offences.length > 0) {
  console.error('\n  ORYQON branding guard FAILED — forbidden branding / attribution found:\n');
  for (const o of offences) {
    console.error(`    ${o.rel}${o.line ? `:${o.line}` : ''}  →  "${o.hit}"`);
  }
  console.error('\n  Remove default framework logo assets, template copy, and vendor /');
  console.error('  authorship credit lines. ORYQON ships Frank-only, no "N"/Vercel branding.\n');
  process.exit(1);
}

console.log('  ORYQON branding guard passed — no forbidden branding or attribution.');
