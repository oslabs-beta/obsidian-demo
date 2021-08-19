import { Application, Router } from 'https://deno.land/x/oak@v6.0.1/mod.ts';

import { React, ReactDOMServer } from './deps.ts';
import { Cron, ObsidianRouter } from './serverDeps.ts';
import { createDb } from './server/db/db.ts';
import resolvers from './server/resolvers.ts';
import types from './server/schema.ts';
import App from './client/app.tsx';
import { staticFileMiddleware } from './staticFileMiddleware.ts';

const PORT = 3000;
const app = new Application();
// Track response time in headers of responses
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get('X-Response-Time');
  //console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
});

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set('X-Response-Time', `${ms}ms`);
});

// create and seed DB
createDb();

// Create Route
const router = new Router();

router.get('/', (ctx: any) => {
  try {
    const body = (ReactDOMServer as any).renderToString(<App />);
    ctx.response.body = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
        <link href="https://unpkg.com/tailwindcss@^1.0/dist/tailwind.min.css" rel="stylesheet">
        <link rel="stylesheet" href="/static/style.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
        <title>Obsidian</title>
        <!-- Global site tag (gtag.js) - Google Analytics -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-9KFRS33Z82"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-9KFRS33Z82');
        </script>
      </head>
      <body class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-gray-900" >
        <div  id="root">${body}</div>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script  src="/static/client.js" defer></script>
      </body>
      </html>`;
  } catch (err) {
    console.log('error', err);
  }
});

// Bundle hydrated app
// const [_, clientJS] = await Deno.bundle('./client/client.tsx');

const { files, diagnostics } = await Deno.emit('./client/client.tsx', {
  bundle: 'module',
});

// Router for serving bundle
const bundleRouter = new Router();
bundleRouter.get('/static/client.js', (ctx) => {
  ctx.response.headers.set('Content-Type', 'text/html');
  // context.response.body = clientJS;
  ctx.response.body = files['deno:///bundle.js'];
});
// Attach routes
app.use(router.routes());
app.use(staticFileMiddleware);
app.use(bundleRouter.routes());
app.use(router.allowedMethods());

interface ObsRouter extends Router {
  obsidianSchema?: any;
}
// Create GraphQL Router
const GraphQLRouter = await ObsidianRouter<ObsRouter>({
  Router,
  // context: () => console.log('hi, Cameron'),
  typeDefs: types,
  resolvers: resolvers,
  redisPort: 6379,
  useCache: true,
  usePlayground: true,
  useQueryCache: true,
  useRebuildCache: true,
  customIdentifier: ['id', '__typename'],
});
app.use(GraphQLRouter.routes(), GraphQLRouter.allowedMethods());

//Rebuilds the database every 30 minutes to ensure there is always valid data
const cron = new Cron();

cron.add('*/30 * * * *', () => {
  console.log('It has been 30 minutes, the DB is refreshing');
  createDb();
});

cron.start();

app.addEventListener('listen', () => {
  console.log(`listening on localhost:${PORT}`);
});

await app.listen({ port: PORT });
