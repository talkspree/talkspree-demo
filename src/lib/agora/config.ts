/**
 * Agora Configuration
 * 
 * To get your Agora credentials:
 * 1. Sign up at https://console.agora.io/
 * 2. Create a new project
 * 3. Get your App ID from the project settings
 * 4. Enable App Certificate and copy it
 * 
 * IMPORTANT: Never expose your App Certificate in the frontend code!
 * Store it in your Supabase database using the app_config table.
 */

export interface AgoraConfig {
  appId: string;
}

/**
 * Get Agora App ID from environment variables
 * This should be set in your .env file as VITE_AGORA_APP_ID
 */
export const getAgoraAppId = (): string => {
  const appId = import.meta.env.VITE_AGORA_APP_ID;
  
  if (!appId) {
    console.warn('⚠️ VITE_AGORA_APP_ID is not set. Please configure Agora App ID.');
    return '';
  }
  
  return appId;
};

export const agoraConfig: AgoraConfig = {
  appId: getAgoraAppId(),
};

/**
 * Agora channel configuration
 */
export const channelConfig = {
  // Video encoding configuration
  video: {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
  },
  
  // Audio configuration
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

/**
 * Generate a random UID for the user
 * UIDs must be positive integers
 */
export const generateAgoraUid = (): number => {
  return Math.floor(Math.random() * 1000000) + 1;
};

/**
 * Generate channel name from call ID
 */
export const generateChannelName = (callId: string): string => {
  // Remove hyphens and use call_ prefix
  return `call_${callId.replace(/-/g, '')}`;
};

