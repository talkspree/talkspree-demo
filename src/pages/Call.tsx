import { useRef } from 'react';
import { useDevice, DeviceType } from '@/hooks/useDevice';
import { DesktopCallAgora } from '@/components/call/DesktopCallAgora';
import { MobileCallAgora } from '@/components/call/MobileCallAgora';

export default function Call() {
  const liveDevice = useDevice();

  // Freeze the device type at mount so window resizes, DevTools toggles,
  // or orientation changes never unmount the call component mid-call.
  const frozenDeviceRef = useRef<DeviceType>(liveDevice);

  return frozenDeviceRef.current === 'mobile' ? <MobileCallAgora /> : <DesktopCallAgora />;
}
