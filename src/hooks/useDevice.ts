import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useDevice(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent;
      const isTabletUA = /iPad|Android(?!.*Mobile)/i.test(userAgent);
      
      // Mobile: < 768px
      if (width < 768) {
        return 'mobile';
      }
      // Tablet: 768px - 1024px in portrait, or tablet user agent
      else if ((width >= 768 && width <= 1024) || isTabletUA) {
        return 'tablet';
      }
      // Desktop: > 1024px
      else {
        return 'desktop';
      }
    };

    const updateDevice = () => {
      const detected = detectDevice();
      setDeviceType(detected);
    };

    updateDevice();
    window.addEventListener('resize', updateDevice);
    return () => window.removeEventListener('resize', updateDevice);
  }, []);

  return deviceType;
}