'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import api from '../lib/api';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';
import { Skeleton } from './ui/Skeleton';

// Module-level cache — persists across navigations, cleared on hard reload
const nameCache = new Map<string, string>();

async function fetchName(
  endpoint: string,
  extract: (data: Record<string, unknown>) => string,
): Promise<string> {
  if (nameCache.has(endpoint)) return nameCache.get(endpoint)!;
  const { data } = await api.get<Record<string, unknown>>(endpoint);
  const name = extract(data);
  nameCache.set(endpoint, name);
  return name;
}

const DASHBOARD: BreadcrumbItem = { label: 'Dashboard', href: '/dashboard' };

const SUB_LABELS: Record<string, string> = {
  '/review':  'Peer Review',
  '/reviews': 'Отзывы',
  '/import':  'Импорт',
};

async function buildItems(pathname: string): Promise<BreadcrumbItem[]> {
  if (pathname === '/dashboard') return [];

  // ── Static routes ───────────────────────────────────────────────────────────
  const statics: Record<string, BreadcrumbItem[]> = {
    '/teams':   [DASHBOARD, { label: 'Команды' }],
    '/archive': [DASHBOARD, { label: 'Архив' }],
    '/profile': [DASHBOARD, { label: 'Мой профиль' }],
  };
  if (statics[pathname]) return statics[pathname];

  // ── /teams/[id] ─────────────────────────────────────────────────────────────
  const teamMatch = pathname.match(/^\/teams\/([^/]+)$/);
  if (teamMatch) {
    const id = teamMatch[1];
    const name = await fetchName(
      `/teams/${id}`,
      (d) => (d.team as { name: string }).name,
    ).catch(() => '—');
    return [DASHBOARD, { label: 'Команды', href: '/teams' }, { label: name }];
  }

  // ── /projects/[id] and sub-pages ────────────────────────────────────────────
  const projectMatch = pathname.match(/^\/projects\/([^/]+)(\/[^/]+)?$/);
  if (projectMatch) {
    const id   = projectMatch[1];
    const sub  = projectMatch[2] ?? '';
    const name = await fetchName(
      `/projects/${id}`,
      (d) => (d.project as { title: string }).title,
    ).catch(() => '—');

    const projectItem: BreadcrumbItem = sub
      ? { label: name, href: `/projects/${id}` }
      : { label: name };

    const base: BreadcrumbItem[] = [DASHBOARD, { label: 'Проекты' }, projectItem];

    if (sub && SUB_LABELS[sub]) {
      return [...base, { label: SUB_LABELS[sub] }];
    }
    return base;
  }

  // ── /admin/... ───────────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    const segments = pathname.split('/').filter(Boolean);
    const hasSubpage = segments.length > 1;
    const adminLabel: BreadcrumbItem = hasSubpage
      ? { label: 'Админ', href: '/admin' }
      : { label: 'Админ' };
    const result: BreadcrumbItem[] = [DASHBOARD, adminLabel];
    if (hasSubpage) {
      const subLabels: Record<string, string> = { users: 'Пользователи' };
      result.push({ label: subLabels[segments[1]] ?? segments[1] });
    }
    return result;
  }

  return [];
}

export function BreadcrumbsContainer() {
  const pathname = usePathname();
  const [items, setItems] = useState<BreadcrumbItem[] | null>(null);

  useEffect(() => {
    let live = true;
    setItems(null);

    if (pathname === '/dashboard') {
      setItems([]);
      return;
    }

    buildItems(pathname)
      .then((result) => { if (live) setItems(result); })
      .catch(() => { if (live) setItems([]); });

    return () => { live = false; };
  }, [pathname]);

  // Never show anything on the root dashboard
  if (pathname === '/dashboard') return null;

  // Loading state
  if (items === null) {
    return (
      <div className="py-2 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  // No items computed (unknown route)
  if (items.length === 0) return null;

  return <Breadcrumbs items={items} />;
}
