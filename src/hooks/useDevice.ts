import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'desktop';

export function useDevice(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

  useEffect(() => {
    // Check for cookie first
    const cookieMatch = document.cookie.match(/uiVariant=([^;]+)/);
    if (cookieMatch) {
      setDeviceType(cookieMatch[1] as DeviceType);
      return;
    }

    // Fallback to user agent detection if no cookie
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || 
                     window.innerWidth < 768;
    
    const detectedType: DeviceType = isMobile ? 'mobile' : 'desktop';
    setDeviceType(detectedType);
    
    // Set cookie for future visits
    document.cookie = `uiVariant=${detectedType}; path=/; max-age=31536000`; // 1 year
  }, []);

  return deviceType;
}