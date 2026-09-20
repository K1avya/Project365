import "./globals.css";

export const metadata = {
  title: "Project365 — 365 Day Discipline Tracker & Life OS",
  description: "Capacity-Aware, Event-Sourced Human Reality Operating System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="max-w-2xl mx-auto min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
