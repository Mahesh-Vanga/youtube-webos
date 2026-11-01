import CopyPlugin from 'copy-webpack-plugin';
import { TransformAsyncModulesPlugin } from 'transform-async-modules-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import pkgJson from './package.json' with { type: 'json' };
import webpack from 'webpack';
import { basename, resolve } from 'node:path';

/**
 * @param input {Buffer<ArrayBufferLike>}
 * @returns {string}
 */
function transformAppInfo(input) {
  const appInfo = JSON.parse(input.toString());
  appInfo.version = pkgJson.version;
  return JSON.stringify(appInfo, null, 2);
}

/** @type {(env: Record<string, string>, argv: { mode?: string }) => (import('webpack').Configuration)[]} */
const makeConfig = (_env, argv) => {
  const main = {
    /**
     * NOTE: Builds with devtool = 'eval' contain very big eval chunks which seem
     * to cause segfaults (at least) on nodeJS v0.12.2 used on webOS 3.x.
     */
    devtool: argv.mode === 'development' ? 'inline-source-map' : 'source-map',

    optimization: {
      /**
       * terser doesn't pickup browserlist config
       * See: https://github.com/terser/terser/issues/235
       */
      minimizer: [new TerserPlugin({ terserOptions: { ecma: 5 } })]
    },

    entry: {
      index: './src/index.js',
      userScript: {
        import: './src/userScript',
        filename: 'webOSUserScripts/[name].js'
      }
    },

    resolve: {
      extensions: ['.mjs', '.cjs', '.js', '.json', '.ts']
    },

    module: {
      rules: [
        {
          test: /\.[mc]?[jt]s$/i,

          loader: 'babel-loader',
          exclude: [
            // Some module should not be transpiled by Babel
            // See https://github.com/zloirock/core-js/issues/743#issuecomment-572074215
            // \\ for Windows, / for macOS and Linux
            /node_modules[\\/]core-js/,
            /node_modules[\\/]webpack[\\/]buildin/
          ],
          options: {
            cacheDirectory: true
          },
          resolve: {
            // File extension DON'T MATTER in a bundler.
            fullySpecified: false
          }
        },
        {
          test: /\.css$/i,
          use: [
            { loader: 'style-loader' },
            {
              loader: 'css-loader',
              options: { esModule: false, importLoaders: 1 }
            },
            'postcss-loader'
          ]
        }
      ]
    },

    plugins: [
      new CopyPlugin({
        patterns: [
          {
            context: 'assets',
            from: '**/*',
            transform: {
              transformer(input, absolutePath) {
                if (basename(absolutePath) === 'appinfo.json') {
                  return transformAppInfo(input);
                }
                return input;
              }
            }
          },
          { context: 'src', from: 'index.html' },
          { from: 'LICENSE' },
          { from: 'NOTICE' }
        ]
      }),
      // babel doesn't transform top-level await.
      // webpack transforms it to async modules.
      // This plugin calls babel again to transform remove the `async` keyword usage after the fact.
      new TransformAsyncModulesPlugin({
        runtime: {
          // The plugin types predate Babel's moduleName option. Use the same
          // installed runtime as the source transform rather than @babel/runtime.
          ...{ moduleName: '@babel/runtime-corejs3' },
          version: pkgJson.dependencies['@babel/runtime-corejs3'],
          absoluteRuntime: './node_modules/@babel/runtime-corejs3'
        }
      }),
      new webpack.DefinePlugin({
        __YTAF_VERSION__: JSON.stringify(pkgJson.version)
      })
    ]
  };
  return [
    main,
    {
      ...main,
      entry: { index: './launcher/index.js' },
      output: {
        path: resolve('dist-launcher'),
        filename: '[name].js',
        clean: true
      },
      optimization: {
        minimizer: [new TerserPlugin({ terserOptions: { ecma: 5 } })]
      },
      plugins: [
        new CopyPlugin({
          patterns: [
            {
              from: 'launcher/appinfo.json',
              to: 'appinfo.json',
              transform: transformAppInfo
            },
            { from: 'launcher/index.html', to: 'index.html' },
            { from: 'assets/icon.png', to: 'icon.png' },
            { from: 'assets/largeIcon.png', to: 'largeIcon.png' },
            { from: 'LICENSE' },
            { from: 'NOTICE' }
          ]
        })
      ]
    }
  ];
};

export default makeConfig;
