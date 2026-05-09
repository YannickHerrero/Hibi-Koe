const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Bundle kuromoji's compressed dictionary files as binary assets so
// require("kuromoji-react-native/dict/*.dat.gz") resolves to a numeric
// asset id at runtime. Without this Metro tries to parse the gzipped
// bytes as JS and the bundle fails.
config.resolver.assetExts.push("gz");

module.exports = config;
