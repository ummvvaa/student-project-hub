import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '../components/ThemeProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: {
    default: 'SPHub — Платформа студенческих проектов',
    template: '%s | SPHub',
  },
  description: 'Платформа для управления студенческими проектами',
  icons: { icon: '/favicon.svg' },
};

// Inline script — runs before React hydration to avoid flash of wrong theme
const themeInitScript = `
(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var r=document.documentElement;if(t==='dark'){r.classList.add('dark')}r.dataset.theme=t}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100`}>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: '!bg-white !text-gray-900 dark:!bg-gray-800 dark:!text-gray-100',
              style: {
                borderRadius: '8px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#7B1F2A', secondary: '#fff' } },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
