// Sidebar of the generated API reference (see the 'api-reference' docs instance in docusaurus.config.js).
// api-reference/sidebar.ts only exists after `npx docusaurus gen-api-docs all`.
const fs = require('fs');
const path = require('path');

const generated = path.join(__dirname, 'api-reference', 'sidebar.ts');
const overview = 'joomla-6-2-0-core-web-services-api';

// With groupPathsBy 'tagGroup' the generator puts the overview page in the first group; put it on top.
function withoutOverview(items) {
  return items
    .filter((item) => !(item.type === 'doc' && item.id === overview))
    .map((item) => (item.items ? {...item, items: withoutOverview(item.items)} : item));
}

function apiSidebar() {
  if (!fs.existsSync(generated)) {
    return [];
  }
  const module = require(generated);
  return [{type: 'doc', id: overview, label: 'Overview'}, ...withoutOverview(module.default ?? module)];
}

module.exports = {
  apiSidebar: apiSidebar(),
};
