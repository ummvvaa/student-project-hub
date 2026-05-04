import { AuthGuard } from '../../components/AuthGuard';
import { Navbar } from '../../components/Navbar';
import { BreadcrumbsContainer } from '../../components/BreadcrumbsContainer';
import { PageTransition } from '../../components/PageTransition';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <BreadcrumbsContainer />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </AuthGuard>
  );
}
