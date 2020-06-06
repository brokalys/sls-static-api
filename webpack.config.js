const path = require('path');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const slsw = require('serverless-webpack');

require('dotenv').config();

const env = Object.entries(process.env).reduce(
  (common, [key, value]) => ({
    ...common,
    [`process.env.${key}`]: JSON.stringify(value),
  }),
  {},
);

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  mode: 'production',
  externals: [nodeExternals()],
  plugins: [new webpack.DefinePlugin(env)],
  output: {
    libraryTarget: 'commonjs',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
};
