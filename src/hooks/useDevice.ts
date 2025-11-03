import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function useDevice(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    // Initial detection
    const width = window.innerWidth;
    const userAgent = navigator.userAgent;
    const isTabletUA = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    
    if (width < 768) return 'mobile';
    if ((width >= 768 && width <= 1024) || isTabletUA) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent;
      const isTabletUA = /iPad|Android(?!.*Mobile)/i.test(userAgent);
      
      // Mobile: < 768px
      if (width < 768) {
        return 'mobile';
      }
      // Tablet: 768px - 1024px, or tablet user agent
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

    // Use both resize and orientationchange for better detection
    window.addEventListener('resize', updateDevice);
    window.addEventListener('orientationchange', updateDevice);
    
    // Also check immediately in case of iframe resize
    const resizeObserver = new ResizeObserver(() => {
      updateDevice();
    });
    resizeObserver.observe(document.body);
    
    return () => {
      window.removeEventListener('resize', updateDevice);
      window.removeEventListener('orientationchange', updateDevice);
      resizeObserver.disconnect();
    };
  }, []);

  return deviceType;
}