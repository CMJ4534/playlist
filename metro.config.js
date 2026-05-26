const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    moduleName === 'react-native-webview'
  ) {
    return {
      filePath: path.resolve(__dirname, 'react-native-webview.web.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
