import { Application, Router } from 'express';
import { createRegistry } from './registry';
import { 
  ApiOptions, 
  ExpressPlusApplication, 
  ExpressPlusReturn
} from './types';
import { enhanceHttpMethods, registerMount, combineRegistries, mountRegistry } from './utils';

/**
 * Enhances an Express application with typed route handling and OpenAPI documentation
 * 
 * @param app Express application instance
 * @param opts API configuration options (optional)
 * @returns Enhanced Express application and registry
 */
export const expressPlus = (app: Application, opts: ApiOptions = {}): ExpressPlusReturn => {
  // Create registry with the provided options
  const registry = createRegistry(opts);

  // Define the HTTP methods to enhance
  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;

  // Enhance the app with our augmented methods
  // @ts-ignore TODO: Fix type error
  enhanceHttpMethods(app, methods, registry.createEndpoint);

  // Keep a reference to the original use method
  const originalUse = app.use;

  // Override the use method to track router mounting
  app.use = function(...args: any[]): Application {
    // Case 1: Path + RouterPlus (app.use('/path', router))
    if (args.length >= 2) {
      const mountPath = typeof args[0] === 'string' ? args[0] : '/';
      const middleware = args[1];
      
      // If middleware is a RouterPlus, register its mount point
      if (middleware && middleware._isRouterPlus && middleware._registry) {
        console.log(`Registering router at path: ${mountPath}`);
        // Register the registry object, not the raw registry
        registerMount(mountPath, middleware._registry);
      }
    }
    
    // Case 2: Just RouterPlus (app.use(router))
    if (args.length === 1 && args[0] && args[0]._isRouterPlus && args[0]._registry) {
      console.log(`Registering router without path`);
      // Register the registry object, not the raw registry
      registerMount('/', args[0]._registry);
    }
    
    // Call the original use method
    // @ts-ignore TODO: Fix type error
    return originalUse.apply(this, args);
  };

  // Override the generateOpenAPIDocument method to combine registries
  const originalGenerateOpenAPIDocument = registry.generateOpenAPIDocument;
  registry.generateOpenAPIDocument = function(config?: Partial<any>): any {
    // Get the base registry
    const baseRegistry = registry.getRawRegistry();
    
    // Log mount points for debugging
    console.log('Generating OpenAPI document with mounted routers:');
    console.log('Mount registry count:', mountRegistry.length);
    
    // For each mounted registry, copy its definitions to the base registry
    mountRegistry.forEach(({ path, registry: mountedRegistry }) => {
      if (!mountedRegistry) return;
      
      // Get the raw registry definitions from the Registry object
      const rawRegistry = mountedRegistry.getRawRegistry ? 
                         mountedRegistry.getRawRegistry() : 
                         mountedRegistry;
      
      if (!rawRegistry || !rawRegistry.definitions) {
        console.log('Invalid registry format:', rawRegistry);
        return;
      }
      
      // Add each definition from the mounted registry to the base registry
      rawRegistry.definitions.forEach((def: any) => {
        if (def.type === 'path') {
          // Create a deep copy of the definition
          const adjustedDef = JSON.parse(JSON.stringify(def));
          
          // Combine the mount path with the route path
          let routePath = def.schema.path;
          if (routePath.startsWith('/')) {
            routePath = routePath.substring(1);
          }
          
          // Create the full path by combining mount path and route path
          const fullPath = path === '/' ? `/${routePath}` : `${path}/${routePath}`;
          
          // Update the path in the definition
          adjustedDef.schema.path = fullPath;
          
          console.log(`Adding path ${fullPath} from mounted router at ${path}`);
          
          // Add to base registry
          baseRegistry.definitions.push(adjustedDef);
        } else {
          // For non-path definitions, add directly if not already present
          if (!baseRegistry.definitions.some((baseDef: any) => 
            baseDef.type === def.type && 
            (def.name ? baseDef.name === def.name : 
            JSON.stringify(baseDef.schema) === JSON.stringify(def.schema)))) {
            baseRegistry.definitions.push(def);
          }
        }
      });
    });
    
    // Then generate the document using the original method
    return originalGenerateOpenAPIDocument.call(this, config);
  };

  // Return enhanced app and registry
  return {
    app: app as unknown as ExpressPlusApplication,
    registry
  };
};