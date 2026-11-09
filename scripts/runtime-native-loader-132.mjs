import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); } catch (error) {
    if (specifier.startsWith('.')) for (const ext of ['.ts', '.tsx']) {
      try { return nextResolve(specifier + ext, context); } catch {}
    }
    throw error;
  }
}});
