/* eslint-env node */

// Couldn't get the equivalent working in a .babelrc.
require('babel-register')({
  ignore: /node_modules\/(?!rxjs-es|lodash-es)/,
  presets: [
    'es2015'
  ],
  plugins: [
    'transform-object-assign'    
  ]
});
