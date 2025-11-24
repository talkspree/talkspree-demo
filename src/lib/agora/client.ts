/**
 * Agora RTC Client Service
 * Handles Agora video call functionality
 */

import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  UID,
} from 'agora-rtc-sdk-ng';
import { agoraConfig } from './config';

// Enable Agora SDK logging in development
if (import.meta.env.DEV) {
  AgoraRTC.setLogLevel(3); // 0: DEBUG, 1: INFO, 2: WARNING, 3: ERROR, 4: NONE
}

export interface AgoraClientState {
  client: IAgoraRTCClient | null;
  localAudioTrack: IMicrophoneAudioTrack | null;
  localVideoTrack: ICameraVideoTrack | null;
  remoteUsers: Map<UID, IAgoraRTCRemoteUser>;
  isJoined: boolean;
  isCameraOn: boolean;
  isMicOn: boolean;
}

export class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private remoteUsers: Map<UID, IAgoraRTCRemoteUser> = new Map();
  private isJoined: boolean = false;
  private isCameraOn: boolean = true;
  private isMicOn: boolean = true;

  // Event callbacks
  private onUserJoinedCallback?: (user: IAgoraRTCRemoteUser) => void;
  private onUserLeftCallback?: (user: IAgoraRTCRemoteUser) => void;
  private onUserPublishedCallback?: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void;
  private onUserUnpublishedCallback?: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void;
  private onConnectionStateChangeCallback?: (curState: string, revState: string, reason?: string) => void;

  constructor() {
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.client) return;

    // Handle remote user joined
    this.client.on('user-joined', (user) => {
      console.log('👤 Remote user joined:', user.uid);
      this.remoteUsers.set(user.uid, user);
      this.onUserJoinedCallback?.(user);
    });

    // Handle remote user left
    this.client.on('user-left', (user, reason) => {
      console.log('👋 Remote user left:', user.uid, 'Reason:', reason);
      this.remoteUsers.delete(user.uid);
      this.onUserLeftCallback?.(user);
    });

    // Handle remote user published media
    this.client.on('user-published', async (user, mediaType) => {
      console.log('📡 Remote user published:', user.uid, 'Media:', mediaType);
      await this.client!.subscribe(user, mediaType);
      this.remoteUsers.set(user.uid, user);
      this.onUserPublishedCallback?.(user, mediaType);
    });

    // Handle remote user unpublished media
    this.client.on('user-unpublished', (user, mediaType) => {
      console.log('📴 Remote user unpublished:', user.uid, 'Media:', mediaType);
      this.onUserUnpublishedCallback?.(user, mediaType);
    });

    // Handle connection state changes
    this.client.on('connection-state-change', (curState, revState, reason) => {
      console.log('🔄 Connection state changed:', { curState, revState, reason });
      this.onConnectionStateChangeCallback?.(curState, revState, reason);
    });

    // Handle network quality - only when joined
    this.client.on('network-quality', (stats) => {
      // Only log if actually in a call
      if (this.isJoined) {
        // Log very infrequently to reduce spam
        // This will be removed when leaving anyway
      }
    });
  }

  /**
   * Join an Agora channel
   */
  async join(channelName: string, token: string | null, uid: UID): Promise<void> {
    if (!this.client) {
      throw new Error('Agora client not initialized');
    }

    if (!agoraConfig.appId) {
      throw new Error('Agora App ID is not configured');
    }

    try {
      console.log('🔐 Joining channel:', channelName, 'with UID:', uid);
      
      // Join the channel
      await this.client.join(agoraConfig.appId, channelName, token, uid);
      this.isJoined = true;
      
      console.log('✅ Successfully joined channel');

      // Create local tracks
      await this.createLocalTracks();

      // Publish local tracks
      if (this.localAudioTrack && this.localVideoTrack) {
        await this.client.publish([this.localAudioTrack, this.localVideoTrack]);
        console.log('✅ Published local tracks');
      }
    } catch (error) {
      console.error('❌ Failed to join channel:', error);
      throw error;
    }
  }

  /**
   * Create local audio and video tracks
   */
  async createLocalTracks(): Promise<void> {
    try {
      console.log('🎥 Creating local tracks...');

      // Create microphone and camera tracks
      [this.localAudioTrack, this.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        {
          encoderConfig: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: 30,
            bitrateMax: 2000,
          },
          optimizationMode: 'detail',
        }
      );

      console.log('✅ Local tracks created successfully');
    } catch (error) {
      console.error('❌ Failed to create local tracks:', error);
      throw error;
    }
  }

  /**
   * Leave the channel and clean up
   */
  async leave(): Promise<void> {
    try {
      console.log('👋 Leaving channel...');

      // Stop and close local tracks
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }

      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
        this.localVideoTrack = null;
      }

      // Unpublish and leave
      if (this.client && this.isJoined) {
        // Remove ALL event listeners BEFORE leaving to prevent any events
        this.client.removeAllListeners('user-joined');
        this.client.removeAllListeners('user-left');
        this.client.removeAllListeners('user-published');
        this.client.removeAllListeners('user-unpublished');
        this.client.removeAllListeners('connection-state-change');
        this.client.removeAllListeners('network-quality');
        
        try {
          await this.client.unpublish();
        } catch (e) {
          console.warn('Error unpublishing:', e);
        }
        
        try {
          await this.client.leave();
        } catch (e) {
          console.warn('Error leaving channel:', e);
        }
        
        this.isJoined = false;
      }

      this.remoteUsers.clear();
      
      // Recreate client for next call with fresh event listeners
      this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      this.setupEventListeners();
      
      console.log('✅ Successfully left channel');
    } catch (error) {
      console.error('❌ Error leaving channel:', error);
      // Even if there's an error, try to clean up
      this.isJoined = false;
      this.remoteUsers.clear();
      
      // Still try to recreate client
      try {
        if (this.client) {
          this.client.removeAllListeners();
        }
        this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        this.setupEventListeners();
      } catch (recreateError) {
        console.error('Error recreating client:', recreateError);
      }
      
      throw error;
    }
  }

  /**
   * Toggle camera on/off
   */
  async toggleCamera(): Promise<boolean> {
    if (!this.localVideoTrack) return false;

    try {
      await this.localVideoTrack.setEnabled(!this.isCameraOn);
      this.isCameraOn = !this.isCameraOn;
      console.log('📹 Camera:', this.isCameraOn ? 'ON' : 'OFF');
      return this.isCameraOn;
    } catch (error) {
      console.error('❌ Failed to toggle camera:', error);
      throw error;
    }
  }

  /**
   * Toggle microphone on/off
   */
  async toggleMic(): Promise<boolean> {
    if (!this.localAudioTrack) return false;

    try {
      await this.localAudioTrack.setEnabled(!this.isMicOn);
      this.isMicOn = !this.isMicOn;
      console.log('🎤 Microphone:', this.isMicOn ? 'ON' : 'OFF');
      return this.isMicOn;
    } catch (error) {
      console.error('❌ Failed to toggle microphone:', error);
      throw error;
    }
  }

  /**
   * Switch camera (front/back on mobile)
   */
  async switchCamera(): Promise<void> {
    if (!this.localVideoTrack) return;

    try {
      // @ts-ignore - switchDevice is available but not in types
      await this.localVideoTrack.switchDevice();
      console.log('🔄 Camera switched');
    } catch (error) {
      console.error('❌ Failed to switch camera:', error);
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): AgoraClientState {
    return {
      client: this.client,
      localAudioTrack: this.localAudioTrack,
      localVideoTrack: this.localVideoTrack,
      remoteUsers: this.remoteUsers,
      isJoined: this.isJoined,
      isCameraOn: this.isCameraOn,
      isMicOn: this.isMicOn,
    };
  }

  /**
   * Register event callbacks
   */
  on(event: 'user-joined', callback: (user: IAgoraRTCRemoteUser) => void): void;
  on(event: 'user-left', callback: (user: IAgoraRTCRemoteUser) => void): void;
  on(event: 'user-published', callback: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void): void;
  on(event: 'user-unpublished', callback: (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => void): void;
  on(event: 'connection-state-change', callback: (curState: string, revState: string, reason?: string) => void): void;
  on(event: string, callback: any): void {
    switch (event) {
      case 'user-joined':
        this.onUserJoinedCallback = callback;
        break;
      case 'user-left':
        this.onUserLeftCallback = callback;
        break;
      case 'user-published':
        this.onUserPublishedCallback = callback;
        break;
      case 'user-unpublished':
        this.onUserUnpublishedCallback = callback;
        break;
      case 'connection-state-change':
        this.onConnectionStateChangeCallback = callback;
        break;
    }
  }

  /**
   * Get client instance
   */
  getClient(): IAgoraRTCClient | null {
    return this.client;
  }

  /**
   * Get local video track
   */
  getLocalVideoTrack(): ICameraVideoTrack | null {
    return this.localVideoTrack;
  }

  /**
   * Get local audio track
   */
  getLocalAudioTrack(): IMicrophoneAudioTrack | null {
    return this.localAudioTrack;
  }

  /**
   * Get remote users
   */
  getRemoteUsers(): Map<UID, IAgoraRTCRemoteUser> {
    return this.remoteUsers;
  }
}

// Export singleton instance
export const agoraService = new AgoraService();

