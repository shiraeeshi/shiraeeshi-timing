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
  {
    entry: './src-frontend/composite/composite_main_window.renderer.js',
    target: "electron-renderer",
    output: {
      filename: 'composite_main_window.bundle.js',
      path: path.resolve(__dirname, 'dist-frontend/composite'),
    },
  },
  {
    entry: './src-frontend/notebook/notebook.renderer.js',
    target: "electron-renderer",
    output: {
      filename: 'notebook.bundle.js',
      path: path.resolve(__dirname, 'dist-frontend/notebook'),
    },
    optimization: {
      minimize: false,
    },
  },
  {
    entry: './src-frontend/timings_reports/timings_frequencies.renderer.js',
    target: "electron-renderer",
    output: {
      filename: 'timings_frequencies.bundle.js',
      path: path.resolve(__dirname, 'dist-frontend/timings_reports'),
    },
    optimization: {
      minimize: false,
    },
  },
  {
    entry: './src-frontend/timings_history/latest.renderer.js',
    target: "electron-renderer",
    output: {
      filename: 'latest.bundle.js',
      path: path.resolve(__dirname, 'dist-frontend/timings_history'),
    },
  },
  {
    entry: './src-frontend/timings_summary.renderer.js',
    target: "electron-renderer",
    output: {
      filename: 'timings_summary.bundle.js',
      path: path.resolve(__dirname, 'dist-frontend'),
    },
  },
];
