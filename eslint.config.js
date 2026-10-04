const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  // Herramienta web independiente (Node + navegador), fuera de la app Expo.
  { ignores: ['higgsfield-web/**'] },
];
