import './globals.css';

export const metadata = {
  title: 'Gaurav Suryavanshi | Development Engineer',
  description: 'Portfolio for Development Engineer, LLM Application Engineer, Forward Deployment Engineer, web server, database, API, and automation projects.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
