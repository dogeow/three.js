#!/usr/bin/env node
// Parse the legacy index.html and extract all demo card metadata,
// then merge with filesystem directories (auto-register missing ones).

import { readFileSync, readdirSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '../..');
const HTML_PATH = path.join(ROOT, 'index.html');
const OUT_DIR = path.resolve(path.dirname(__filename), '../data');

const html = readFileSync(HTML_PATH, 'utf8');

// ---- Categories (tag-btn blocks) ----
const categories = [];
const tagBtnRe =
  /<button class="tag-btn" data-tag="([^"]+)" style="--tag-start:(#[0-9a-fA-F]+);--tag-end:(#[0-9a-fA-F]+)"[^>]*>[\s\S]*?<span class="tag-dot" style="background:(#[0-9a-fA-F]+)"><\/span>/g;
for (const m of html.matchAll(tagBtnRe)) {
  categories.push({ name: m[1], start: m[2], end: m[3], dot: m[4] });
}

// ---- Cards (<a class="card" ...>...</a>) ----
const cards = [];
// Match each card block. Cards use <a href="./xxx/" class="card" data-categories="..." data-name="...">...</a>
const cardRe =
  /<a href="\.\/([^"]+?)\/" class="card" data-categories="([^"]*)" data-name="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

for (const m of html.matchAll(cardRe)) {
  const slug = m[1];
  const categoriesCsv = m[2];
  const name = m[3];
  const inner = m[4];

  const titleMatch = inner.match(/<h3 class="card-title">([^<]+)<\/h3>/);
  const descMatch = inner.match(/<p class="card-desc">([^<]*)<\/p>/);
  const indexMatch = inner.match(/<span class="card-index"[^>]*>(\d+)<\/span>/);

  // Features list
  const features = [];
  const featRe = /<span class="feat-badge"[^>]*>([^<]+)<\/span>/g;
  for (const f of inner.matchAll(featRe)) features.push(f[1]);
  const extraMatch = inner.match(/<span class="feat-extra">\+(\d+)<\/span>/);
  const extraCount = extraMatch ? Number(extraMatch[1]) : 0;

  cards.push({
    slug,
    name,
    title: titleMatch ? titleMatch[1] : prettify(slug),
    desc: descMatch ? descMatch[1] : '',
    categories: categoriesCsv ? categoriesCsv.split(',').filter(Boolean) : [],
    index: indexMatch ? Number(indexMatch[1]) : null,
    features,
    extraCount,
  });
}

const registered = new Set(cards.map((c) => canonicalKey(c.slug)));

// ---- Merge with filesystem directories ----
const fsDirs = readdirSync(ROOT)
  .filter((f) => {
    if (f.startsWith('.') || f === 'node_modules' || f === 'next-app') return false;
    try {
      return statSync(path.join(ROOT, f)).isDirectory();
    } catch {
      return false;
    }
  })
  .sort();

const missing = fsDirs.filter((d) => !registered.has(canonicalKey(d)));
console.log(`Parsed: ${cards.length} cards, ${categories.length} categories`);
console.log(`FS dirs: ${fsDirs.length}, missing from HTML: ${missing.length}`);

// Auto-register missing dirs with sensible defaults
for (const dir of missing) {
  cards.push({
    slug: dir,
    name: dir,
    title: prettify(dir),
    desc: `自动收录的示例：${prettify(dir)}。`,
    categories: ['其他效果'],
    index: null,
    features: [],
    extraCount: 0,
    autoRegistered: true,
  });
}

// Sort: by first-prefix number if present, otherwise alphabetical
cards.sort((a, b) => {
  const na = parseLeadingNum(a.slug);
  const nb = parseLeadingNum(b.slug);
  if (na !== null && nb !== null) return na - nb;
  if (na !== null) return -1;
  if (nb !== null) return 1;
  return a.slug.localeCompare(b.slug);
});

// Recompute category counts
const categoryCount = new Map();
for (const c of cards) for (const cat of c.categories) categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
for (const cat of categories) cat.count = categoryCount.get(cat.name) || 0;
// Ensure "其他效果" exists
if (!categories.find((c) => c.name === '其他效果')) {
  categories.push({ name: '其他效果', start: '#94a3b8', end: '#64748b', dot: '#94a3b8', count: categoryCount.get('其他效果') || 0 });
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'demos.json'), JSON.stringify(cards, null, 2));
writeFileSync(path.join(OUT_DIR, 'categories.json'), JSON.stringify(categories, null, 2));

console.log(`Wrote ${cards.length} demos → data/demos.json`);
console.log(`Wrote ${categories.length} categories → data/categories.json`);
console.log(`Auto-registered ${missing.length} directories.`);

function prettify(slug) {
  return slug
    .replace(/^\d+-/, '')
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}
function parseLeadingNum(slug) {
  const m = slug.match(/^(\d+)-/);
  return m ? Number(m[1]) : null;
}
function canonicalKey(slug) {
  return slug.replace(/^\d+-/, '').trim().toLowerCase();
}
