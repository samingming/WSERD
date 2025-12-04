// Minimal typings for swagger-ui-express used in this project.
declare module 'swagger-ui-express' {
  import { RequestHandler } from 'express';

  export interface SwaggerUiSetupOptions {
    explorer?: boolean;
    customCss?: string;
    customJs?: string | string[];
    customfavIcon?: string;
    customSiteTitle?: string;
    swaggerOptions?: Record<string, unknown>;
  }

  export interface SwaggerUiInstance {
    serve: RequestHandler[];
    setup(
      swaggerDoc?: Record<string, unknown>,
      customOptions?: SwaggerUiSetupOptions,
      swaggerUrl?: string,
      swaggerUrls?: Array<{ url: string; name?: string }>,
    ): RequestHandler;
  }

  const swaggerUi: SwaggerUiInstance;
  export default swaggerUi;
}
