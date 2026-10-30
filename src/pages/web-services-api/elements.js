import React from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';

// Stoplight Elements styles the whole document (for example the body font), and Docusaurus merges imported
// CSS into the stylesheet of every page. So Elements runs in an iframe, with its own copy of the files
// (static/vendor/stoplight-elements, copied from node_modules by a plugin in docusaurus.config.js).
export default function ElementsPage() {
  const specUrl = useBaseUrl('/openapi/joomla-6.2.0.json');
  const vendor = useBaseUrl('/vendor/stoplight-elements');
  const page = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="${vendor}/styles.min.css">
  <script src="${vendor}/web-components.min.js"></script>
  <style>html, body { height: 100%; margin: 0; }</style>
</head>
<body>
  <elements-api apiDescriptionUrl="${specUrl}" router="memory" layout="sidebar" hideSchemas="true" hideExport="true"></elements-api>
</body>
</html>`;

  return (
    <Layout title="Web Services API - Stoplight Elements" description="The Joomla Web Services API specification in Stoplight Elements">
      <main>
        <iframe
          title="Joomla Web Services API in Stoplight Elements"
          srcDoc={page}
          style={{width: '100%', height: 'calc(100vh - var(--ifm-navbar-height))', border: 0, display: 'block'}}
        />
      </main>
    </Layout>
  );
}
