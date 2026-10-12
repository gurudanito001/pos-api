import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// This file acts as a proxy for the zod library.
// It patches the original `z` object and then re-exports everything from it.
// Every part of the app that needs Zod should import from this file.
extendZodWithOpenApi(z);

export * from 'zod';