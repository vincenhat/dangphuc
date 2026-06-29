import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Đăng Phúc · Study",
  description: "Vocabulary, grammar, reading and writing practice for ESL learners.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Đăng Phúc",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0c" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read the persisted theme on the server so the initial HTML already has
  // the right `dark` class. This is what makes the choice "stick" even when
  // localStorage has been cleared (Safari ITP, private mode, fresh device).
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("pt_theme")?.value;
  const isDark = themeCookie === "dark";
  const htmlClass = isDark ? "dark" : undefined;

  return (
    <html
      lang="en"
      className={htmlClass}
      style={{ colorScheme: isDark ? "dark" : "light" }}
      suppressHydrationWarning
    >
      <head>
        {/* Inline so the theme is applied before paint and there's no flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=document.cookie.match(/(?:^|;\\s*)pt_theme=(light|dark)/);var s=c?c[1]:null;if(!s){try{s=localStorage.getItem('pt_theme');}catch(_){}};if(s!=='light'&&s!=='dark'){s=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(s==='dark')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');try{localStorage.setItem('pt_theme',s);}catch(_){}try{document.cookie='pt_theme='+s+'; max-age=31536000; path=/; SameSite=Lax';}catch(_){}var n=null;try{n=localStorage.getItem('pt_nav_collapsed');}catch(_){}document.documentElement.dataset.nav=n==='1'?'collapsed':'expanded';}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
