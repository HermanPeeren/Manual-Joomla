import React, {useEffect, useRef} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useColorMode} from '@docusaurus/theme-common';

function ApiReference() {
  const specUrl = useBaseUrl('/openapi/joomla-6.2.0.json');
  const {colorMode} = useColorMode();
  const container = useRef(null);
  const reference = useRef(null);

  const configuration = {
    url: specUrl,
    hideModels: true,
    defaultOpenFirstTag: false,
    hideDarkModeToggle: true,
    forceDarkModeState: colorMode,
    showDeveloperTools: 'never',
    agent: {disabled: true},
    authentication: {preferredSecurityScheme: 'BearerAuth'},
  };

  useEffect(() => {
    // Scalar is bundled with the site (no CDN) and only loaded on this page.
    let cancelled = false;
    Promise.all([import('@scalar/api-reference'), import('@scalar/api-reference/style.css')])
      .then(([{createApiReference}]) => {
        if (!cancelled) {
          reference.current = createApiReference(container.current, configuration);
        }
      });
    return () => {
      cancelled = true;
      reference.current?.destroy();
    };
  }, [specUrl]);

  useEffect(() => {
    reference.current?.updateConfiguration(configuration);
  }, [colorMode]);

  return <div ref={container}>Loading the API specification…</div>;
}

export default function ApiReferencePage() {
  return (
    <Layout title="Web Services API" description="Reference of the Joomla Web Services API">
      <main className="api-reference-page">
        <ApiReference />
      </main>
    </Layout>
  );
}
