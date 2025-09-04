/**
 * Native Device Integration
 * Provides access to native device capabilities with progressive enhancement
 */

interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

interface VendorFullscreenElement extends Element {
  webkitRequestFullscreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
}

interface VendorDocument extends Document {
  webkitExitFullscreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
}

type VendorNavigator = Omit<Navigator, 'wakeLock'> & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
};


interface DeviceCapabilities {
  webShare: boolean;
  clipboard: boolean;
  contacts: boolean;
  camera: boolean;
  geolocation: boolean;
  vibration: boolean;
  fullscreen: boolean;
  wakeLock: boolean;
  fileSystem: boolean;
}

export class DeviceIntegration {
  private capabilities: DeviceCapabilities;

  constructor() {
    this.capabilities = this.detectCapabilities();
    console.log('[Device] Detected capabilities:', this.capabilities);
  }

  /**
   * Detect available device capabilities
   */
  private detectCapabilities(): DeviceCapabilities {
    return {
      webShare: 'share' in navigator,
      clipboard: 'clipboard' in navigator,
      contacts: 'contacts' in navigator && 'ContactsManager' in window,
      camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      geolocation: 'geolocation' in navigator,
      vibration: 'vibrate' in navigator,
      fullscreen: 'requestFullscreen' in document.documentElement,
      wakeLock: 'wakeLock' in navigator,
      fileSystem: 'showOpenFilePicker' in window || 'webkitRequestFileSystem' in window
    };
  }

  /**
   * Get device capabilities
   */
  getCapabilities(): DeviceCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Share content using Web Share API or fallback
   */
  async shareContent(data: ShareData): Promise<boolean> {
    try {
      if (this.capabilities.webShare) {
        // Use native Web Share API
        await navigator.share(data);
        console.log('[Device] Content shared via Web Share API');
        return true;
      } else {
        // Fallback to clipboard copy
        const shareText = this.formatShareText(data);
        const copied = await this.copyToClipboard(shareText);
        
        if (copied) {
          console.log('[Device] Content copied to clipboard as fallback');
          // You could show a toast notification here
          return true;
        }
      }
    } catch (error) {
      console.error('[Device] Failed to share content:', error);
    }
    
    return false;
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (this.capabilities.clipboard) {
        // Use modern Clipboard API
        await navigator.clipboard.writeText(text);
        console.log('[Device] Text copied to clipboard');
        return true;
      } else {
        // Fallback to legacy method
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (success) {
          console.log('[Device] Text copied using fallback method');
        }
        return success;
      }
    } catch (error) {
      console.error('[Device] Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Vibrate device (for feedback)
   */
  vibrate(pattern: number | number[] = 200): boolean {
    try {
      if (this.capabilities.vibration) {
        navigator.vibrate(pattern);
        return true;
      }
    } catch (error) {
      console.error('[Device] Failed to vibrate:', error);
    }
    return false;
  }

  /**
   * Enter fullscreen mode
   */
  async enterFullscreen(element?: Element): Promise<boolean> {
    try {
      if (!this.capabilities.fullscreen) return false;

      const targetElement = (element || document.documentElement) as VendorFullscreenElement;
      
      if (targetElement.requestFullscreen) {
        await targetElement.requestFullscreen();
      } else if (targetElement.webkitRequestFullscreen) {
        await targetElement.webkitRequestFullscreen();
      } else if (targetElement.msRequestFullscreen) {
        await targetElement.msRequestFullscreen();
      }
      
      console.log('[Device] Entered fullscreen mode');
      return true;
    } catch (error) {
      console.error('[Device] Failed to enter fullscreen:', error);
      return false;
    }
  }

  /**
   * Exit fullscreen mode
   */
  async exitFullscreen(): Promise<boolean> {
    try {
      if (!this.capabilities.fullscreen) return false;

      const doc = document as VendorDocument;

      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
      
      console.log('[Device] Exited fullscreen mode');
      return true;
    } catch (error) {
      console.error('[Device] Failed to exit fullscreen:', error);
      return false;
    }
  }

  /**
   * Prevent device from sleeping (Wake Lock API)
   */
  async requestWakeLock(): Promise<WakeLockSentinel | null> {
    try {
      if (!this.capabilities.wakeLock) return null;

      const wakeLock = await (navigator as VendorNavigator).wakeLock?.request('screen');
      if (wakeLock) {
        console.log('[Device] Wake lock acquired');

        wakeLock.addEventListener('release', () => {
          console.log('[Device] Wake lock released');
        });
      }

      return wakeLock ?? null;
    } catch (error) {
      console.error('[Device] Failed to acquire wake lock:', error);
      return null;
    }
  }

  /**
   * Get current position using Geolocation API
   */
  async getCurrentPosition(): Promise<GeolocationPosition | null> {
    try {
      if (!this.capabilities.geolocation) return null;

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('[Device] Location acquired');
            resolve(position);
          },
          (error) => {
            console.error('[Device] Failed to get location:', error);
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      });
    } catch (error) {
      console.error('[Device] Geolocation error:', error);
      return null;
    }
  }

  /**
   * Open device camera for photo capture
   */
  async capturePhoto(): Promise<File | null> {
    try {
      if (!this.capabilities.camera) return null;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera
        audio: false
      });

      // Create a video element to capture the frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      return new Promise((resolve) => {
        video.addEventListener('loadedmetadata', () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0);
          
          canvas.toBlob((blob) => {
            stream.getTracks().forEach(track => track.stop());
            
            if (blob) {
              const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
              console.log('[Device] Photo captured');
              resolve(file);
            } else {
              resolve(null);
            }
          }, 'image/jpeg', 0.9);
        });
      });
    } catch (error) {
      console.error('[Device] Failed to capture photo:', error);
      return null;
    }
  }

  /**
   * Format share text from ShareData
   */
  private formatShareText(data: ShareData): string {
    let text = '';
    
    if (data.title) {
      text += data.title;
    }
    
    if (data.text) {
      text += (text ? '\n\n' : '') + data.text;
    }
    
    if (data.url) {
      text += (text ? '\n\n' : '') + data.url;
    }
    
    return text;
  }

  /**
   * Predefined sharing templates for soccer coaching scenarios
   */
  getShareTemplates() {
    return {
      gameResult: (teamName: string, score: string, date: string): ShareData => ({
        title: `🏆 Game Result - ${teamName}`,
        text: `${teamName} just finished their game!\n\nFinal Score: ${score}\nDate: ${date}\n\nTracked with MatchOps Cloud ⚽`,
        url: window.location.origin
      }),

      playerStats: (playerName: string, goals: number, assists: number): ShareData => ({
        title: `⭐ Player Stats - ${playerName}`,
        text: `${playerName}'s performance:\n🥅 Goals: ${goals}\n🎯 Assists: ${assists}\n\nTracked with MatchOps Cloud ⚽`,
        url: window.location.origin
      }),

      teamRoster: (teamName: string, playerCount: number): ShareData => ({
        title: `👥 Team Roster - ${teamName}`,
        text: `Check out our ${teamName} roster with ${playerCount} players!\n\nManaged with MatchOps Cloud ⚽`,
        url: window.location.origin
      }),

      appRecommendation: (): ShareData => ({
        title: '⚽ MatchOps Cloud - Soccer Coaching App',
        text: 'I\'ve been using MatchOps Cloud for my soccer team and it\'s amazing! Plan • Track • Debrief your matches with the ultimate coaching app. Perfect for coaches at any level!',
        url: window.location.origin
      }),

      gameInvite: (teamName: string, gameTime: string, location?: string): ShareData => ({
        title: `⚽ Game Invitation - ${teamName}`,
        text: `You're invited to watch ${teamName} play!\n\n📅 Time: ${gameTime}${location ? `\n📍 Location: ${location}` : ''}\n\nCome support the team! 🎉`,
        url: window.location.origin
      })
    };
  }
}

// Export singleton instance
export const deviceIntegration = new DeviceIntegration();