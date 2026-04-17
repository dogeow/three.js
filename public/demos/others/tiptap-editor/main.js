// ============ Tiptap · 富文本编辑器 ============
// 基于 ProseMirror，被 Notion/GitLab 等采用的现代 WYSIWYG 编辑器
// 核心：可组合的扩展（Extension）系统 + 基于 Schema 的文档模型
// 应用：笔记应用、CMS、评论系统、文档协作、博客后台

import { Editor } from 'https://esm.sh/@tiptap/core@2.6.6'
import Blockquote from 'https://esm.sh/@tiptap/extension-blockquote@2.6.6?deps=@tiptap/core@2.6.6'
import Bold from 'https://esm.sh/@tiptap/extension-bold@2.6.6?deps=@tiptap/core@2.6.6'
import BulletList from 'https://esm.sh/@tiptap/extension-bullet-list@2.6.6?deps=@tiptap/core@2.6.6'
import Code from 'https://esm.sh/@tiptap/extension-code@2.6.6?deps=@tiptap/core@2.6.6'
import CodeBlock from 'https://esm.sh/@tiptap/extension-code-block@2.6.6?deps=@tiptap/core@2.6.6'
import Document from 'https://esm.sh/@tiptap/extension-document@2.6.6?deps=@tiptap/core@2.6.6'
import Gapcursor from 'https://esm.sh/@tiptap/extension-gapcursor@2.6.6?deps=@tiptap/core@2.6.6'
import HardBreak from 'https://esm.sh/@tiptap/extension-hard-break@2.6.6?deps=@tiptap/core@2.6.6'
import Heading from 'https://esm.sh/@tiptap/extension-heading@2.6.6?deps=@tiptap/core@2.6.6'
import History from 'https://esm.sh/@tiptap/extension-history@2.6.6?deps=@tiptap/core@2.6.6'
import HorizontalRule from 'https://esm.sh/@tiptap/extension-horizontal-rule@2.6.6?deps=@tiptap/core@2.6.6'
import Italic from 'https://esm.sh/@tiptap/extension-italic@2.6.6?deps=@tiptap/core@2.6.6'
import ListItem from 'https://esm.sh/@tiptap/extension-list-item@2.6.6?deps=@tiptap/core@2.6.6'
import OrderedList from 'https://esm.sh/@tiptap/extension-ordered-list@2.6.6?deps=@tiptap/core@2.6.6'
import Paragraph from 'https://esm.sh/@tiptap/extension-paragraph@2.6.6?deps=@tiptap/core@2.6.6'
import Strike from 'https://esm.sh/@tiptap/extension-strike@2.6.6?deps=@tiptap/core@2.6.6'
import Text from 'https://esm.sh/@tiptap/extension-text@2.6.6?deps=@tiptap/core@2.6.6'

// ============ 1. 创建编辑器 ============
const editor = new Editor({
  element: document.getElementById('editor'),
  // 避免 StarterKit 通过 semver 范围拉到不兼容的次版本扩展。
  extensions: [
    Document,
    Paragraph,
    Text,
    Heading,
    Bold,
    Italic,
    Strike,
    BulletList,
    OrderedList,
    ListItem,
    Blockquote,
    Code,
    CodeBlock,
    HorizontalRule,
    HardBreak,
    History,
    Gapcursor,
  ],
  content: `
    <h1>欢迎使用 Tiptap 👋</h1>
    <p>这是一个<strong>现代化</strong>的<em>富文本编辑器</em>。你可以试试工具栏按钮，或直接编辑这段文字。</p>
    <h2>它支持这些特性</h2>
    <ul>
      <li>标题、<strong>加粗</strong>、<em>斜体</em>、<s>删除线</s></li>
      <li>有序 / 无序列表</li>
      <li>引用 &amp; 代码块</li>
    </ul>
    <blockquote>
      <p>"我要的不是 three.js 技术的" —— 所以这个编辑器不走 WebGL，纯 DOM 渲染。</p>
    </blockquote>
    <pre><code>// 代码块也支持
function hello() {
  console.log('Hello Tiptap!')
}</code></pre>
    <p>写点东西试试 👇</p>
  `,
  onUpdate: () => renderToolbar(), // 光标变化 / 内容变化时刷新工具栏激活态
  onSelectionUpdate: () => renderToolbar(),
})

// ============ 2. 工具栏配置 ============
const buttons = [
  { label: 'H1', title: '一级标题', run: ed => ed.chain().focus().toggleHeading({ level: 1 }).run(), active: ed => ed.isActive('heading', { level: 1 }) },
  { label: 'H2', title: '二级标题', run: ed => ed.chain().focus().toggleHeading({ level: 2 }).run(), active: ed => ed.isActive('heading', { level: 2 }) },
  { label: 'H3', title: '三级标题', run: ed => ed.chain().focus().toggleHeading({ level: 3 }).run(), active: ed => ed.isActive('heading', { level: 3 }) },
  { label: 'B',  title: '加粗',    run: ed => ed.chain().focus().toggleBold().run(),                 active: ed => ed.isActive('bold') },
  { label: 'I',  title: '斜体',    run: ed => ed.chain().focus().toggleItalic().run(),               active: ed => ed.isActive('italic') },
  { label: 'S',  title: '删除线',  run: ed => ed.chain().focus().toggleStrike().run(),               active: ed => ed.isActive('strike') },
  { label: '• 列表',  title: '无序列表', run: ed => ed.chain().focus().toggleBulletList().run(),     active: ed => ed.isActive('bulletList') },
  { label: '1. 列表', title: '有序列表', run: ed => ed.chain().focus().toggleOrderedList().run(),    active: ed => ed.isActive('orderedList') },
  { label: '❝ 引用', title: '引用',     run: ed => ed.chain().focus().toggleBlockquote().run(),      active: ed => ed.isActive('blockquote') },
  { label: '</> 代码', title: '行内代码', run: ed => ed.chain().focus().toggleCode().run(),          active: ed => ed.isActive('code') },
  { label: '▤ 代码块', title: '代码块',  run: ed => ed.chain().focus().toggleCodeBlock().run(),      active: ed => ed.isActive('codeBlock') },
  { label: '— 分隔线', title: '水平分隔', run: ed => ed.chain().focus().setHorizontalRule().run(),   active: () => false },
  { label: '↶ 撤销', title: '撤销',     run: ed => ed.chain().focus().undo().run(),                  active: () => false },
  { label: '↷ 重做', title: '重做',     run: ed => ed.chain().focus().redo().run(),                  active: () => false },
]

// ============ 3. 渲染工具栏 ============
const toolbar = document.getElementById('toolbar')
function renderToolbar() {
  toolbar.innerHTML = ''
  for (const b of buttons) {
    const btn = document.createElement('button')
    btn.textContent = b.label
    btn.title = b.title
    if (b.active(editor)) btn.classList.add('active')
    btn.onclick = () => b.run(editor)
    toolbar.appendChild(btn)
  }
}
renderToolbar()

// 暴露调试
window.editor = editor
