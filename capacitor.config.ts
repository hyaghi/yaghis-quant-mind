import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.126631a937044dd3ac4010a4d23fbf60',
  appName: 'yaghi-quant-mind',
  webDir: 'dist',
  server: {
    url: 'https://126631a9-3704-4dd3-ac40-10a4d23fbf60.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;