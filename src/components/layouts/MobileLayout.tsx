import { ReactNode } from 'react';

interface MobileLayoutProps {
  children: ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="pb-safe-area">
        {children}
      </main>
    </div>
  );
}