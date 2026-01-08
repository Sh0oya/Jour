import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.journaly.app',
  appName: 'Journaly',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Journaly'
  },
  server: {
    // Allow loading from Supabase and Stripe
    allowNavigation: [
      'lhcyhbudeybjqqjivifq.supabase.co',
      '*.stripe.com'
    ]
  }
};

export default config;
