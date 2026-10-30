Web Services
============

Joomla has a REST API: other systems can read and change the content and configuration of a Joomla site over
HTTP. This page explains the concepts behind it and how to use it in your own extension.

:::tip[Concepts here, endpoints in the Web Services API section]

This page is about how Joomla's web services work. For the endpoints of the core components, their requests and
responses, authentication details and complete client examples, see the [Web Services API](../web-services-api/index.md)
section and its [OpenAPI reference](../web-services-api/openapi.md).

:::

## The API application

Next to the site and the administrator application, Joomla has a third application: the API application. Its
entry point is `/api/index.php`, and its client name is `api`, so `$app->isClient('api')` is true during an API
request. It has no templates, menu items or SEF URLs. A request goes to a versioned path:

```text
https://example.org/api/index.php/v1/content/articles
```

Requests send JSON. Responses use the [JSON:API](https://jsonapi.org) format with the media type
`application/vnd.api+json`. The API application checks the `Accept` header of the request; when it cannot
serve any of the requested media types, it answers with HTTP 406. See
[JSON response format](../web-services-api/json-response-format/index.md).

## Routes come from plugins

There is no fixed list of endpoints: plugins of the group `webservices` add routes to the API router when the
`onBeforeApiRoute` event is triggered. Each core component has such a plugin, for example
*Web Services - Content*. When the plugin is disabled, its routes do not exist and requests get HTTP 404.

Most plugins use `ApiRouter::createCRUDRoutes()`, which adds five routes for one resource:

| Method | Route | Controller task |
|--------|-------|-----------------|
| GET | `v1/content/articles` | `articles.displayList` |
| GET | `v1/content/articles/:id` | `articles.displayItem` |
| POST | `v1/content/articles` | `articles.add` |
| PATCH | `v1/content/articles/:id` | `articles.edit` |
| DELETE | `v1/content/articles/:id` | `articles.delete` |

```php
public function onBeforeApiRoute(BeforeApiRouteEvent $event): void
{
    $event->getRouter()->createCRUDRoutes(
        'v1/content/articles',
        'articles',
        ['component' => 'com_content']
    );
}
```

The third argument holds route defaults, such as the component that handles the request. With a fourth argument
`true`, the GET routes are public: they can be used without authentication.

## Controllers, views and models

A route points to a controller of the component in `api/components/com_example/src`:

- the controller extends `Joomla\CMS\MVC\Controller\ApiController`, which has the tasks `displayList`,
  `displayItem`, `add`, `edit` and `delete`;
- the view extends `Joomla\CMS\MVC\View\JsonApiView`; its `$fieldsToRenderList` and `$fieldsToRenderItem`
  decide which fields a response contains.

The API has no models of its own: it uses the administrator models, forms and tables of the component. So an
API request is validated, checked and saved in the same way as when you edit the item in the administrator, and
the same events are triggered: content, fields and action log plugins also run on API requests.

## Authentication and permissions

A request to a route that is not public must be authenticated. Plugins of the group `api-authentication` do this:

- *API Authentication - Web Services Joomla Token* accepts the API token of a user, as `Authorization: Bearer`
  header or `X-Joomla-Token` header. Users find their token in their profile, if the plugin
  *User - Joomla API Token* allows it for their user group (by default only Super Users).
- *API Authentication - Web Services Basic Auth* accepts a username and password. It is disabled by default.

The user must have the *Web Services Login* permission (`core.login.api`). After that, the normal permissions
of the component apply, just as in the administrator: for example `core.create` to add an article.

Browser scripts on another domain also need Cross-Origin Resource Sharing (CORS): see *Web Services* on the
*Server* tab of the Global Configuration.

## Using web services in your own extension

### Within the same site: use the models

Your extension does not need the web services to work with data of the site it runs on. Use the models of the
component directly; then there is no HTTP request, no token and no JSON:

```php
$model = $this->getApplication()->bootComponent('com_content')
    ->getMVCFactory()
    ->createModel('Article', 'Administrator', ['ignore_request' => true]);

$article = $model->getItem(1);
```

### Another site or system: call the API

Use the web services to work with another Joomla site, for example to synchronise articles or users between two
sites. In PHP, use Joomla's HTTP package rather than the PHP cURL functions:

```php
use Joomla\Http\HttpFactory;

$http     = (new HttpFactory())->getHttp();
$response = $http->get(
    'https://example.org/api/index.php/v1/content/articles',
    [
        'Accept'        => 'application/vnd.api+json',
        'Authorization' => 'Bearer ' . $token,
    ]
);

$articles = json_decode((string) $response->getBody(), true)['data'];
```

Keep the token of the other site out of your code and repository, for example in a parameter of your extension.
The [component guides](../web-services-api/index.md) of the Web Services API section have complete examples
for every endpoint, with error handling, and examples for browser scripts with `Joomla.request()` and `fetch()`.

### React to API requests

Your plugins also run during API requests. Use `$this->getApplication()->isClient('api')` when a plugin must
behave differently, for example when it changes HTML output that an API client does not need. The API
application triggers two events of its own: `onBeforeApiRoute`, to add routes, and `onAfterApiRoute`, after the
route has been found.

### Add routes to a core component

A `webservices` plugin can also add routes that are handled by your own component, next to the core routes.
Which endpoints exist depends on the installed and enabled plugins, so describe your own routes in your
documentation; the core [OpenAPI specification](../web-services-api/openapi.md) only covers Joomla core.

## Add web services to your own component

To give your own component an API, it needs:

- an `api` folder with an API controller and a JSON:API view, installed by the `<api>` section of the component
  manifest into `api/components/com_example`;
- a `webservices` plugin that adds the routes of your component in `onBeforeApiRoute`.

The [component development tutorial](../building-extensions/components/component-development-tutorial/index.md)
is the place for a step-by-step example.

## See also

- [Web Services API](../web-services-api/index.md): introduction, authentication and the guides per core component
- [OpenAPI reference](../web-services-api/openapi.md): the complete specification of the core endpoints
- [JSON response format](../web-services-api/json-response-format/index.md)
