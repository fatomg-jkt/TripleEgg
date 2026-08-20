import { Playfair_Display, Public_Sans } from 'next/font/google';
import './globals.css';

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-title',
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata = {
  title: 'Restaurant Financial & Accounting Dashboard',
  description: 'Financial & Accounting Dashboard untuk Triple Egg dan Wok This Way',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${playfairDisplay.variable} ${publicSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
