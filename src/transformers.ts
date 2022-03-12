import { Configuration, ModuleOptions, RuleSetRule } from 'webpack';
import { Config, JsMinifyOptions } from '@swc/core';
import TerserPlugin from 'terser-webpack-plugin';

const babelLoaderPattern = /babel-loader/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createSwcLoader = (options: Config): Record<string, any> => {
  return {
    loader: require.resolve('swc-loader'),
    options: {
      parseMap: !!options.sourceMaps,
      ...options,
    },
  };
};

export const replaceRuleSetRule = (rule: ModuleOptions['rules'][0], options: Config): RuleSetRule => {
  if (!('test' in rule && rule.test instanceof RegExp)) return rule;
  if (!rule.test.test('dummy.js') && !rule.test.test('dummy.ts')) return rule;

  if (rule.oneOf) {
    return {
      ...rule,
      oneOf: replaceRuleSetRule(rule.oneOf, options),
    };
  }

  if (rule.loader) {
    if (!babelLoaderPattern.test(rule.loader)) return rule;
    return { ...rule, use: [createSwcLoader(options)] };
  }

  if (typeof rule.use === 'string') {
    if (!babelLoaderPattern.test(rule.use)) return rule;
    return { ...rule, use: [createSwcLoader(options)] };
  }

  if (Array.isArray(rule.use)) {
    return {
      ...rule,
      use: rule.use.map(item => {
        if (typeof item === 'string' && item.includes('babel-loader')) {
          return createSwcLoader(options);
        }
        if (typeof item.loader === 'string' && babelLoaderPattern.test(item.loader)) {
          return createSwcLoader(options);
        }
        return item;
      }),
    };
  }

  return rule;
};

export const replaceLoader = (options: Config): (config: Configuration) => Configuration => {
  return (config: Configuration) => ({
    ...config,
    module: {
      ...config.module,
      rules: config.module?.rules?.map(rule => replaceRuleSetRule(rule, options)),
    },
  });
};

export const replaceMinimizer = (options: JsMinifyOptions): (config: Configuration) => Configuration => {
  return (config: Configuration) => ({
    ...config,
    optimization: {
      minimizer: [
        new TerserPlugin({
          minify: TerserPlugin.swcMinify,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          terserOptions: options as any,
        }),
      ],
    },
  });
};

export const disableSourceMap = (config: Configuration): Configuration => {
  return {
    ...config,
    devtool: false,
  };
};
