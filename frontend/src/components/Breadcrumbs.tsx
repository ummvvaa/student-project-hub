'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

function BreadcrumbLink({ item, isLast }: { item: BreadcrumbItem; isLast: boolean }) {
  if (isLast) {
    return <span className="font-medium text-gray-500 dark:text-gray-400">{item.label}</span>;
  }
  if (item.href) {
    return (
      <Link href={item.href} className="text-primary-800 hover:underline transition-colors dark:text-primary-300">
        {item.label}
      </Link>
    );
  }
  return <span className="text-gray-600 dark:text-gray-400">{item.label}</span>;
}

function Sep() {
  return <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-gray-300 dark:text-gray-600" />;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  const MOBILE_LIMIT = 2;
  const hasCollapse = items.length > MOBILE_LIMIT;
  const desktopOnly = hasCollapse ? items.slice(0, -MOBILE_LIMIT) : [];
  const alwaysVisible = hasCollapse ? items.slice(-MOBILE_LIMIT) : items;

  return (
    <nav aria-label="breadcrumb" className="py-2 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-1 text-sm">

        {/* Desktop-only prefix items */}
        {desktopOnly.map((item, idx) => (
          <Fragment key={`d${idx}`}>
            {idx > 0 && <span className="hidden sm:block"><Sep /></span>}
            <span className="hidden sm:block">
              <BreadcrumbLink item={item} isLast={false} />
            </span>
          </Fragment>
        ))}

        {/* Separator after prefix items — desktop only */}
        {desktopOnly.length > 0 && (
          <span className="hidden sm:block"><Sep /></span>
        )}

        {/* Ellipsis — mobile only */}
        {hasCollapse && (
          <>
            <span className="text-gray-400 sm:hidden select-none dark:text-gray-500">…</span>
            <span className="sm:hidden"><Sep /></span>
          </>
        )}

        {/* Always-visible items (last MOBILE_LIMIT) */}
        {alwaysVisible.map((item, idx) => {
          const isLast = idx === alwaysVisible.length - 1;
          return (
            <Fragment key={`v${idx}`}>
              {idx > 0 && <Sep />}
              <BreadcrumbLink item={item} isLast={isLast} />
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}
