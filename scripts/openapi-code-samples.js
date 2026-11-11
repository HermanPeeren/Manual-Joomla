/**
 * Adds code samples to every operation of the Web Services API specification ("x-codeSamples"): PHP with
 * Joomla\Http\HttpFactory, with the HTTP clients of WordPress, Drupal and TYPO3, and JavaScript with
 * Joomla.request(). The API reference pages show them as tabs; see languageTabs in docusaurus.config.js.
 *
 * Usage: node scripts/openapi-code-samples.js <source spec> <target spec>
 *
 * The source specification is not changed. The samples are static: they use the example values of the
 * specification, not the values entered in the "Send API request" form.
 */
const fs = require('fs');
const path = require('path');

const [source, target] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(source, 'utf8'));
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const PATH_DEFAULTS = {component_name: 'com_content', lang_code: 'en-GB'};

function resolveParameter(parameter) {
  if (!parameter.$ref) {
    return parameter;
  }
  return spec.components.parameters[parameter.$ref.split('/').pop()];
}

function pathValue(parameter) {
  if (parameter.example !== undefined) {
    return String(parameter.example);
  }
  if (PATH_DEFAULTS[parameter.name]) {
    return PATH_DEFAULTS[parameter.name];
  }
  return parameter.schema && parameter.schema.type === 'integer' ? '1' : 'COM_EXAMPLE_STRING';
}

/** The path with example values; slashes in a value are not encoded (see the media routes). */
function examplePath(route, parameters) {
  return route.replace(/\{([^}]+)\}/g, (match, name) => {
    const parameter = parameters.find((p) => p.in === 'path' && p.name === name);
    return parameter ? pathValue(parameter) : match;
  });
}

/** Query parameters for the sample: the required ones, and page[limit] for lists. */
function exampleQuery(parameters) {
  const query = {};
  for (const parameter of parameters) {
    if (parameter.in !== 'query') {
      continue;
    }
    if (parameter.name === 'page[limit]') {
      query[parameter.name] = 20;
    } else if (parameter.required) {
      query[parameter.name] = parameter.example ?? (parameter.schema && parameter.schema.default) ?? '';
    }
  }
  return query;
}

/** The first example of the JSON request body: "minimal" when there is one. */
function exampleBody(operation) {
  const media = operation.requestBody && operation.requestBody.content['application/json'];
  if (!media) {
    return undefined;
  }
  if (media.example !== undefined) {
    return media.example;
  }
  if (media.examples) {
    const key = media.examples.minimal ? 'minimal' : Object.keys(media.examples)[0];
    return media.examples[key].value;
  }
  return {};
}

function phpString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** A PHP array literal, short syntax, 4 spaces per level. */
function phpValue(value, indent = '') {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return phpString(value);
  }
  const inner = indent + '    ';
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return `[\n${value.map((item) => inner + phpValue(item, inner)).join(',\n')},\n${indent}]`;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) {
    return '[]';
  }
  const width = Math.max(...keys.map((key) => phpString(key).length));
  return `[\n${keys
    .map((key) => `${inner}${phpString(key).padEnd(width)} => ${phpValue(value[key], inner)}`)
    .join(',\n')},\n${indent}]`;
}

function phpSample(method, route, query, body) {
  const lines = [
    '<?php',
    'use Joomla\\Http\\HttpFactory;',
    '',
    '// The API of the Joomla site, and the API token of a user who is allowed to do this',
    "$apiUrl = 'https://example.com/api/index.php';",
    "$token  = 'YOUR_API_TOKEN';",
    '',
  ];
  let url = `$apiUrl . ${phpString(route)}`;
  if (Object.keys(query).length) {
    lines.push(`$query = ${phpValue(query)};`, '');
    url += " . '?' . http_build_query($query)";
  }
  if (body !== undefined) {
    lines.push(`$data = ${phpValue(body)};`, '');
  }
  const headers = ["    'Accept'         => 'application/vnd.api+json',"];
  if (body !== undefined) {
    headers.push("    'Content-Type'   => 'application/json',");
  }
  headers.push("    'X-Joomla-Token' => $token,");
  lines.push('$headers = [', ...headers, '];', '');
  lines.push('$http     = (new HttpFactory())->getHttp();');
  const args = body !== undefined ? `${url}, json_encode($data, JSON_THROW_ON_ERROR), $headers` : `${url}, $headers`;
  lines.push(`$response = $http->${method}(${args});`, '');
  lines.push(
    '$status = $response->getStatusCode();',
    '$body   = (string) $response->getBody();',
    '',
    'if ($status >= 400) {',
    "    throw new \\RuntimeException('HTTP ' . $status . ': ' . $body);",
    '}',
    '',
  );
  if (method === 'delete') {
    lines.push('// Success: 204 No Content, with an empty body');
  } else {
    lines.push('$document = json_decode($body, true, 512, JSON_THROW_ON_ERROR);');
  }
  return lines.join('\n') + '\n';
}

/** The end of a PHP sample: check the status and decode the body. */
function phpResult(method) {
  return [
    'if ($status >= 400) {',
    "    throw new \\RuntimeException('HTTP ' . $status . ': ' . $body);",
    '}',
    '',
    method === 'delete'
      ? '// Success: 204 No Content, with an empty body'
      : '$document = json_decode($body, true, 512, JSON_THROW_ON_ERROR);',
  ];
}

/** The headers of a request, as a PHP array literal with the given indent. */
function phpHeaders(body, indent, tokenVariable = '$token') {
  const lines = [`${indent}    'Accept'         => 'application/vnd.api+json',`];
  if (body !== undefined) {
    lines.push(`${indent}    'Content-Type'   => 'application/json',`);
  }
  lines.push(`${indent}    'X-Joomla-Token' => ${tokenVariable},`);
  return ['[', ...lines, `${indent}]`].join('\n');
}

/** WordPress: the HTTP API (wp_remote_request). */
function wordpressSample(method, route, query, body) {
  const lines = [
    '<?php',
    '// In a WordPress plugin or theme. The API of the Joomla site, and the API token of a user who may do this',
    "$api_url = 'https://example.com/api/index.php';",
    "$token   = 'YOUR_API_TOKEN';",
    '',
  ];
  let url = `$api_url . ${phpString(route)}`;
  if (Object.keys(query).length) {
    lines.push(`$query = ${phpValue(query)};`, '');
    url += " . '?' . http_build_query($query)";
  }
  if (body !== undefined) {
    lines.push(`$data = ${phpValue(body)};`, '');
  }
  lines.push(
    `$response = wp_remote_request(${url}, [`,
    `    'method'  => '${method.toUpperCase()}',`,
    `    'headers' => ${phpHeaders(body, '    ')},`,
  );
  if (body !== undefined) {
    lines.push("    'body'    => wp_json_encode($data),");
  }
  lines.push(
    "    'timeout' => 30,",
    ']);',
    '',
    'if (is_wp_error($response)) {',
    '    throw new \\RuntimeException($response->get_error_message());',
    '}',
    '',
    '$status = wp_remote_retrieve_response_code($response);',
    '$body   = wp_remote_retrieve_body($response);',
    '',
    ...phpResult(method),
  );
  return lines.join('\n') + '\n';
}

/** Drupal: the http_client service (Guzzle). */
function drupalSample(method, route, query, body) {
  const lines = [
    '<?php',
    '// In a Drupal module. In a service or controller, inject the http_client service instead of \\Drupal::httpClient().',
    '// The API of the Joomla site, and the API token of a user who is allowed to do this',
    "$apiUrl = 'https://example.com/api/index.php';",
    "$token  = 'YOUR_API_TOKEN';",
    '',
  ];
  if (Object.keys(query).length) {
    lines.push(`$query = ${phpValue(query)};`, '');
  }
  if (body !== undefined) {
    lines.push(`$data = ${phpValue(body)};`, '');
  }
  lines.push(
    `$response = \\Drupal::httpClient()->request('${method.toUpperCase()}', $apiUrl . ${phpString(route)}, [`,
    `    'headers'     => ${phpHeaders(undefined, '    ')},`,
  );
  if (Object.keys(query).length) {
    lines.push("    'query'       => $query,");
  }
  if (body !== undefined) {
    lines.push("    'json'        => $data,");
  }
  lines.push(
    "    'http_errors' => false,",
    "    'timeout'     => 30,",
    ']);',
    '',
    '$status = $response->getStatusCode();',
    '$body   = (string) $response->getBody();',
    '',
    ...phpResult(method),
  );
  return lines.join('\n') + '\n';
}

/** TYPO3: the RequestFactory of TYPO3 core (Guzzle). */
function typo3Sample(method, route, query, body) {
  const lines = [
    '<?php',
    'use TYPO3\\CMS\\Core\\Http\\RequestFactory;',
    'use TYPO3\\CMS\\Core\\Utility\\GeneralUtility;',
    '',
    '// In a TYPO3 extension. In a service or controller, inject RequestFactory in the constructor instead.',
    '// The API of the Joomla site, and the API token of a user who is allowed to do this',
    "$apiUrl = 'https://example.com/api/index.php';",
    "$token  = 'YOUR_API_TOKEN';",
    '',
  ];
  let url = `$apiUrl . ${phpString(route)}`;
  if (Object.keys(query).length) {
    lines.push(`$query = ${phpValue(query)};`, '');
    url += " . '?' . http_build_query($query)";
  }
  if (body !== undefined) {
    lines.push(`$data = ${phpValue(body)};`, '');
  }
  lines.push(
    '$requestFactory = GeneralUtility::makeInstance(RequestFactory::class);',
    `$response = $requestFactory->request(${url}, '${method.toUpperCase()}', [`,
    `    'headers'     => ${phpHeaders(body, '    ')},`,
  );
  if (body !== undefined) {
    lines.push("    'body'        => json_encode($data, JSON_THROW_ON_ERROR),");
  }
  lines.push(
    "    'http_errors' => false,",
    "    'timeout'     => 30,",
    ']);',
    '',
    '$status = $response->getStatusCode();',
    '$body   = (string) $response->getBody();',
    '',
    ...phpResult(method),
  );
  return lines.join('\n') + '\n';
}

function jsSample(method, route, query, body) {
  const lines = [
    "// In a Joomla page that loads the 'core' script; the token of the signed-in user, never a shared one",
    "const apiUrl = 'https://example.com/api/index.php';",
    "const token = 'YOUR_API_TOKEN';",
    '',
  ];
  let url = `apiUrl + ${JSON.stringify(route)}`;
  if (Object.keys(query).length) {
    lines.push(`const query = new URLSearchParams(${JSON.stringify(query)});`, '');
    url += " + '?' + query";
  }
  if (body !== undefined) {
    lines.push(`const data = ${JSON.stringify(body, null, 2)};`, '');
  }
  lines.push('let xhr;', 'try {', '  xhr = await Joomla.request({', `    url: ${url},`, `    method: '${method.toUpperCase()}',`);
  lines.push('    headers: {', "      Accept: 'application/vnd.api+json',");
  if (body !== undefined) {
    lines.push("      'Content-Type': 'application/json',");
  }
  lines.push("      'X-Joomla-Token': token,", '    },');
  if (body !== undefined) {
    lines.push('    data: JSON.stringify(data),');
  }
  lines.push(
    '    promise: true,',
    '  });',
    '} catch (error) {',
    '  // Joomla.request() rejects every status other than 200, also 204 No Content',
    '  if (!(error instanceof XMLHttpRequest)) throw error;',
    '  xhr = error;',
    '}',
    '',
    'if (xhr.status >= 400) {',
    '  throw new Error(`HTTP ${xhr.status}: ${xhr.responseText}`);',
    '}',
    '',
  );
  if (method === 'delete') {
    lines.push('// Success: 204 No Content, with an empty body');
  } else {
    lines.push('const result = JSON.parse(xhr.responseText);');
  }
  return lines.join('\n') + '\n';
}

let count = 0;
for (const [route, item] of Object.entries(spec.paths)) {
  for (const method of METHODS) {
    const operation = item[method];
    if (!operation) {
      continue;
    }
    const parameters = [...(item.parameters || []), ...(operation.parameters || [])].map(resolveParameter);
    const samplePath = examplePath(route, parameters);
    const query = exampleQuery(parameters);
    const body = exampleBody(operation);
    const samples = [
      {lang: 'PHP', label: 'Joomla HttpFactory', source: phpSample(method, samplePath, query, body)},
      {lang: 'PHP', label: 'WordPress', source: wordpressSample(method, samplePath, query, body)},
      {lang: 'PHP', label: 'Drupal', source: drupalSample(method, samplePath, query, body)},
      {lang: 'PHP', label: 'TYPO3', source: typo3Sample(method, samplePath, query, body)},
      {lang: 'JavaScript', label: 'Joomla.request', source: jsSample(method, samplePath, query, body)},
    ];
    const labels = samples.map((sample) => sample.label);
    operation['x-codeSamples'] = [
      ...(operation['x-codeSamples'] || []).filter((sample) => !labels.includes(sample.label)),
      ...samples,
    ];
    count++;
  }
}

fs.mkdirSync(path.dirname(target), {recursive: true});
fs.writeFileSync(target, JSON.stringify(spec, null, 2) + '\n');
console.log(`Code samples added to ${count} operations: ${target}`);
