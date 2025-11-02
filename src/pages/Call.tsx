import { useDevice } from '@/hooks/useDevice';
import { DesktopCall } from '@/components/call/DesktopCall';
import { MobileCall } from '@/components/call/MobileCall';

export default function Call() {
  const device = useDevice();

  return device === 'mobile' ? <MobileCall /> : <DesktopCall />;
}
