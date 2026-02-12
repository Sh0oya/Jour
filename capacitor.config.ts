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
      '*.stripe.com',
      'www.ppc-digital.fr',
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'generativelanguage.googleapis.com',
      '*.googleapis.com'
    ]
  }
};

export default config;
