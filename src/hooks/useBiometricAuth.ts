import { useState, useEffect } from 'react';
import { Device } from '@capacitor/device';

interface BiometricAuthOptions {
  title?: string;
  subtitle?: string;
  description?: string;
  fallbackButtonTitle?: string;
  negativeButtonTitle?: string;
}

export const useBiometricAuth = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const info = await Device.getInfo();
      // Check if we're on a mobile platform
      const isMobile = info.platform === 'ios' || info.platform === 'android';
      setIsSupported(isMobile);
      
      // For now, we'll assume biometrics are available on mobile devices
      // In a real implementation, you'd use a proper biometric plugin
      setIsAvailable(isMobile);
    } catch (error) {
      console.error('Error checking biometric support:', error);
      setIsSupported(false);
      setIsAvailable(false);
    }
  };

  const authenticate = async (options: BiometricAuthOptions = {}): Promise<boolean> => {
    if (!isAvailable) {
      throw new Error('Biometric authentication is not available');
    }

    try {
      // This is a mock implementation
      // In a real app, you'd use a biometric authentication plugin
      return new Promise((resolve) => {
        // Simulate biometric prompt
        const confirmed = window.confirm(
          options.title || 'Authenticate with biometrics'
        );
        setTimeout(() => resolve(confirmed), 1000);
      });
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  };

  return {
    isSupported,
    isAvailable,
    authenticate,
    checkBiometricSupport
  };
};