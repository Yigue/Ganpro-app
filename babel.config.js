module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // WatermelonDB requires legacy decorator mode
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      // Reanimated 4.x: plugin moved to react-native-worklets/plugin (MUST be last)
      'react-native-worklets/plugin',
    ],
  };
};
