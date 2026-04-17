export type Demo = {
  slug: string;
  name: string;
  title: string;
  desc: string;
  categories: string[];
  index: number | null;
  features: string[];
  extraCount: number;
  autoRegistered?: boolean;
};

export type Category = {
  name: string;
  start: string;
  end: string;
  dot: string;
  count: number;
};

import demosData from '@/data/demos.json';
import categoriesData from '@/data/categories.json';

function toCanonicalSlug(slug: string): string {
  return slug.replace(/^\d+-/, '').trim().toLowerCase();
}

function getDemoPriority(demo: Demo): number {
  let priority = 0;
  if (!demo.autoRegistered) priority += 10;
  if (demo.index !== null) priority += 5;
  if (demo.features.length > 0) priority += 1;
  return priority;
}

function compareDemos(a: Demo, b: Demo): number {
  const aIndex = a.index ?? Number.MAX_SAFE_INTEGER;
  const bIndex = b.index ?? Number.MAX_SAFE_INTEGER;

  if (aIndex !== bIndex) return aIndex - bIndex;
  if (!!a.autoRegistered !== !!b.autoRegistered) return Number(!!a.autoRegistered) - Number(!!b.autoRegistered);
  return a.slug.localeCompare(b.slug, 'zh-CN', { numeric: true, sensitivity: 'base' });
}

function normalizeDemos(source: Demo[]): Demo[] {
  const deduped = new Map<string, Demo>();

  for (const item of source) {
    const demo: Demo = {
      ...item,
      categories: [...item.categories],
      features: [...item.features],
    };
    const key = toCanonicalSlug(demo.slug);
    const existing = deduped.get(key);

    if (!existing || getDemoPriority(demo) > getDemoPriority(existing)) {
      deduped.set(key, demo);
    }
  }

  return Array.from(deduped.values()).sort(compareDemos);
}

function normalizeCategories(source: Category[], demoList: Demo[]): Category[] {
  const counts = new Map<string, number>();

  for (const demo of demoList) {
    for (const category of demo.categories) {
      counts.set(category, (counts.get(category) || 0) + 1);
    }
  }

  const next = source.map((category) => ({
    ...category,
    count: counts.get(category.name) || 0,
  }));

  if (!next.some((category) => category.name === '其他效果')) {
    next.push({
      name: '其他效果',
      start: '#94a3b8',
      end: '#64748b',
      dot: '#94a3b8',
      count: counts.get('其他效果') || 0,
    });
  }

  return next;
}

export const demos: Demo[] = normalizeDemos(demosData as Demo[]);
export const categories: Category[] = normalizeCategories(categoriesData as Category[], demos);
