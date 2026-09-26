import Ajv from 'ajv';
const ajv = new Ajv({ allErrors: true, strict: true });
export function createToolRegistry(tools) {
  const registry = new Map();
  for (const tool of tools) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(tool.name) || registry.has(tool.name) || typeof tool.execute !== 'function') throw new Error('Invalid or duplicate tool.');
    if (!['read', 'network', 'write', 'command'].includes(tool.permission)) throw new Error('Tool must declare a permission category.');
    registry.set(tool.name, { ...tool, validate: ajv.compile(tool.inputSchema) });
  }
  return {
    definitions: [...registry.values()].map((tool) => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.inputSchema } })),
    async execute(name, args, context) {
      const tool = registry.get(name);
      if (!tool) throw new Error(`Unknown tool: ${name}`);
      if (!tool.validate(args)) throw new Error(`Invalid tool arguments: ${ajv.errorsText(tool.validate.errors)}`);
      context.signal?.throwIfAborted();
      const preview = tool.preview?.(args);
      if (tool.permission !== 'read') {
        const approved = await context.approve({ name, permission: tool.permission, arguments: args, preview, description: tool.description }, context.signal);
        if (!approved) return { denied: true, message: 'User denied this action. Do not retry without a new instruction.' };
      }
      context.signal?.throwIfAborted();
      return tool.execute(args, { ...context, preview });
    },
  };
}
export const objectSchema = (properties = {}, required = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
export const textSchema = (maxLength = 500) => ({ type: 'string', minLength: 1, maxLength });
