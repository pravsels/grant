
const path = require('path');
const { EsbuildPlugin } = require('esbuild-loader');

module.exports = {
  mode: 'production',              // switch to 'production' for your final build
  entry: './src/index.jsx',         // the app’s entrypoint
  output: {
    path: path.resolve(__dirname, 'web'),
    filename: 'bundle.js',          // this is what you’ll load in index.html
  },
  resolve: {
    extensions: ['.js', '.jsx'],    // lets you import without specifying extensions
  },
  optimization: {
    minimize: true,
    minimizer: [
      new EsbuildPlugin({
        target: 'es2020',
        css: true,
      })
    ],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,            // for .js and .jsx files
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/,             // if you import CSS
        use: ['style-loader', 'css-loader'],
      }
    ],
  },
  devtool: 'source-map',            // helpful for debugging
};
