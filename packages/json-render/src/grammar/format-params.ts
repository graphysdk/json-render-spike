import { z } from 'zod';

/**
 * Renders a catalog entry's parameter schema as the one-line type a prompt can carry.
 *
 * Key names alone leave a model guessing at values — it writes `interpolate: "smooth"` where the geom
 * accepts `"linear"` or `"catmull-rom"`. A host schema renders the shapes of its own catalog, but the
 * chart's vocabulary reaches the model through one component description, which has to render itself.
 *
 * Returns `''` for an entry that takes no parameters, so a caller can drop the clause entirely.
 */
export function formatCatalogParams(schema: z.ZodType): string {
  if (!(schema instanceof z.ZodObject)) {
    return '';
  }

  const fields = Object.entries(schema.shape).map(([key, field]) => `${key}: ${formatType(field as z.ZodType)}`);
  return fields.length === 0 ? '' : `{${fields.join(', ')}}`;
}

/**
 * A model reads `null` as "leave it out", which every catalog entry marks its optional fields with,
 * so the wrapper carries no information worth spending prompt on — unwrap and render what it holds.
 */
function formatType(schema: z.ZodType): string {
  if (schema instanceof z.ZodNullable || schema instanceof z.ZodOptional) {
    return formatType(schema.unwrap() as z.ZodType);
  }
  if (schema instanceof z.ZodEnum) {
    return schema.options.map((option) => JSON.stringify(option)).join('|');
  }
  if (schema instanceof z.ZodUnion) {
    return (schema.options as z.ZodType[]).map(formatType).join('|');
  }
  if (schema instanceof z.ZodArray) {
    const element = formatType(schema.element as z.ZodType);
    // `number|string[]` reads as "a number or an array of strings", which is not what it is.
    return element.includes('|') ? `(${element})[]` : `${element}[]`;
  }
  if (schema instanceof z.ZodTuple) {
    return `[${(schema.def.items as z.ZodType[]).map(formatType).join(', ')}]`;
  }
  if (schema instanceof z.ZodObject) {
    return formatCatalogParams(schema) || 'object';
  }
  if (schema instanceof z.ZodNumber) {
    return 'number';
  }
  if (schema instanceof z.ZodString) {
    return 'string';
  }
  if (schema instanceof z.ZodBoolean) {
    return 'boolean';
  }
  if (schema instanceof z.ZodNull) {
    return 'null';
  }
  return 'unknown';
}
