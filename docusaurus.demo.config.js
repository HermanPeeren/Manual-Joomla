// Demo build of the Manual on GitHub Pages, to show the Web Services API reference.
// Wraps docusaurus.config.js; build with: npx docusaurus build --config docusaurus.demo.config.js
const config = require('./docusaurus.config.js');

config.url = process.env.DEMO_URL || 'https://hermanpeeren.github.io';
config.baseUrl = process.env.DEMO_BASE_URL || '/Manual-Joomla/';
config.noIndex = true;
// Only the upcoming docs are built, so links into older versions cannot be checked.
config.onBrokenLinks = 'warn';

const classic = config.presets.find(([name]) => name === 'classic')[1];
classic.docs.onlyIncludeVersions = ['current'];
classic.docs.lastVersion = 'current';
classic.docs.versions = {current: classic.docs.versions.current};

config.themeConfig.announcementBar = {
  id: 'api-reference-demo',
  content: 'Demo of a Web Services API reference for the Joomla Manual, not the official Manual: '
    + '<a href="https://manual.joomla.org">manual.joomla.org</a>. '
    + 'See the <a href="' + config.baseUrl + 'web-services-api/reference/">API reference (Scalar)</a> '
    + 'and <a href="' + config.baseUrl + 'web-services-api/swagger-ui/">Swagger UI</a>.',
  isCloseable: false,
};

module.exports = config;
