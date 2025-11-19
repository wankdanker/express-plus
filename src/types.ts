import { Request, Response, NextFunction, Application, RequestHandler, ErrorRequestHandler, Router, IRouterMatcher } from 'express';
import { z, ZodType, ZodObject, ZodTypeAny } from 'zod';
import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

// Note: ErrorRequestHandler added to support Express error handlers (4-parameter middleware)

// // Module augmentation to fix Express type compatibility
// declare module 'express' {
//   interface Application {
//     use(...handlers: any[]): Application;
//   }
// }

// HTTP method types
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

// Response definition for a specific status code
export interface ResponseObject {
  description: string;
  content?: Record<string, { schema: ZodType }>;
}

// Interface for endpoint options
export interface EndpointOptions<
  TBody extends ZodType | undefined = undefined,
  TParams extends ZodObject<any> | undefined = undefined,
  TQuery extends ZodObject<any> | undefined = undefined,
  THeaders extends ZodObject<any> | undefined = undefined
> {
  operationId?: string;
  summary?: string;
  description?: string;
  deprecated?: boolean;
  tags?: string[];
  body?: TBody;
  params?: TParams;
  query?: TQuery;
  headers?: THeaders;
  responses?: Record<string | number, ResponseObject>;
  path?: string; // Optional path when used as first argument
}

// Enhanced request interface with validated data
export type ValidatedRequest<
  TBody = unknown,
  TParams = unknown,
  TQuery = unknown,
  THeaders = unknown
> = {
  parsed: {
    body: TBody;
    params: TParams;
    query: TQuery;
    headers: THeaders;
  };
} & Request;

// Infer the type from a Zod schema
export type InferZodType<T extends ZodType | undefined> =
  T extends ZodType ? z.infer<T> : unknown;

// Define a handler function type that uses the validated request
export type TypedExpressHandler<
  TBody extends ZodType | undefined = undefined,
  TParams extends ZodObject<any> | undefined = undefined,
  TQuery extends ZodObject<any> | undefined = undefined,
  THeaders extends ZodObject<any> | undefined = undefined
> = (
  req: ValidatedRequest<
    TBody extends ZodType ? z.infer<TBody> : unknown,
    TParams extends ZodObject<any> ? z.infer<TParams> : unknown,
    TQuery extends ZodObject<any> ? z.infer<TQuery> : unknown,
    THeaders extends ZodObject<any> ? z.infer<THeaders> : unknown
  >,
  res: Response,
  next: NextFunction
) => any;

// Augmented method type with proper generics for type inference
export type AugmentedMethod<T> = ((name: string) => any) &
  IRouterMatcher<T> & {
    <
      TBody extends ZodType | undefined = undefined,
      TParams extends ZodObject<any> | undefined = undefined,
      TQuery extends ZodObject<any> | undefined = undefined,
      THeaders extends ZodObject<any> | undefined = undefined
    > (
      options: EndpointOptions<TBody, TParams, TQuery, THeaders>,
      ...handlers: TypedExpressHandler<TBody, TParams, TQuery, THeaders>[]
    ): T;

    <
      TBody extends ZodType | undefined = undefined,
      TParams extends ZodObject<any> | undefined = undefined,
      TQuery extends ZodObject<any> | undefined = undefined,
      THeaders extends ZodObject<any> | undefined = undefined
    > (
      path: string,
      options: EndpointOptions<TBody, TParams, TQuery, THeaders>,
      ...handlers: TypedExpressHandler<TBody, TParams, TQuery, THeaders>[]
    ): T;
  };

// Extended application interface with augmented methods
export interface ExpressPlusApplication extends Omit<Application, 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'use'> {
  get: AugmentedMethod<Application>;
  post: AugmentedMethod<Application>;
  put: AugmentedMethod<Application>;
  delete: AugmentedMethod<Application>;
  patch: AugmentedMethod<Application>;
  options: AugmentedMethod<Application>;
  head: AugmentedMethod<Application>;
  
  // Extended use() overloads to support RouterPlus instances
  use(router: RouterPlus): ExpressPlusApplication;
  use(path: string, router: RouterPlus): ExpressPlusApplication;
  use(...handlers: Array<RequestHandler | ErrorRequestHandler | RouterPlus | Router>): ExpressPlusApplication;
  use(path: string, ...handlers: Array<RequestHandler | ErrorRequestHandler | RouterPlus | Router>): ExpressPlusApplication;
}

// Extended router interface with augmented methods
export interface RouterPlus extends Omit<Router, 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'use'> {
  get: AugmentedMethod<Router>;
  post: AugmentedMethod<Router>;
  put: AugmentedMethod<Router>;
  delete: AugmentedMethod<Router>;
  patch: AugmentedMethod<Router>;
  options: AugmentedMethod<Router>;
  head: AugmentedMethod<Router>;
  
  // Extended use() overloads to support RouterPlus instances for nested routing
  use(router: RouterPlus): RouterPlus;
  use(path: string, router: RouterPlus): RouterPlus;
  use(...handlers: Array<RequestHandler | ErrorRequestHandler | RouterPlus | Router>): RouterPlus;
  use(path: string, ...handlers: Array<RequestHandler | ErrorRequestHandler | RouterPlus | Router>): RouterPlus;
  
  // Custom properties for internal tracking
  _isRouterPlus?: boolean;
  _registry?: any;
}

export type OpenAPIConfig = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  security?: Array<Record<string, string[]>>;
};

// API initialization options
export interface ApiOptions {
  defaultQuerySchema?: ZodObject<any>;
  defaultHeaderSchema?: ZodObject<any>;
  defaultResponses?: Record<string | number, ResponseObject>;
  openApiConfig?: OpenAPIConfig;
}

// Registry return type with builder methods
export interface Registry {
  // Core methods
  createEndpoint: <
    TBody extends ZodType = ZodType,
    TParams extends ZodObject<any> = ZodObject<any>,
    TQuery extends ZodObject<any> = ZodObject<any>,
    THeaders extends ZodObject<any> = ZodObject<any>
  >(
    method: HttpMethod,
    path: string,
    options?: EndpointOptions<TBody, TParams, TQuery, THeaders>
  ) => RequestHandler;
  
  // OpenAPI Document Generation
  generateOpenAPIDocument: (config?: Partial<OpenAPIConfig>) => any;
  
  // Configuration methods (chainable)
  setInfo: (info: { title: string; version: string; description?: string }) => Registry;
  addServer: (server: { url: string; description?: string }) => Registry;
  setDefaultQuerySchema: (schema: ZodObject<any>) => Registry;
  setDefaultHeaderSchema: (schema: ZodObject<any>) => Registry;
  setDefaultResponses: (responses: Record<string | number, ResponseObject>) => Registry;
  registerSecurityScheme: (name: string, scheme: any) => Registry;
  
  // Access to raw registry
  getRawRegistry: () => OpenAPIRegistry;
}

// Function return type for expressPlus (simplified)
export interface ExpressPlusReturn {
  app: ExpressPlusApplication;
  registry: Registry;
}

// Function return type for routerPlus (simplified)
export interface RouterPlusReturn {
  router: RouterPlus;
  registry: Registry;
}