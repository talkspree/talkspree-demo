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
  private isJoined = false;
  private isCameraOn = true;
  private isMicOn = true;

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
      console.log('Remote user joined:', user.uid);
      this.remoteUsers.set(user.uid, user);
      this.onUserJoinedCallback?.(user);
    });

    // Handle remote user left
    this.client.on('user-left', (user, reason) => {
      console.log('Remote user left:', user.uid, 'Reason:', reason);
      this.remoteUsers.delete(user.uid);
      this.onUserLeftCallback?.(user);
    });

    // Handle remote user published media
    this.client.on('user-published', async (user, mediaType) => {
      console.log('Remote user published:', user.uid, 'Media:', mediaType);
      try {
        await this.client!.subscribe(user, mediaType);
        this.remoteUsers.set(user.uid, user);

        // CRITICAL: Auto-play audio tracks immediately
        if (mediaType === 'audio' && user.audioTrack) {
          console.log('🔊 Auto-playing remote audio for user:', user.uid);
          user.audioTrack.play();
        }

        this.onUserPublishedCallback?.(user, mediaType);
      } catch (error) {
        console.error('Failed to subscribe to remote user:', user.uid, mediaType, error);
      }
    });

    // Handle remote user unpublished media
    this.client.on('user-unpublished', (user, mediaType) => {
      console.log('Remote user unpublished:', user.uid, 'Media:', mediaType);
      this.onUserUnpublishedCallback?.(user, mediaType);
    });

    // Handle connection state changes
    this.client.on('connection-state-change', (curState, revState, reason) => {
      console.log('Connection state changed:', { curState, revState, reason });

      // Handle disconnection and network issues
      if (curState === 'DISCONNECTED') {
        console.warn('⚠️ Agora disconnected. Reason:', reason);
        // The SDK will automatically try to reconnect
      } else if (curState === 'RECONNECTING') {
        console.log('🔄 Agora reconnecting...');
      } else if (curState === 'CONNECTED') {
        console.log('✅ Agora connection established/restored');
      }

      this.onConnectionStateChangeCallback?.(curState, revState, reason);
    });

    // Handle network quality changes (detect poor connection)
    this.client.on('network-quality', (stats) => {
      // Quality levels: 0 (unknown), 1 (excellent), 2 (good), 3 (poor), 4 (bad), 5 (very bad), 6 (down)
      if (stats.downlinkNetworkQuality >= 4 || stats.uplinkNetworkQuality >= 4) {
        console.warn('⚠️ Poor network quality detected:', stats);
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
      console.log('🚀 Joining channel:', channelName, 'with UID:', uid);

      // Pre-create local tracks BEFORE joining to speed up connection
      // This allows faster publishing after join
      console.log('📹 Pre-creating local media tracks...');
      await this.createLocalTracks();

      console.log('🔗 Joining Agora channel...');
      await this.client.join(agoraConfig.appId, channelName, token, uid);
      this.isJoined = true;

      console.log('✅ Successfully joined channel');

      // Publish tracks immediately
      const tracksToPublish = [this.localAudioTrack, this.localVideoTrack].filter(Boolean) as any[];
      if (tracksToPublish.length > 0) {
        console.log('📤 Publishing local tracks...');
        await this.client.publish(tracksToPublish);
        console.log('✅ Published', tracksToPublish.length, 'track(s)');
      } else {
        console.warn('⚠️ No media tracks available to publish (mic/camera unavailable)');
      }
    } catch (error) {
      console.error('❌ Failed to join channel:', error);
      this.isJoined = false;
      throw error;
    }
  }

  /**
   * Create local audio and video tracks
   */
  async createLocalTracks(): Promise<void> {
    console.log('Creating local tracks (mic + camera)...');

    // Microphone
    try {
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      this.isMicOn = true;
    } catch (error) {
      console.warn('Microphone track failed:', error);
      this.localAudioTrack = null;
      this.isMicOn = false;
    }

    // Camera (prefer front-facing on mobile)
    try {
      this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
        encoderConfig: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: 30,
          bitrateMax: 2000,
        },
        optimizationMode: 'detail',
        // @ts-ignore facingMode supported; helps mobile choose front cam
        cameraFacingMode: 'user',
      });
      this.isCameraOn = true;
    } catch (error) {
      console.warn('Camera track failed (continuing with audio if available):', error);
      this.localVideoTrack = null;
      this.isCameraOn = false;
    }

    if (!this.localAudioTrack && !this.localVideoTrack) {
      throw new Error('Failed to create microphone or camera tracks');
    }
  }

  /**
   * Leave the channel and clean up
   */
  async leave(): Promise<void> {
    try {
      console.log('Leaving channel...');

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
        this.client.removeAllListeners('user-joined');
        this.client.removeAllListeners('user-left');
        this.client.removeAllListeners('user-published');
        this.client.removeAllListeners('user-unpublished');
        this.client.removeAllListeners('connection-state-change');

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

      console.log('Successfully left channel');
    } catch (error) {
      console.error('Error leaving channel:', error);
      this.isJoined = false;
      this.remoteUsers.clear();

      // Try to recreate client anyway
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
      console.log('Camera:', this.isCameraOn ? 'ON' : 'OFF');
      return this.isCameraOn;
    } catch (error) {
      console.error('Failed to toggle camera:', error);
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
      console.log('Microphone:', this.isMicOn ? 'ON' : 'OFF');
      return this.isMicOn;
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
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
      console.log('Camera switched');
    } catch (error) {
      console.error('Failed to switch camera:', error);
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
