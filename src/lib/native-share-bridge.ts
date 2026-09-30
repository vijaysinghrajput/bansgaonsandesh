/**
 * Native Share Bridge for React Native WebView
 * Detects if running in the mobile app and enables native sharing
 */

export interface NativeShareData {
  title: string;
  text?: string;
  url: string;
  imageUrl?: string;
  description?: string;
  hashtags?: string[];
}

export interface DetectionResult {
  isNativeApp: boolean;
  isWebView: boolean;
  platform?: 'android' | 'ios' | 'web';
  userAgent: string;
}

/**
 * Detect if running in React Native WebView
 */
export const detectNativeApp = (): DetectionResult => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isNativeApp: false,
      isWebView: false,
      platform: 'web',
      userAgent: '',
    };
  }

  const userAgent = navigator.userAgent || '';
  
  // Check for React Native WebView indicators
  const isReactNativeWebView = !!(
    (window as any).ReactNativeWebView ||
    (window as any).nativeShare ||
    (window as any).openPost
  );

  // Additional checks
  const isAndroidWebView = /Android.*WebView/i.test(userAgent) && isReactNativeWebView;
  const isIOSWebView = /iPhone|iPad|iPod/.test(userAgent) && isReactNativeWebView;

  return {
    isNativeApp: isReactNativeWebView,
    isWebView: true,
    platform: isAndroidWebView ? 'android' : isIOSWebView ? 'ios' : 'web',
    userAgent,
  };
};

/**
 * Share content using native bridge if available, fallback to Web Share API
 */
export const shareNatively = async (data: NativeShareData): Promise<boolean> => {
  // Ensure we're in a browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    console.warn('shareNatively called in non-browser environment');
    return false;
  }

  const { isNativeApp } = detectNativeApp();

  // Prepare share content without repeating the title
const descriptionText = data.description?.substring(0, 150) || '';

const descriptionPart = descriptionText
  ? `${descriptionText}${data.description && data.description.length > 150 ? '...' : ''}`
  : '';

const shareMessage =
  `${descriptionPart}\n\n` +
  `📰 पूरी खबर पढ़ें: ${data.url}\n\n` +
  `📱 Bansgaon Sandesh App डाउनलोड करें:\n` +
  `https://play.google.com/store/apps/details?id=com.bansgaonsandesh.app`;

const shareData = {
  ...data,
  text: shareMessage,
  description: descriptionText,
};

  // Try native bridge first
  if (isNativeApp && typeof (window as any).nativeShare === 'function') {
    try {
      (window as any).nativeShare(shareData);
      return true;
    } catch (error) {
      console.error('Native share failed:', error);
    }
  }

  // Fallback to Web Share API
  if (navigator.share) {
    try {
      await navigator.share({
        title: data.title,
        text: shareMessage,
        url: data.url,
      });
      return true;
    } catch (error) {
      console.error('Web share failed:', error);
      return false;
    }
  }

  return false;
};

/**
 * Extract page preview data from meta tags
 */
export const getPagePreview = (): Omit<NativeShareData, 'hashtags'> & { hashtags?: string[] } => {
  // Ensure we're in a browser environment
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      title: '',
      description: '',
      imageUrl: '',
      url: '',
      text: '',
    };
  }

  const getMetaContent = (property: string, attribute = 'property') => {
    const tag = document.querySelector(`meta[${attribute}="${property}"]`);
    return tag?.getAttribute('content') || '';
  };

  const ogImage = getMetaContent('og:image');
  const ogTitle = getMetaContent('og:title');
  const ogDescription = getMetaContent('og:description');
  const twitterImage = getMetaContent('twitter:image', 'name');

  return {
    title: ogTitle || document.title,
    description: ogDescription,
    imageUrl: ogImage || twitterImage,
    url: window.location.href,
    text: ogDescription || document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
  };
};

/**
 * Get hashtags from page content
 */
export const extractHashtags = (): string[] => {
  // Ensure we're in a browser environment
  if (typeof document === 'undefined') {
    return ['#BansgaonSandesh'];
  }

  const tags = new Set<string>();

  // From meta tags
  const ogKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content');
  if (ogKeywords) {
    ogKeywords.split(',').forEach(tag => {
      const cleaned = tag.trim().replace(/^#+/, '');
      if (cleaned) tags.add(`#${cleaned}`);
    });
  }

  // Add default app hashtag
  tags.add('#BansgaonSandesh');

  return Array.from(tags).slice(0, 5); // Limit to 5 hashtags
};

/**
 * Share with automatic data extraction
 */
export const sharePageNatively = async (overrides?: Partial<NativeShareData>): Promise<boolean> => {
  const preview = getPagePreview();
  const hashtags = extractHashtags();

  const shareData: NativeShareData = {
    ...preview,
    hashtags,
    ...overrides,
  };

  return shareNatively(shareData);
};

/**
 * Open a post in the native app (if available)
 */
export const openPostNatively = (postId: string): boolean => {
  // Ensure we're in a browser environment
  if (typeof window === 'undefined') {
    return false;
  }

  if (typeof (window as any).openPost === 'function') {
    try {
      (window as any).openPost(postId);
      return true;
    } catch (error) {
      console.error('Failed to open post natively:', error);
    }
  }
  return false;
};

/**
 * Open a user profile in the native app (if available)
 */
export const openProfileNatively = (username: string): boolean => {
  // Ensure we're in a browser environment
  if (typeof window === 'undefined') {
    return false;
  }

  if (typeof (window as any).openProfile === 'function') {
    try {
      (window as any).openProfile(username);
      return true;
    } catch (error) {
      console.error('Failed to open profile natively:', error);
    }
  }
  return false;
};

/**
 * Get app store link for fallback
 */
export const getAppStoreLink = (platform?: 'android' | 'ios' | 'web'): string => {
  if (!platform) {
    const { platform: detectedPlatform } = detectNativeApp();
    platform = detectedPlatform as any;
  }

  const links = {
    android: 'https://play.google.com/store/apps/details?id=com.bansgaonsandesh.app',
    ios: 'https://apps.apple.com/app/bansgaon-sandesh/id...',
    web: 'https://bansgaonsandesh.com',
  };

  return links[platform || 'web'];
};

/**
 * Inject native bridge availability event
 */
export const waitForNativeBridge = (timeout = 5000): Promise<boolean> => {
  // Ensure we're in a browser environment
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const checkBridge = () => {
      if (typeof (window as any).nativeShare === 'function') {
        resolve(true);
        return;
      }
    };

    checkBridge();

    const listener = (event: Event) => {
      if (event.type === 'native-bridge-ready' || event.type === 'deep-link-bridge-ready') {
        resolve(true);
      }
    };

    window.addEventListener('native-bridge-ready', listener);
    window.addEventListener('deep-link-bridge-ready', listener);

    setTimeout(() => {
      window.removeEventListener('native-bridge-ready', listener);
      window.removeEventListener('deep-link-bridge-ready', listener);
      resolve(false);
    }, timeout);
  });
};

export default {
  detectNativeApp,
  shareNatively,
  sharePageNatively,
  getPagePreview,
  extractHashtags,
  openPostNatively,
  openProfileNatively,
  getAppStoreLink,
  waitForNativeBridge,
};
