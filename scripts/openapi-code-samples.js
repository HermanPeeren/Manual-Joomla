/**
 * Adds code samples in "the Joomla way" to every operation of the Web Services API specification:
 * PHP with Joomla\Http\HttpFactory and JavaScript with Joomla.request(). The API reference pages of
 * docusaurus-openapi-docs show them as extra tabs ("x-codeSamples") under PHP and JavaScript.
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
    operation['x-codeSamples'] = [
      ...(operation['x-codeSamples'] || []).filter((sample) => !sample.label || !sample.label.startsWith('Joomla')),
      {lang: 'PHP', label: 'Joomla HttpFactory', source: phpSample(method, samplePath, query, body)},
      {lang: 'JavaScript', label: 'Joomla.request', source: jsSample(method, samplePath, query, body)},
    ];
    count++;
  }
}

fs.mkdirSync(path.dirname(target), {recursive: true});
fs.writeFileSync(target, JSON.stringify(spec, null, 2) + '\n');
console.log(`Code samples added to ${count} operations: ${target}`);
