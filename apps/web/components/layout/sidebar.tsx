'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

interface MenuItem {
  href: string;
  label: string;
  icon: string;
  permission?: string;
  isSubItem?: boolean;
}

interface MenuGroup {
  title?: string;
  items: MenuItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    items: [{ href: '/dashboard', label: 'Anasayfa', icon: '🏠' }],
  },
  {
    title: 'İŞ YÖNETİMİ',
    items: [
      { href: '/projects', label: 'Projeler', icon: '🏗️', permission: 'project.read' },
      { href: '/subcontractors', label: 'Taşeronlar', icon: '🔧', permission: 'subcontractor.read' },
      { href: '/progress-payments', label: 'Hakedişler', icon: '💰', permission: 'progress-payment.read' },
    ],
  },
  {
    title: 'MALİ İŞLER',
    items: [
      { href: '/contacts', label: 'Cari Hesaplar', icon: '👥', permission: 'contact.read' },
      { href: '/cheques', label: 'Çek / Senet', icon: '📋', permission: 'cheque.read' },
      { href: '/expenses', label: 'Genel Giderler', icon: '💸', permission: 'expense.read' },
    ],
  },
  {
    title: 'STOK',
    items: [
      { href: '/materials', label: 'Malzemeler', icon: '📦', permission: 'material.read' },
      {
        href: '/materials/movements',
        label: 'Stok Hareketleri',
        icon: '📊',
        permission: 'material.read',
        isSubItem: true,
      },
    ],
  },
  {
    title: 'SİSTEM',
    items: [
      { href: '/users', label: 'Kullanıcılar', icon: '👤', permission: 'user.read' },
      { href: '/audit-logs', label: 'Denetim Kayıtları', icon: '📋', permission: 'audit.read' },
    ],
  },
];

export function Sidebar() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isItemActive = (item: MenuItem): boolean => {
    if (item.isSubItem) return pathname === item.href;
    if (item.href === '/dashboard') return pathname === '/dashboard';
    if (item.href === '/materials' && pathname.startsWith('/materials/movements')) return false;
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  // SSR sırasında boş aside göster, hydration mismatch'i önle
  if (!mounted) {
    return (
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0">
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏗️</span>
            <h1 className="text-base font-bold tracking-tight text-white">İnşaat ERP</h1>
          </div>
        </div>
        <div className="flex-1" />
        <div className="border-t border-slate-800 px-5 py-2 text-[10px] text-slate-500 text-center">
          v0.1.0 — beta
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏗️</span>
          <h1 className="text-base font-bold tracking-tight text-white">İnşaat ERP</h1>
        </div>
      </div>

      <nav className="flex-1 py-2 overflow-y-auto">
        {MENU_GROUPS.map((group, groupIdx) => {
          const visibleItems = group.items.filter(
            (item) => !item.permission || hasPermission(item.permission),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={groupIdx}>
              {group.title ? (
                <div className="px-5 pt-4 pb-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  {group.title}
                </div>
              ) : null}
              {visibleItems.map((item) => {
                const active = isItemActive(item);
                const baseClass = item.isSubItem
                  ? 'flex items-center gap-2 pl-12 pr-5 py-1.5 text-sm transition-colors relative'
                  : 'flex items-center gap-3 px-5 py-2.5 text-sm transition-colors relative';

                const activeClass = item.isSubItem
                  ? active
                    ? 'text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                  : active
                    ? 'bg-slate-800 text-white font-medium'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white';

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${baseClass} ${activeClass}`}
                  >
                    {active && !item.isSubItem ? (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                    ) : null}
                    {item.isSubItem ? (
                      <span className="text-xs opacity-50">↳</span>
                    ) : (
                      <span className="text-base">{item.icon}</span>
                    )}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {user ? (
        <div className="border-t border-slate-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
              <p className="text-[10px] text-slate-400 truncate">
                {user.roles?.[0]?.name ?? 'USER'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-t border-slate-800 px-5 py-2 text-[10px] text-slate-500 text-center">
        v0.1.0 — beta
      </div>
    </aside>
  );
}