const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api/admin',
    createProxyMiddleware({
      target: 'https://toc-adminbackend.vercel.app',
      changeOrigin: true,
      secure: true,
    })
  );
};