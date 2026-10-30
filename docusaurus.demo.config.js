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

const openapi = config.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === 'docusaurus-plugin-openapi-docs');
openapi[1].config.joomla.downloadUrl = config.baseUrl + 'openapi/joomla-6.2.0.json';

const link = (path, text) => '<a href="' + config.baseUrl + path + '">' + text + '</a>';
config.themeConfig.announcementBar = {
  id: 'api-reference-demo',
  content: 'Demo for the Joomla Manual, not the official Manual (<a href="https://manual.joomla.org">manual.joomla.org</a>). '
    + 'Web Services API in: '
    + link('api-reference/joomla-6-2-0-core-web-services-api', 'pages per operation') + ' · '
    + link('web-services-api/reference/', 'Scalar') + ' · '
    + link('web-services-api/elements/', 'Stoplight Elements') + ' · '
    + link('web-services-api/swagger-ui/', 'Swagger UI') + '. '
    + 'Proposal: ' + link('docs/general-concepts/webservices', 'General Concepts: Web Services') + '.',
  isCloseable: false,
};

module.exports = config;
