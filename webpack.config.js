const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = [
  {
    entry: './src/main.js',
    target: "electron-main",
    output: {
      filename: 'main.js',
      path: path.resolve(__dirname, 'dist', 'js'),
    },
    node: {
      __dirname: false,
    },
    module: {
      rules: [
        // {
        //   test: /\.png$/i,
        //   include: path.join(__dirname, 'icons'),
        //   use: {
        //     // loader: 'file-loader',
        //     // options: {
        //     //   name: '[path][name].png',
        //     // },
        //     // options: {
        //     //   name: '[name].png',
        //     //   outputPath: 'icons/',
        //     //   publicPath: 'icons/',
        //     // },
        //   },
        // }
        {
          test: /\.png$/,
          loader: 'url-loader?mimetype=image/png'
        },
        {
          test: /\.js$/,
          include: /node_modules\/yaml/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: "defaults" }]
              ],
              plugins: [
                '@babel/plugin-proposal-optional-chaining',
                '@babel/plugin-proposal-nullish-coalescing-operator',
              ]
            }
          }
        }
      ]
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, './src-frontend'),
            to: path.resolve(__dirname, './dist-frontend'),
          },
        ],
      }),
    ]
  },
  {
    entry: './src/view/timings_summary/preload.js',
    target: "electron-preload",
    output: {
      filename: 'preload.js',
      path: path.resolve(__dirname, 'dist/js/view/timings_summary'),
    },
  },
  {
    entry: './src/view/timings_history/preload.js',
    target: "electron-preload",
    output: {
      filename: 'preload.js',
      path: path.resolve(__dirname, 'dist/js/view/timings_history'),
    },
  },
  {
    entry: './src/view/timings_reports/timings_frequencies/preload.js',
    target: "electron-preload",
    output: {
      filename: 'preload.js',
      path: path.resolve(__dirname, 'dist/js/view/timings_reports/timings_frequencies'),
    },
  },
  {
    entry: './src/view/notebook/preload.js',
    target: "electron-preload",
    output: {
      filename: 'preload.js',
      path: path.resolve(__dirname, 'dist/js/view/notebook'),
    },
  },
  {
    entry: './src/view/composite/preload.js',
    target: "electron-preload",
    output: {
      filename: 'preload.js',
      path: path.resolve(__dirname, 'dist/js/view/composite'),
    },
  },
];