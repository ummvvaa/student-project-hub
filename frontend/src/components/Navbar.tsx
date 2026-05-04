'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import {
  GraduationCap,
  LogOut,
  Trophy,
  LayoutDashboard,
  Users,
  Archive,
  UserCircle,
  ChevronDown,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../hooks/useAuth';
import { RoleBadge } from './ui/Badge';
import { ThemeToggle } from './ThemeToggle';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/teams',     label: 'Команды',   icon: Users },
  { href: '/archive',   label: 'Архив',     icon: Archive },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/dashboard" className="flex flex-shrink-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-800 shadow-sm">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="hidden font-bold text-gray-900 sm:block dark:text-gray-100">SPHub</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary-50 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Right section */}
        {user && (
          <div className="flex items-center gap-3">
            {/* Points */}
            <Link
              href="/profile"
              className="hidden items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 sm:flex dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
              title="Профиль"
            >
              <Trophy className="h-3.5 w-3.5" />
              {user.points}
            </Link>

            <RoleBadge role={user.role} />

            <ThemeToggle />

            {/* User dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <span className="hidden max-w-[120px] truncate sm:block">
                  {user.fullName}
                </span>
                <ChevronDown
                  className={clsx(
                    'h-4 w-4 text-gray-500 transition-transform duration-150 dark:text-gray-400',
                    dropdownOpen && 'rotate-180',
                  )}
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:shadow-none">
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <UserCircle className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    Мой профиль
                  </Link>
                  <hr className="my-1 border-gray-100 dark:border-gray-700" />
                  <button
                    onClick={() => { logout(); setDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    <LogOut className="h-4 w-4" />
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
