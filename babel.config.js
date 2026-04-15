module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // WatermelonDB requires legacy decorator mode
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      // Reanimated plugin MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
