const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Override the resolver to ensure TensorFlow JS loads the Browser/ESM version on the web, 
// rather than defaulting to the Node version which breaks due to util.TextEncoder
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web') {
        if (moduleName === '@tensorflow/tfjs-core') {
            return {
                filePath: require.resolve('@tensorflow/tfjs-core/dist/index.js'),
                type: 'sourceFile',
            };
        }
        if (moduleName === '@tensorflow/tfjs-converter') {
            return {
                filePath: require.resolve('@tensorflow/tfjs-converter/dist/index.js'),
                type: 'sourceFile',
            };
        }
        if (moduleName === '@tensorflow/tfjs-backend-webgl') {
            return {
                filePath: require.resolve('@tensorflow/tfjs-backend-webgl/dist/index.js'),
                type: 'sourceFile',
            };
        }
    }
    // Optionally, fall back to default resolution
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
