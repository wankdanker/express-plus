import { Router } from 'express';
import { createRegistry } from './registry';
import { 
  ApiOptions, 
  RouterPlus,
  RouterPlusReturn
} from './types';
import { enhanceHttpMethods, registerMount } from './utils';

/**
 * Enhances an Express Router with typed route handling and OpenAPI documentation
 * 
 * @param router Express Router instance (or creates a new one if not provided)
 * @param opts API configuration options (optional)
 * @returns Enhanced Router and registry
 */
export const routerPlus = (router?: Router, opts: ApiOptions = {}): RouterPlusReturn => {
  // Create a new router if one wasn't provided
  const routerInstance = router || Router();
  
  // Create registry with the provided options
  const registry = createRegistry(opts);

  // Define the HTTP methods to enhance
  const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;

  // Enhance the router with our augmented methods
  // @ts-ignore TODO: Fix type error
  enhanceHttpMethods(routerInstance, methods, registry.createEndpoint);

  // Mark the router as a RouterPlus and attach registry
  Object.defineProperties(routerInstance, {
    _isRouterPlus: {
      value: true,
      writable: false,
      enumerable: false
    },
    _registry: {
      // Store the actual registry object, not just a getter
      value: registry,
      writable: false,
      enumerable: false
    }
  });
  
  // Make the router compatible with Express's app.use() typings
  (routerInstance as any).__esModule = true;

  // Keep track of nested routers
  const originalUse = routerInstance.use;
  routerInstance.use = function(...args: any[]): Router {
    // Case 1: path + router (router.use('/path', routerPlus))
    if (args.length >= 2) {
      const mountPath = typeof args[0] === 'string' ? args[0] : '/';
      const middleware = args[1];
      
      // If middleware is a RouterPlus, register its mount point
      if (middleware && middleware._isRouterPlus && middleware._registry) {
        // Register with a combined path (this will be handled when the parent router is mounted)
        console.log(`Registering nested router at path: ${mountPath}`);
        // Register the registry object, not the raw registry
        registerMount(mountPath, middleware._registry);
      }
    }
    
    // Case 2: Just router (router.use(routerPlus))
    if (args.length === 1 && args[0] && args[0]._isRouterPlus && args[0]._registry) {
      console.log(`Registering router without path`);
      // Register the registry object, not the raw registry
      registerMount('/', args[0]._registry);
    }
    
    // Call the original use method
    // @ts-ignore TODO: Fix type error
    return originalUse.apply(this, args) as Router;
  };

  // Return enhanced router and registry
  return {
    router: routerInstance as unknown as RouterPlus,
    registry
  };
};