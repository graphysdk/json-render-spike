/** Ids are shared with the web app; a target the client cannot render must not be offered here. */
export type TargetId = 'webapp' | 'dashboard';

/**
 * One generation target: a json-render schema, the catalog filled into it, and the prompt that
 * pairing produces.
 *
 * Adding `@json-render/vue`, `/ink` or `/react-email` is adding a file here and a preview on the
 * web side — nothing in the route, the stream or the UI knows how many targets exist.
 */
export interface GenerationTarget {
  readonly id: TargetId;
  readonly label: string;
  /** One line, shown under the target picker. */
  readonly blurb: string;
  /** Built once at module load — the catalog is static and the prompt is long. */
  readonly systemPrompt: string;
  /** Appended to the user prompt: the patch order this schema's spec wants. */
  readonly orderingReminder: string;
}
