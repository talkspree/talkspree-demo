import { useDevice } from '@/hooks/useDevice';
import { DesktopCallAgora } from '@/components/call/DesktopCallAgora';
import { MobileCallAgora } from '@/components/call/MobileCallAgora';

export default function Call() {
  const device = useDevice();

  return device === 'mobile' ? <MobileCallAgora /> : <DesktopCallAgora />;
}
