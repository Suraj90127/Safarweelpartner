module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);

  return {
    presets: [
      ['module:@react-native/babel-preset', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      '@babel/plugin-transform-export-namespace-from',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
          extensions: ['.ios.ts', '.android.ts', '.ts', '.tsx', '.js', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};