import { ReactNode } from 'react';
import { useDevice } from '@/hooks/useDevice';
import { MobileLayout } from './MobileLayout';
import { DesktopLayout } from './DesktopLayout';

interface AdaptiveLayoutProps {
  children: ReactNode;
}

export function AdaptiveLayout({ children }: AdaptiveLayoutProps) {
  const device = useDevice();
  
  if (device === 'mobile') {
    return <MobileLayout>{children}</MobileLayout>;
  }
  
  return <DesktopLayout>{children}</DesktopLayout>;
}