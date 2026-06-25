import type { Metadata } from 'next';
import './globals.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

export const metadata: Metadata = {
  title: 'AI 智能招聘大模型全栈平台',
  description: '基于 Next.js 与 Express / PostgreSQL 的极速简历解析打分看板',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Header />
            <div className="p-4">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
