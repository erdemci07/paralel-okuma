import type { CapacitorConfig } from '@capacitor/cli'

// appId, Firebase Console'da eklenecek iOS (Bundle ID) ve Android (package name)
// uygulamalarıyla birebir aynı olmalı. Değiştirirsen her iki yerde de değiştir.
const config: CapacitorConfig = {
  appId: 'com.paralelokuma.app',
  appName: 'Paralel Okuma',
  webDir: 'dist',
  experimental: {
    ios: {
      spm: {
        // SwiftPM paket kimliği çakışmasını önler (plugin dokümantasyonu).
        packageOptions: {
          '@capacitor-firebase/messaging': { symlink: true },
        },
      },
    },
  },
  plugins: {
    FirebaseMessaging: {
      // Uygulama ön plandayken de bildirim banner'ı gösterilsin.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
