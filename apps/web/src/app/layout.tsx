import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'CasaGeri', template: '%s | CasaGeri' },
  description: 'Sistema de Gerenciamento de Casas Geriátricas',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={inter.className}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
