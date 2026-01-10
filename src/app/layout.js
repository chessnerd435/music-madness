import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata = {
  title: "Music Madness",
  description: "School Music Tournament",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <header style={{ padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }}>
          <div className="container">
            <h1 style={{ fontSize: '1.5rem', color: 'var(--color-accent)' }}>Music Madness 🎵</h1>
          </div>
        </header>
        <main className="container">
          {children}
        </main>
        <footer style={{ textAlign: 'center', padding: '2rem 0', opacity: 0.5, fontSize: '0.8rem', color: '#94a3b8' }}>
          Made by 🦆+🧔‍♂️
        </footer>
      </body>
    </html>
  );
}
