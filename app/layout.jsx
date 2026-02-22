import { Sidebar } from '@/components/layout/Sidebar';
import './globals.css';

export const metadata = {
  title: 'TFT Meta Analiz',
  description: 'MetaTFT tarzı TFT analitik aracı',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className="antialiased bg-gray-950 text-white min-h-screen flex">
        <Sidebar />
        <main className="flex-1 ml-64 min-w-0">
          {children}
        </main>
      </body>
    </html>
  );
}
