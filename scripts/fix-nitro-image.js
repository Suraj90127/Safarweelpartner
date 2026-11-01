const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const nitroSource = path.join(projectRoot, 'node_modules', 'react-native-nitro-image', 'nitrogen', 'generated');
const nitroTarget = path.join(projectRoot, 'node_modules', 'react-native-nitro-image', 'android', 'nitrogen', 'generated');

if (fs.existsSync(nitroSource)) {
  fs.mkdirSync(nitroTarget, { recursive: true });
  fs.cpSync(nitroSource, nitroTarget, { recursive: true });
  console.log('✅ Successfully synced react-native-nitro-image generated nitrogen files for Android.');
}
