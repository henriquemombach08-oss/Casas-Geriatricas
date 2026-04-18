import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'CasaGeri', template: '%s | CasaGeri' },
  description: 'Sistema de Gerenciamento de Casas Geriátricas',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </body>
    </html>
  );
}
