'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import 'highlight.js/styles/github-dark.css';
import type { Demo } from '@/lib/demos';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);

type Props = {
  demo: Demo;
  siblings?: Demo[];
  onNavigate?: (d: Demo) => void;
  onClose: () => void;
};

type CodeFile = { name: string; url: string; lang: string };

function inferLang(name: string): string {
  if (name.endsWith('.js') || name.endsWith('.mjs')) return 'javascript';
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'html';
  if (name.endsWith('.css')) return 'css';
  return 'javascript';
}

export default function PreviewModal({ demo, siblings = [], onNavigate, onClose }: Props) {
  const currentIndex = siblings.findIndex((d) => d.slug === demo.slug);
  const prev = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;
  const goTo = useCallback(
    (d: Demo | null) => {
      if (!d || !onNavigate) return;
      if (paneRightRef.current) paneRightRef.current.style.width = '';
      splitRef.current?.style.removeProperty('--right-w');
      setCodeOpen(false);
      onNavigate(d);
    },
    [onNavigate],
  );
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeText, setCodeText] = useState<string>('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [activeFile, setActiveFile] = useState<string>('main.js');
  const splitRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const paneRightRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLElement>(null);

  const srcUrl = `/demos/${demo.slug}/index.html`;

  const candidateFiles = useMemo<CodeFile[]>(
    () => [
      { name: 'main.js', url: `/demos/${demo.slug}/main.js`, lang: 'javascript' },
      { name: 'index.html', url: `/demos/${demo.slug}/index.html`, lang: 'html' },
    ],
    [demo.slug],
  );

  useEffect(() => {
    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyWidth = body.style.width;
    const prevHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    documentElement.style.overflow = 'hidden';

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.width = prevBodyWidth;
      documentElement.style.overflow = prevHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Close on Escape, ArrowLeft/Right to navigate
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && prev) goTo(prev);
      else if (e.key === 'ArrowRight' && next) goTo(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next, goTo]);

  // Load chosen source file when code panel opens / active file changes
  useEffect(() => {
    if (!codeOpen) return;
    let cancelled = false;
    setCodeLoading(true);

    (async () => {
      // Try user-picked file first; fall back to other candidates in order.
      const order = [
        candidateFiles.find((f) => f.name === activeFile),
        ...candidateFiles.filter((f) => f.name !== activeFile),
      ].filter(Boolean) as CodeFile[];

      for (const file of order) {
        try {
          const res = await fetch(file.url);
          if (res.ok) {
            const txt = await res.text();
            if (!cancelled) {
              setCodeText(txt);
              if (file.name !== activeFile) setActiveFile(file.name);
              setCodeLoading(false);
            }
            return;
          }
        } catch {
          /* continue */
        }
      }
      if (!cancelled) {
        setCodeText('// 未找到源文件');
        setCodeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [codeOpen, activeFile, demo.slug, candidateFiles]);

  // Re-highlight when code/file changes
  useEffect(() => {
    if (!codeRef.current || codeLoading) return;
    const lang = inferLang(activeFile);
    codeRef.current.className = `hljs language-${lang}`;
    codeRef.current.textContent = codeText;
    try {
      hljs.highlightElement(codeRef.current);
    } catch {
      /* ignore */
    }
  }, [codeText, activeFile, codeLoading]);

  // ---- Close code panel: clear inline width set during drag ----
  const closeCodePanel = useCallback(() => {
    setCodeOpen(false);
    if (paneRightRef.current) paneRightRef.current.style.width = '';
    splitRef.current?.style.removeProperty('--right-w');
  }, []);

  const toggleCodePanel = useCallback(() => {
    setCodeOpen((v) => {
      const next = !v;
      if (!next) {
        if (paneRightRef.current) paneRightRef.current.style.width = '';
        splitRef.current?.style.removeProperty('--right-w');
      }
      return next;
    });
  }, []);

  // ---- Divider drag: rAF-throttled + iframe shield ----
  const dragStateRef = useRef({ dragging: false, startX: 0, startW: 0, pendingW: 0, raf: 0 });

  const onDividerPointerDown = useCallback((e: React.PointerEvent) => {
    const split = splitRef.current;
    const paneRight = paneRightRef.current;
    if (!split || !paneRight) return;
    dragStateRef.current.dragging = true;
    dragStateRef.current.startX = e.clientX;
    dragStateRef.current.startW = paneRight.offsetWidth || Math.round(split.offsetWidth * 0.5);
    split.classList.add('dragging');
    (e.target as HTMLElement).classList.add('dragging');
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const s = dragStateRef.current;
      if (!s.dragging) return;
      const split = splitRef.current;
      const paneRight = paneRightRef.current;
      if (!split || !paneRight) return;
      const dx = s.startX - e.clientX;
      const maxW = split.offsetWidth * 0.75;
      const newW = Math.min(Math.max(s.startW + dx, 240), maxW);
      s.pendingW = newW;
      if (!s.raf) {
        s.raf = requestAnimationFrame(() => {
          s.raf = 0;
          paneRight.style.width = s.pendingW + 'px';
        });
      }
    };
    const onUp = () => {
      const s = dragStateRef.current;
      if (!s.dragging) return;
      s.dragging = false;
      if (s.raf) {
        cancelAnimationFrame(s.raf);
        s.raf = 0;
      }
      const split = splitRef.current;
      if (split) {
        split.classList.remove('dragging');
        split.querySelector<HTMLElement>('.divider')?.classList.remove('dragging');
        if (paneRightRef.current) split.style.setProperty('--right-w', paneRightRef.current.offsetWidth + 'px');
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const handleReload = useCallback(() => {
    if (iframeRef.current) iframeRef.current.src = srcUrl;
  }, [srcUrl]);

  const handleOpenNew = useCallback(() => {
    window.open(srcUrl, '_blank', 'noopener');
  }, [srcUrl]);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(codeText).catch(() => void 0);
  }, [codeText]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-shell">
        <div className="modal-header">
          <div className="modal-title">
            <span>{demo.title}</span>
            <code>{demo.slug}</code>
          </div>
          <div className="modal-actions">
            <button
              className="modal-btn nav-btn"
              onClick={() => goTo(prev)}
              disabled={!prev}
              title={prev ? prev.title : '没有上一个'}
            >
              ← 上一个
            </button>
            <button
              className="modal-btn nav-btn"
              onClick={() => goTo(next)}
              disabled={!next}
              title={next ? next.title : '没有下一个'}
            >
              下一个 →
            </button>
            {siblings.length > 0 && currentIndex >= 0 && (
              <span className="nav-counter">
                {currentIndex + 1} / {siblings.length}
              </span>
            )}
            <button className="modal-btn" onClick={toggleCodePanel}>
              {codeOpen ? '隐藏代码' : '查看代码'}
            </button>
            <button className="modal-btn" onClick={handleReload}>
              重载
            </button>
            <button className="modal-btn" onClick={handleOpenNew}>
              新标签页
            </button>
            <button className="modal-btn primary" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* ===== Left info sidebar ===== */}
          <aside className="info-sidebar">
            <div className="info-block">
              <span className="info-label">目录</span>
              <span className="info-value mono">{demo.slug}</span>
            </div>
            <div className="info-block">
              <span className="info-label">描述</span>
              <span className="info-value">{demo.desc || '—'}</span>
            </div>
            {demo.categories.length > 0 && (
              <div className="info-block">
                <span className="info-label">分类</span>
                <div className="info-tags">
                  {demo.categories.map((c) => (
                    <span key={c} className="info-tag">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {demo.features.length > 0 && (
              <div className="info-block">
                <span className="info-label">关键 API</span>
                <div className="info-features">
                  {demo.features.map((f) => (
                    <span key={f} className="feat-badge">
                      {f}
                    </span>
                  ))}
                  {demo.extraCount > 0 && <span className="feat-extra">+{demo.extraCount}</span>}
                </div>
              </div>
            )}
          </aside>

          {/* ===== Right: split pane (iframe + code) ===== */}
          <div ref={splitRef} className={'split' + (codeOpen ? ' code-open' : '')}>
            <div className="pane pane-left">
              <iframe
                ref={iframeRef}
                src={srcUrl}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title={demo.title}
              />
            </div>
            <div className="divider" onPointerDown={onDividerPointerDown} title="拖动调整宽度" />
            <div ref={paneRightRef} className="pane pane-right">
              <div className="editor-header">
                <div className="editor-tabs">
                  {candidateFiles.map((f) => (
                    <button
                      key={f.name}
                      className={'editor-tab' + (activeFile === f.name ? ' active' : '')}
                      onClick={() => setActiveFile(f.name)}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
                <div className="editor-actions">
                  <button className="code-close" onClick={handleCopy} title="复制">
                    ⧉
                  </button>
                  <button className="code-close" onClick={closeCodePanel} title="关闭">
                    ✕
                  </button>
                </div>
              </div>
              <div className="code-scroll">
                {codeLoading ? (
                  <div className="code-loading">加载中…</div>
                ) : (
                  <pre className="code-pre">
                    <code ref={codeRef} className={`hljs language-${inferLang(activeFile)}`}>
                      {codeText}
                    </code>
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
