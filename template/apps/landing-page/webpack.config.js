const [server, client] = require('nullstack/webpack.config');

function customClient(...args) {
  const config = client(...args);
  const rule = config.module?.rules?.find((rule) => rule.test?.test?.('.css'));
  if (rule) {
    rule.use.push({
      loader: require.resolve('postcss-loader'),
      options: {
        postcssOptions: {
          plugins: {
            tailwindcss: {},
          },
        },
      },
    });
  }
  return config;
}

function customServer(...args) {
  const config = server(...args);
  return config;
}

module.exports = [customServer, customClient];
