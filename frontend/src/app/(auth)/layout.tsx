import { GraduationCap } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex flex-col items-center justify-center px-4 py-12 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3 select-none">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Student Project Hub
        </span>
      </div>

      {children}
    </div>
  );
}
