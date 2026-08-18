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
  title: 'Financial & Accounting Triple Egg',
  description: 'Professional accounting dashboard',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${playfairDisplay.variable} ${publicSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
