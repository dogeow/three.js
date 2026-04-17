import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Three.js 教程示例',
  description: '全面的 Three.js 示例集合，涵盖从入门基础到高级技术的 3D 图形编程示例。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `(function(){try{var t=localStorage.getItem('threejs-gallery-theme')||'dark';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;
  return (
    <html lang="zh-CN" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
