import { ReactNode } from 'react';

interface DesktopLayoutProps {
  children: ReactNode;
}

export function DesktopLayout({ children }: DesktopLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="min-h-screen">
        {children}
      </main>
    </div>
  );
}