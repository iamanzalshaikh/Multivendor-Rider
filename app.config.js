/**
 * Expo config — production cleartext off; no Google Maps.
 * @see https://docs.expo.dev/workflow/configuration/
 */
const appJson = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
const expo = {
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    permissions: (appJson.expo.android?.permissions || []).filter(
      (p) =>
        p !== 'android.permission.RECORD_AUDIO' &&
        p !== 'android.permission.ACCESS_BACKGROUND_LOCATION' &&
        p !== 'android.permission.FOREGROUND_SERVICE_LOCATION',
    ),
  },
  plugins: (appJson.expo.plugins || []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-build-properties') {
      return [
        'expo-build-properties',
        {
          android: {
            newArchEnabled: false,
            usesCleartextTraffic: process.env.EAS_BUILD_PROFILE !== 'production',
          },
          ios: {
            newArchEnabled: false,
          },
        },
      ];
    }
    return plugin;
  }),
};

module.exports = { expo };
