'use client';

import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '人才看板工作台', icon: '📊' },
  { href: '/upload', label: '简历大模型解析流', icon: '📥' },
  { href: '/jd', label: '岗位智能算力匹配', icon: '🎯' },
];

export default function Header() {
  const pathname = usePathname();
  const currentLabel = navItems.find((item) => item.href === pathname)?.label || '工作台';

  return (
    <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 shadow-sm sticky top-0 z-10">
      <h2 className="text-sm font-semibold text-slate-700">
        {currentLabel}
      </h2>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">PostgreSQL Active</span>
      </div>
    </header>
  );
}
