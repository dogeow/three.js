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

type CodeFile = { name: string; url: string };

const DEFAULT_FILE = 'main.js';
const JS_FALLBACK = '// 未找到源文件';
const HTML_FALLBACK = '<!-- 未找到源文件 -->';
const AUTO_APPLY_DELAY = 500;

function getFallbackContent(name: string): string {
  return name.endsWith('.html') || name.endsWith('.htm') ? HTML_FALLBACK : JS_FALLBACK;
}

function inferLang(name: string): string {
  if (name.endsWith('.js') || name.endsWith('.mjs')) return 'javascript';
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'html';
  if (name.endsWith('.css')) return 'css';
  return 'plaintext';
}

function renderHighlightedCode(code: string, lang: string): string {
  const input = code.length > 0 ? code : ' ';
  try {
    if (lang === 'plaintext') return hljs.highlightAuto(input).value;
    return hljs.highlight(input, { language: lang }).value;
  } catch {
    return hljs.highlightAuto(input).value;
  }
}

function escapeHtmlAttr(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function ensureBaseHref(html: string, baseHref: string): string {
  if (/<base\s/i.test(html)) return html;
  const baseTag = `<base href="${escapeHtmlAttr(baseHref)}">`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${baseTag}</head>`);
  }
  return `${baseTag}${html}`;
}

function replaceScriptSrc(html: string, filename: string, nextUrl: string): string {
  const escapedName = filename.replace('.', '\\.');
  const pattern = new RegExp(`(<script\\b[^>]*\\bsrc=(['"]))(?:\\.?\\/)?${escapedName}\\2([^>]*>\\s*<\\/script>)`, 'i');
  return html.replace(pattern, (_match, prefix: string, quote: string, suffix: string) => {
    return `${prefix}${nextUrl}${quote}${suffix}`;
  });
}

function createDraftStorageKey(slug: string): string {
  return `three-js-gallery:drafts:${slug}`;
}

export default function PreviewModal({ demo, siblings = [], onNavigate, onClose }: Props) {
  const currentIndex = siblings.findIndex((d) => d.slug === demo.slug);
  const prev = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeFiles, setCodeFiles] = useState<Record<string, string>>({});
  const [originalFiles, setOriginalFiles] = useState<Record<string, string>>({});
  const [codeLoading, setCodeLoading] = useState(false);
  const [previewApplying, setPreviewApplying] = useState(false);
  const [draftPreviewActive, setDraftPreviewActive] = useState(false);
  const [lastAppliedSignature, setLastAppliedSignature] = useState('');
  const [activeFile, setActiveFile] = useState<string>(DEFAULT_FILE);
  const splitRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const paneRightRef = useRef<HTMLDivElement>(null);
  const previewUrlsRef = useRef<string[]>([]);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  const srcUrl = `/demos/${demo.slug}/index.html`;

  const clearPreviewUrls = useCallback(() => {
    for (const url of previewUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    previewUrlsRef.current = [];
  }, []);

  const goTo = useCallback(
    (d: Demo | null) => {
      if (!d || !onNavigate) return;
      clearPreviewUrls();
      if (paneRightRef.current) paneRightRef.current.style.width = '';
      splitRef.current?.style.removeProperty('--right-w');
      setDraftPreviewActive(false);
      setCodeOpen(false);
      onNavigate(d);
    },
    [clearPreviewUrls, onNavigate],
  );

  const candidateFiles = useMemo<CodeFile[]>(
    () => [
      { name: 'main.js', url: `/demos/${demo.slug}/main.js` },
      { name: 'index.html', url: `/demos/${demo.slug}/index.html` },
    ],
    [demo.slug],
  );
  const draftStorageKey = useMemo(() => createDraftStorageKey(demo.slug), [demo.slug]);
  const activeLang = useMemo(() => inferLang(activeFile), [activeFile]);

  const readStoredDrafts = useCallback((): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(draftStorageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }, [draftStorageKey]);

  const activeCodeText = codeFiles[activeFile] ?? '';
  const activeOriginalText = originalFiles[activeFile] ?? '';
  const activeFileDirty = activeCodeText !== activeOriginalText;
  const dirtyDrafts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(codeFiles).filter(([name, value]) => originalFiles[name] !== undefined && value !== originalFiles[name]),
      ),
    [codeFiles, originalFiles],
  );
  const hasDirtyFiles = Object.keys(dirtyDrafts).length > 0;
  const draftSignature = useMemo(() => JSON.stringify(dirtyDrafts), [dirtyDrafts]);
  const editorStatus = previewApplying
    ? '自动运行中'
    : hasDirtyFiles && draftSignature !== lastAppliedSignature
      ? '等待自动运行'
      : draftPreviewActive
        ? '已自动预览'
        : '已同步';
  const highlightedCode = useMemo(() => renderHighlightedCode(activeCodeText, activeLang), [activeCodeText, activeLang]);

  const fetchFileText = useCallback(
    async (name: string): Promise<string> => {
      const file = candidateFiles.find((item) => item.name === name);
      if (!file) return getFallbackContent(name);
      try {
        const res = await fetch(file.url);
        if (res.ok) return await res.text();
      } catch {
        /* ignore */
      }
      return getFallbackContent(name);
    },
    [candidateFiles],
  );

  const ensureEditorFile = useCallback(
    async (name: string): Promise<string> => {
      if (Object.prototype.hasOwnProperty.call(codeFiles, name)) return codeFiles[name];
      const text = await fetchFileText(name);
      setOriginalFiles((prevMap) => (Object.prototype.hasOwnProperty.call(prevMap, name) ? prevMap : { ...prevMap, [name]: text }));
      setCodeFiles((prevMap) => (Object.prototype.hasOwnProperty.call(prevMap, name) ? prevMap : { ...prevMap, [name]: text }));
      return text;
    },
    [codeFiles, fetchFileText],
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
  }, [goTo, next, onClose, prev]);

  useEffect(() => {
    clearPreviewUrls();
    setCodeFiles({});
    setOriginalFiles({});
    setCodeLoading(false);
    setPreviewApplying(false);
    setDraftPreviewActive(false);
    setLastAppliedSignature('');
    setActiveFile(DEFAULT_FILE);
    if (iframeRef.current) iframeRef.current.src = srcUrl;
  }, [clearPreviewUrls, demo.slug, srcUrl]);

  useEffect(() => {
    if (!codeOpen) return;
    if (Object.prototype.hasOwnProperty.call(codeFiles, activeFile)) {
      setCodeLoading(false);
      return;
    }

    let cancelled = false;
    setCodeLoading(true);
    const storedDrafts = readStoredDrafts();

    (async () => {
      const order = [
        candidateFiles.find((file) => file.name === activeFile),
        ...candidateFiles.filter((file) => file.name !== activeFile),
      ].filter(Boolean) as CodeFile[];

      for (const file of order) {
        const text = await fetchFileText(file.name);
        const nextCode = storedDrafts[file.name] ?? text;
        if (!cancelled) {
          setOriginalFiles((prevMap) =>
            Object.prototype.hasOwnProperty.call(prevMap, file.name) ? prevMap : { ...prevMap, [file.name]: text },
          );
          setCodeFiles((prevMap) =>
            Object.prototype.hasOwnProperty.call(prevMap, file.name) ? prevMap : { ...prevMap, [file.name]: nextCode },
          );
          if (text !== getFallbackContent(file.name) || file.name === activeFile) {
            if (file.name !== activeFile) setActiveFile(file.name);
            setCodeLoading(false);
            return;
          }
        }
      }

      if (!cancelled) setCodeLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeFile, candidateFiles, codeFiles, codeOpen, fetchFileText, readStoredDrafts]);

  useEffect(() => {
    return () => {
      clearPreviewUrls();
    };
  }, [clearPreviewUrls]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasDirtyFiles) {
      window.localStorage.removeItem(draftStorageKey);
      return;
    }
    window.localStorage.setItem(draftStorageKey, JSON.stringify(dirtyDrafts));
  }, [dirtyDrafts, draftStorageKey, hasDirtyFiles]);

  const closeCodePanel = useCallback(() => {
    setCodeOpen(false);
    if (paneRightRef.current) paneRightRef.current.style.width = '';
    splitRef.current?.style.removeProperty('--right-w');
  }, []);

  const toggleCodePanel = useCallback(() => {
    setCodeOpen((visible) => {
      const nextVisible = !visible;
      if (!nextVisible) {
        if (paneRightRef.current) paneRightRef.current.style.width = '';
        splitRef.current?.style.removeProperty('--right-w');
      }
      return nextVisible;
    });
  }, []);

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
      const state = dragStateRef.current;
      if (!state.dragging) return;
      const split = splitRef.current;
      const paneRight = paneRightRef.current;
      if (!split || !paneRight) return;
      const dx = state.startX - e.clientX;
      const maxW = split.offsetWidth * 0.75;
      const newW = Math.min(Math.max(state.startW + dx, 240), maxW);
      state.pendingW = newW;
      if (!state.raf) {
        state.raf = requestAnimationFrame(() => {
          state.raf = 0;
          paneRight.style.width = `${state.pendingW}px`;
        });
      }
    };

    const onUp = () => {
      const state = dragStateRef.current;
      if (!state.dragging) return;
      state.dragging = false;
      if (state.raf) {
        cancelAnimationFrame(state.raf);
        state.raf = 0;
      }
      const split = splitRef.current;
      if (split) {
        split.classList.remove('dragging');
        split.querySelector<HTMLElement>('.divider')?.classList.remove('dragging');
        if (paneRightRef.current) split.style.setProperty('--right-w', `${paneRightRef.current.offsetWidth}px`);
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

  const handleApplyDraft = useCallback(async () => {
    setPreviewApplying(true);
    try {
      const [htmlSource, mainSource] = await Promise.all([ensureEditorFile('index.html'), ensureEditorFile('main.js')]);
      const baseHref = `${window.location.origin}/demos/${demo.slug}/`;

      clearPreviewUrls();

      let html = ensureBaseHref(htmlSource, baseHref);
      if (mainSource && mainSource !== JS_FALLBACK) {
        const mainBlobUrl = URL.createObjectURL(new Blob([mainSource], { type: 'text/javascript' }));
        previewUrlsRef.current.push(mainBlobUrl);
        html = replaceScriptSrc(html, 'main.js', mainBlobUrl);
        html = replaceScriptSrc(html, 'main.mjs', mainBlobUrl);
      }

      const htmlBlobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      previewUrlsRef.current.push(htmlBlobUrl);
      if (iframeRef.current) iframeRef.current.src = htmlBlobUrl;
      setDraftPreviewActive(true);
      setLastAppliedSignature(draftSignature);
    } finally {
      setPreviewApplying(false);
    }
  }, [clearPreviewUrls, demo.slug, draftSignature, ensureEditorFile]);

  useEffect(() => {
    if (!codeOpen || codeLoading || previewApplying) return;
    if (!hasDirtyFiles || draftSignature === lastAppliedSignature) return;

    const timeoutId = window.setTimeout(() => {
      void handleApplyDraft();
    }, AUTO_APPLY_DELAY);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [codeLoading, codeOpen, draftSignature, handleApplyDraft, hasDirtyFiles, lastAppliedSignature, previewApplying]);

  const handleReload = useCallback(() => {
    if (!iframeRef.current) return;
    if (draftPreviewActive) {
      void handleApplyDraft();
      return;
    }
    iframeRef.current.src = srcUrl;
  }, [draftPreviewActive, handleApplyDraft, srcUrl]);

  const handleRestorePreview = useCallback(() => {
    clearPreviewUrls();
    setDraftPreviewActive(false);
    setLastAppliedSignature(draftSignature);
    if (iframeRef.current) iframeRef.current.src = srcUrl;
  }, [clearPreviewUrls, draftSignature, srcUrl]);

  const handleOpenNew = useCallback(() => {
    window.open(srcUrl, '_blank', 'noopener');
  }, [srcUrl]);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(activeCodeText).catch(() => void 0);
  }, [activeCodeText]);

  const handleCodeChange = useCallback(
    (value: string) => {
      setCodeFiles((prevMap) => ({ ...prevMap, [activeFile]: value }));
    },
    [activeFile],
  );

  const handleResetFile = useCallback(() => {
    if (!Object.prototype.hasOwnProperty.call(originalFiles, activeFile)) return;
    setCodeFiles((prevMap) => ({ ...prevMap, [activeFile]: originalFiles[activeFile] }));
  }, [activeFile, originalFiles]);

  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextValue = `${activeCodeText.slice(0, start)}  ${activeCodeText.slice(end)}`;
      setCodeFiles((prevMap) => ({ ...prevMap, [activeFile]: nextValue }));
      requestAnimationFrame(() => {
        textarea.setSelectionRange(start + 2, start + 2);
      });
    },
    [activeCodeText, activeFile],
  );

  const syncCodeScroll = useCallback(() => {
    const editor = editorRef.current;
    const highlight = highlightRef.current;
    if (!editor || !highlight) return;
    highlight.scrollTop = editor.scrollTop;
    highlight.scrollLeft = editor.scrollLeft;
  }, []);

  useEffect(() => {
    syncCodeScroll();
  }, [activeFile, activeCodeText, syncCodeScroll]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-shell">
        <div className="modal-header">
          <div className="modal-title">
            <span>{demo.title}</span>
            <code>{demo.slug}</code>
          </div>
          <div className="modal-actions">
            <button className="modal-btn nav-btn" onClick={() => goTo(prev)} disabled={!prev} title={prev ? prev.title : '没有上一个'}>
              ← 上一个
            </button>
            <button className="modal-btn nav-btn" onClick={() => goTo(next)} disabled={!next} title={next ? next.title : '没有下一个'}>
              下一个 →
            </button>
            {siblings.length > 0 && currentIndex >= 0 && <span className="nav-counter">{currentIndex + 1} / {siblings.length}</span>}
            <button className="modal-btn" onClick={toggleCodePanel}>
              {codeOpen ? '隐藏代码' : '查看代码'}
            </button>
            <button className="modal-btn" onClick={handleReload}>
              {draftPreviewActive ? '重跑草稿' : '重载'}
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
                  {demo.categories.map((category) => (
                    <span key={category} className="info-tag">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {demo.features.length > 0 && (
              <div className="info-block">
                <span className="info-label">关键 API</span>
                <div className="info-features">
                  {demo.features.map((feature) => (
                    <span key={feature} className="feat-badge">
                      {feature}
                    </span>
                  ))}
                  {demo.extraCount > 0 && <span className="feat-extra">+{demo.extraCount}</span>}
                </div>
              </div>
            )}
          </aside>

          <div ref={splitRef} className={`split${codeOpen ? ' code-open' : ''}`}>
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
                  {candidateFiles.map((file) => (
                    <button
                      key={file.name}
                      className={`editor-tab${activeFile === file.name ? ' active' : ''}`}
                      onClick={() => setActiveFile(file.name)}
                    >
                      {file.name}
                      {originalFiles[file.name] !== undefined && codeFiles[file.name] !== originalFiles[file.name] ? ' *' : ''}
                    </button>
                  ))}
                </div>
                <div className="editor-actions">
                  <span className={`editor-status${draftPreviewActive ? ' active' : ''}`}>{editorStatus}</span>
                  <button className="code-close" onClick={() => void handleApplyDraft()} title="运行修改" disabled={codeLoading || previewApplying}>
                    ▶
                  </button>
                  <button className="code-close" onClick={handleResetFile} title="还原当前文件" disabled={!activeFileDirty}>
                    ↺
                  </button>
                  <button className="code-close" onClick={handleRestorePreview} title="恢复原始预览" disabled={!draftPreviewActive}>
                    ⎌
                  </button>
                  <button className="code-close" onClick={handleCopy} title="复制当前文件">
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
                  <div className="code-editor-shell">
                    <pre ref={highlightRef} className="code-highlight hljs" aria-hidden="true">
                      <code className={`language-${activeLang}`} dangerouslySetInnerHTML={{ __html: highlightedCode }} />
                    </pre>
                    <textarea
                      ref={editorRef}
                      className="code-editor"
                      value={activeCodeText}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      onKeyDown={handleEditorKeyDown}
                      onScroll={syncCodeScroll}
                      spellCheck={false}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
