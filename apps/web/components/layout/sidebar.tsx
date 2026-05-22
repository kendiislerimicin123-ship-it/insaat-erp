'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

interface MenuItem {
  href: string;
  label: string;
  icon: string;
  permission?: string; // Bu izne sahip değilse menü gizlenir
}

const MENU_ITEMS: MenuItem[] = [
  { href: '/dashboard', label: 'Anasayfa', icon: '🏠' },
  { href: '/projects', label: 'Projeler', icon: '🏗️', permission: 'project.read' },
  { href: '/subcontractors', label: 'Taşeronlar', icon: '🔧', permission: 'subcontractor.read' },
  { href: '/contacts', label: 'Cari Hesaplar', icon: '👥', permission: 'contact.read' },
  { href: '/cheques', label: 'Çek / Senet', icon: '📋', permission: 'cheque.read' },
  { href: '/progress-payments', label: 'Hakedişler', icon: '💰', permission: 'progress-payment.read' },
  { href: '/materials', label: 'Malzemeler', icon: '📦', permission: 'material.read' },
  { href: '/users', label: 'Kullanıcılar', icon: '👥', permission: 'user.read' },
  { href: '/audit-logs', label: 'Denetim Kayıtları', icon: '📋', permission: 'audit.read' },
];

export function Sidebar() {
  const pathname = usePathname();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  // İzni olan menüleri filtrele
  const visibleMenus = MENU_ITEMS.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🏗️</span>
          <span className="text-lg font-bold text-slate-900">İnşaat ERP</span>
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {visibleMenus.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200">
        <p className="text-xs text-slate-400">v0.1.0 — beta</p>
      </div>
    </aside>
  );
}