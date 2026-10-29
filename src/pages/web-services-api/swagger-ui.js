import React, {useEffect, useRef} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';

// Swagger UI encodes path parameters, but with Apache's default AllowEncodedSlashes Off
// a %2F in the path of /v1/media/files/{path} gives a 404 before Joomla is reached.
function keepMediaPathSlashes(request) {
  request.url = request.url.replace(/(\/v1\/media\/files\/)([^?#]*)/, (match, prefix, path) =>
    prefix + path.replace(/%2F/gi, '/').replace(/%3A/gi, ':'));
  return request;
}

export default function SwaggerUiPage() {
  const specUrl = useBaseUrl('/openapi/joomla-6.2.0.json');
  const container = useRef(null);

  useEffect(() => {
    // The prebuilt bundle needs no Node polyfills in webpack; load it (and its CSS) on this page only.
    Promise.all([import('swagger-ui-dist/swagger-ui-es-bundle.js'), import('swagger-ui-dist/swagger-ui.css')])
      .then(([{default: SwaggerUIBundle}]) => {
        SwaggerUIBundle({
          url: specUrl,
          domNode: container.current,
          docExpansion: 'none',
          defaultModelsExpandDepth: -1,
          deepLinking: true,
          filter: true,
          requestInterceptor: keepMediaPathSlashes,
        });
      });
  }, [specUrl]);

  return (
    <Layout title="Web Services API - Swagger UI" description="The Joomla Web Services API specification in Swagger UI">
      <main className="container margin-vert--lg swagger-ui-page">
        <div ref={container}>Loading the API specification…</div>
      </main>
    </Layout>
  );
}
