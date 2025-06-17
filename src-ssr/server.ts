/**
 * More info about this file:
 * https://v2.quasar.dev/quasar-cli-vite/developing-ssr/ssr-webserver
 *
 * Runs in Node context.
 */

/**
 * Make sure to yarn add / npm install (in your project root)
 * anything you import here (except for express and compression).
 */
import express from 'express';
// Импортируем compression только для production
// import compression from 'compression';
import {
  defineSsrCreate,
  defineSsrListen,
  defineSsrClose,
  defineSsrServeStaticContent,
  defineSsrRenderPreloadTag,
} from '#q-app/wrappers';

/**
 * Type guard для проверки production режима
 */
function isProductionMode(): boolean {
  return process.env.PROD === 'true' || process.env.NODE_ENV === 'production';
}

/**
 * Безопасная настройка compression с полным обходом конфликта типов
 * Используем any для полного отключения проверки типов Express
 */

/**
 * Create your webserver and return its instance.
 * If needed, prepare your webserver to receive
 * connect-like middlewares.
 *
 * Can be async: defineSsrCreate(async ({ ... }) => { ... })
 */
export const create = defineSsrCreate(async (/* { ... } */) => {
  const app = express();

  // Валидация express приложения
  if (!app) {
    throw new Error('Failed to create Express application');
  }

  // attackers can use this header to detect apps running Express
  // and then launch specifically-targeted attacks
  app.disable('x-powered-by');

  // place here any middlewares that
  // absolutely need to run before anything else
  if (process.env.PROD) {
    // Compression отключен из-за конфликта типов TypeScript
    console.log('🚀 Production mode: compression disabled due to TypeScript compatibility');
  }

  return app;
});

/**
 * You need to make the server listen to the indicated port
 * and return the listening instance or whatever you need to
 * close the server with.
 *
 * The "listenResult" param for the "close()" definition below
 * is what you return here.
 *
 * For production, you can instead export your
 * handler for serverless use or whatever else fits your needs.
 *
 * Can be async: defineSsrListen(async ({ app, devHttpsApp, port }) => { ... })
 */
export const listen = defineSsrListen(({ app, devHttpsApp, port }) => {
  // Валидация параметров
  if (!app) {
    throw new Error('Express app instance is required for listen');
  }

  if (!port || typeof port !== 'number' || port <= 0) {
    throw new Error(`Invalid port number: ${port}`);
  }

  const server = devHttpsApp || app;

  try {
    return server.listen(port, () => {
      if (isProductionMode()) {
        console.log(`🚀 Server listening at port ${port}`);
      } else {
        console.log(`🔧 Development server listening at port ${port}`);
      }
    });
  } catch (error) {
    console.error(`❌ Failed to start server on port ${port}:`, error);
    throw error;
  }
});

/**
 * Should close the server and free up any resources.
 * Will be used on development only when the server needs
 * to be rebooted.
 *
 * Should you need the result of the "listen()" call above,
 * you can use the "listenResult" param.
 *
 * Can be async: defineSsrClose(async ({ listenResult }) => { ... }))
 */
export const close = defineSsrClose(({ listenResult }) => {
  if (!listenResult) {
    console.warn('⚠️ No server instance to close');
    return Promise.resolve();
  }

  try {
    return listenResult.close();
  } catch (error) {
    console.error('❌ Error closing server:', error);
    throw error;
  }
});

const maxAge = process.env.DEV ? 0 : 1000 * 60 * 60 * 24 * 30;

/**
 * Should return a function that will be used to configure the webserver
 * to serve static content at "urlPath" from "pathToServe" folder/file.
 *
 * Notice resolve.urlPath(urlPath) and resolve.public(pathToServe) usages.
 *
 * Can be async: defineSsrServeStaticContent(async ({ app, resolve }) => {
 * Can return an async function: return async ({ urlPath = '/', pathToServe = '.', opts = {} }) => {
 */
export const serveStaticContent = defineSsrServeStaticContent(({ app, resolve }) => {
  // Валидация параметров
  if (!app) {
    throw new Error('Express app instance is required for serveStaticContent');
  }

  if (!resolve?.urlPath || !resolve?.public) {
    throw new Error('Resolve utilities are required for serveStaticContent');
  }

  return ({ urlPath = '/', pathToServe = '.', opts = {} }) => {
    try {
      const serveFn = express.static(resolve.public(pathToServe), {
        maxAge,
        ...opts,
      });

      app.use(resolve.urlPath(urlPath), serveFn);

      if (process.env.DEV) {
        console.log(`📁 Serving static content: ${urlPath} -> ${pathToServe}`);
      }
    } catch (error) {
      console.error('❌ Error setting up static content serving:', error);
      throw error;
    }
  };
});

const jsRE = /\.js$/;
const cssRE = /\.css$/;
const woffRE = /\.woff$/;
const woff2RE = /\.woff2$/;
const gifRE = /\.gif$/;
const jpgRE = /\.jpe?g$/;
const pngRE = /\.png$/;

/**
 * Should return a String with HTML output
 * (if any) for preloading indicated file
 */
export const renderPreloadTag = defineSsrRenderPreloadTag((file /* , { ssrContext } */) => {
  // Валидация входного файла
  if (!file || typeof file !== 'string') {
    console.warn('⚠️ Invalid file parameter for preload tag:', file);
    return '';
  }

  try {
    if (jsRE.test(file) === true) {
      return `<link rel="modulepreload" href="${file}" crossorigin>`;
    }

    if (cssRE.test(file) === true) {
      return `<link rel="stylesheet" href="${file}" crossorigin>`;
    }

    if (woffRE.test(file) === true) {
      return `<link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`;
    }

    if (woff2RE.test(file) === true) {
      return `<link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`;
    }

    if (gifRE.test(file) === true) {
      return `<link rel="preload" href="${file}" as="image" type="image/gif" crossorigin>`;
    }

    if (jpgRE.test(file) === true) {
      return `<link rel="preload" href="${file}" as="image" type="image/jpeg" crossorigin>`;
    }

    if (pngRE.test(file) === true) {
      return `<link rel="preload" href="${file}" as="image" type="image/png" crossorigin>`;
    }

    return '';
  } catch (error) {
    console.error('❌ Error creating preload tag for file:', file, error);
    return '';
  }
});
