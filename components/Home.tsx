'use client';

import { useMemo, useState, useCallback } from 'react';
import type { Demo, Category } from '@/lib/demos';
import PreviewModal from './PreviewModal';
import ThemeToggle from './ThemeToggle';

type Props = { demos: Demo[]; categories: Category[] };

export default function Home({ demos, categories }: Props) {
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openDemo, setOpenDemo] = useState<Demo | null>(null);

  const displayIndex = useMemo(() => {
    const m = new Map<string, number>();
    demos.forEach((demo, idx) => m.set(demo.slug, idx + 1));
    return m;
  }, [demos]);

  const catColor = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.name, c.dot);
    return m;
  }, [categories]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return demos.filter((d) => {
      if (activeCat && !d.categories.includes(activeCat)) return false;
      if (q) {
        const hay = (d.title + ' ' + d.desc + ' ' + d.slug + ' ' + d.features.join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [demos, activeCat, query]);

  const stats = useMemo(
    () => ({ total: demos.length, categories: categories.length, visible: visible.length }),
    [demos.length, categories.length, visible.length],
  );

  const handleOpen = useCallback((demo: Demo, e: React.MouseEvent) => {
    e.preventDefault();
    setOpenDemo(demo);
  }, []);

  return (
    <>
      <div className="container">
        <header className="header">
          <div className="header-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            Three.js 示例集合
            <ThemeToggle />
          </div>
          <h1>Three.js 教程示例</h1>
          <p>全面的 Three.js 示例集合，涵盖从入门基础到高级技术的 3D 图形编程示例。</p>
          <div className="header-stats">
            <div className="stat">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">示例总数</div>
            </div>
            <div className="stat">
              <div className="stat-value">{stats.categories}</div>
              <div className="stat-label">分类数量</div>
            </div>
            <div className="stat">
              <div className="stat-value">100%</div>
              <div className="stat-label">免费开源</div>
            </div>
          </div>
        </header>
      </div>

      <div className="controls">
        <div className="container">
          <div className="controls-inner">
            <div className="search-row">
              <div className="search-wrapper">
                <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="搜索示例名称或描述..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="tag-filter-bar">
              <button
                className={'clear-btn' + (activeCat === null ? ' active' : '')}
                onClick={() => setActiveCat(null)}
              >
                全部
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  className={'tag-btn' + (activeCat === cat.name ? ' active' : '')}
                  style={{ ['--tag-start' as any]: cat.start, ['--tag-end' as any]: cat.end }}
                  onClick={() => setActiveCat(activeCat === cat.name ? null : cat.name)}
                >
                  <span className="tag-dot" style={{ background: cat.dot }} />
                  <span className="tag-name">{cat.name}</span>
                  <span className="tag-count">{cat.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="results-bar">
          <span className="results-count">
            显示 <strong>{stats.visible}</strong> / {stats.total} 个示例
          </span>
        </div>

        {stats.visible === 0 ? (
          <div className="empty-state">未找到匹配的示例</div>
        ) : (
          <div className="cards-grid">
            {visible.map((d) => {
              const idx = displayIndex.get(d.slug);
              const primaryCat = d.categories[0] || '';
              const primaryColor = catColor.get(primaryCat);
              const gradientStart = primaryColor || '#888';
              const gradientEnd = primaryColor || '#555';
              return (
              <a
                key={d.slug}
                href={`/demos/${d.slug}/index.html`}
                className={'card' + (d.autoRegistered ? ' auto-tag' : '')}
                data-name={d.slug}
                onClick={(e) => handleOpen(d, e)}
              >
                <div className="card-header">
                  {idx !== undefined && (
                    <span
                      className="card-index"
                      style={{ background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` }}
                    >
                      {idx}
                    </span>
                  )}
                  <span className="card-tags-row">
                    {d.categories.map((c) => (
                      <span key={c} className="card-tag" style={{ ['--tag-color' as any]: catColor.get(c) || '#888' }}>
                        {c}
                      </span>
                    ))}
                  </span>
                </div>
                <h3 className="card-title">{d.title}</h3>
                <p className="card-desc">{d.desc}</p>
                <div className="card-footer">
                  <span className="card-dir">{d.slug}</span>
                  <span className="card-arrow">→</span>
                </div>
              </a>
              );
            })}
          </div>
        )}
      </div>

      {openDemo && (
        <PreviewModal
          demo={openDemo}
          siblings={visible}
          onNavigate={setOpenDemo}
          onClose={() => setOpenDemo(null)}
        />
      )}
    </>
  );
}
