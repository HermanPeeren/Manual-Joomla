Thanks @sergeytolkachyov, great work! Following up on our Mattermost conversation here, so it stays with the PR.

## In short

Your specification is more complete than [mine](https://github.com/HermanPeeren/Joomla-OpenAPI), so it is the basis. I tested it against a Joomla 6.2.0 site, improved it, and built a demo of the Manual with four ways to show it:
**https://hermanpeeren.github.io/Manual-Joomla/** (a demo, not indexed by search engines).
My proposal: merge this PR with the improved specification, add the per-operation pages of docusaurus-openapi-docs (Harald's [#82](https://github.com/joomla/Manual/pull/82) concept) in a follow-up PR, rework General Concepts › Web Services into a concepts page, and keep the specification itself in [joomla-projects/API-Endpoints](https://github.com/joomla-projects/API-Endpoints) as the single source.

## How I got there

### Specification

I compared your `joomla-6.2.0.json` with [my earlier one](https://github.com/HermanPeeren/Joomla-OpenAPI). Yours has 236 operations with request and response schemas, mine 182 with mostly `todo` responses. I added what mine did better and tested everything on a fresh 6.2.0 site. All changes, with the reasons, are in [CHANGES-joomla-6.2.0.md](https://github.com/HermanPeeren/Joomla-OpenAPI/blob/main/CHANGES-joomla-6.2.0.md); a script ([tools/enhance_spec.py](https://github.com/HermanPeeren/Joomla-OpenAPI/blob/main/tools/enhance_spec.py)) applies them to your original, so they can be re-applied when your file changes. The main points:

- readable summaries ("List Banners", "Add Banner"), resource tags grouped by component (`x-tagGroups`)
- authentication: `Authorization: Bearer` first (Joomla reads it first), `X-Joomla-Token` and Basic as alternatives; the `X-JUpdate-Token` header parameter duplicated its security scheme
- a server URL with variables (`{scheme}://{site}/api/index.php`), so viewers can "try it" against any site
- 102 responses captured from the test site replace the derived examples (`"Example"` placeholders)
- 68 response schema corrections where real responses differ, mainly `id` inside `attributes`, which 56 schemas did not allow, so real responses were invalid
- media paths: Apache answers an encoded slash (`%2F`) with its own 404, so viewers must not encode `{path}`; the trailing-slash folder path is merged into `/v1/media/files/{path}`, and the missing `path` query parameter is added
- repeated responses and parameters moved to `components` (9.2 MB → 6.5 MB, including the captured examples)
- still open: on a fresh site several POSTs fail without `description` or `params`, which the request schemas do not mark as required; 5 responses still differ from their schema (listed in CHANGES)

### Viewers

The demo shows four options on the same specification, all within Docusaurus:

| | Demo | Notes |
|---|---|---|
| docusaurus-openapi-docs | [pages per operation](https://hermanpeeren.github.io/Manual-Joomla/api-reference/joomla-6-2-0-core-web-services-api) | Pages in the Manual's own layout and sidebar, code samples, "send request". Version 4.7.1 works with the Manual's Docusaurus 3.9 (version 5 needs 3.10). In a separate docs instance, generated at build time: no generated files in `docs/`, no `docItemComponent` on the whole Manual (the issues of #82). The demo build (current version only) takes about 6 instead of 3 minutes. |
| Scalar | [single page](https://hermanpeeren.github.io/Manual-Joomla/web-services-api/reference/) | Nicest single-page viewer, follows dark mode. Do not use `@scalar/docusaurus`: it loads Scalar unpinned from a CDN on *every* page. |
| Stoplight Elements | [single page](https://hermanpeeren.github.io/Manual-Joomla/web-services-api/elements/) | Polished, but its CSS styles the whole document, so it needs an iframe. |
| Swagger UI | [single page](https://hermanpeeren.github.io/Manual-Joomla/web-services-api/swagger-ui/) | Familiar; no dark mode, needs a fix for the media paths. |

Trying requests from the Manual against your own site needs *Enable CORS* in its Global Configuration; this is explained on the [OpenAPI reference page](https://hermanpeeren.github.io/Manual-Joomla/docs/web-services-api/openapi/) of the demo.

### Two Web Services sections

The Manual has *General Concepts › Web Services* and *Web Services API*. The first is mostly an article CRUD example from the Joomla 4 era, which your component guides now cover better. I rewrote it as a concepts page (API application, routes from webservices plugins, controllers and administrator models, authentication, using web services in your own extension, and an outline of web services in your own component): [demo](https://hermanpeeren.github.io/Manual-Joomla/docs/general-concepts/webservices). The *Web Services API* introduction links back to it.

### Small points on this PR

- `sidebar_position: 1` in `docs/web-services-api/index.md` moves the section from the bottom of the sidebar to the top, next to Get Started. Was that intended?
- Server-side examples: they use `Joomla\Http\HttpFactory`, good. The same ~45 lines are repeated in 21 guides; one small client in the introduction and a short call per endpoint would make the guides shorter. `Authorization: Bearer` could replace `X-Joomla-Token` in the examples.
- `docs/web-services-api/media.md` advises to URL-encode path segments; that is right, but not for the slashes between them (see above).

## How to continue

1. **This PR.** Take over the improved specification and the small doc fixes. They are on the branch [`docs/6.2-openapi-enhancements`](https://github.com/HermanPeeren/Manual-Joomla/tree/docs/6.2-openapi-enhancements) of my fork, on top of your branch, so you can merge or cherry-pick them. I can also open a PR against your branch. Then this PR can be reviewed and merged.
2. **Specification in API-Endpoints.** Put `joomla-6.2.0.json`, the scripts and the captured responses in [joomla-projects/API-Endpoints](https://github.com/joomla-projects/API-Endpoints), with a CI check (validation, lint, captured responses against a test site). The Manual copies the specification per Joomla version into `static/openapi/`.
3. **Viewer, follow-up PR.** Add docusaurus-openapi-docs as in the demo ([branch](https://github.com/HermanPeeren/Manual-Joomla/tree/docs/6.2-api-reference-openapi-docs)). Optionally Scalar as a single-page overview; one viewer is easier to maintain.
4. **General Concepts, separate PR** after this one: [branch](https://github.com/HermanPeeren/Manual-Joomla/tree/docs/general-concepts-webservices).
5. **Later:** a component tutorial step on adding web services to your own component; shorter client examples in the guides; the open specification points from CHANGES.

I'm happy to do steps 2–4; could you take step 1? @HLeithner, does this fit what you had in mind with #82?
