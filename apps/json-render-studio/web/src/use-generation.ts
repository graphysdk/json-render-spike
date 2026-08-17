import { createSpecStreamCompiler } from '@json-render/core';
import { useCallback, useRef, useState } from 'react';

import { openGenerationStream } from './api';
import { createPatchLineReader, type PatchLineReading } from './read-patch-lines';

/** Cap on how often a partial spec reaches React, in ms. */
const FLUSH_INTERVAL_MS = 120;

export type GenerationStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface GenerationState {
  status: GenerationStatus;
  /** Grows patch by patch while streaming; `null` until the first one lands. */
  spec: Record<string, unknown> | null;
  patchCount: number;
  /**
   * Lines abandoned because they never formed a patch, even after rejoining.
   *
   * Nonzero means the spec has a hole in it — a parent pointing at a child that never arrived —
   * which is worth saying out loud rather than leaving to be deduced from the preview.
   */
  droppedLines: number;
  /** Exactly what came back, for when the spec alone does not explain what happened. */
  rawStream: string;
  error: string | null;
}

export interface GenerationControls extends GenerationState {
  generate: (prompt: string) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

const IDLE: GenerationState = {
  status: 'idle',
  spec: null,
  patchCount: 0,
  droppedLines: 0,
  rawStream: '',
  error: null,
};

/**
 * Streams JSONL patches into a spec.
 *
 * Spec-shape-agnostic on purpose: a spec is JSON assembled by a patch protocol, and nothing about
 * assembling it depends on what the JSON means. Only the preview knows the shape.
 *
 * Patches land far faster than a chart can compile, so partial specs are flushed on an interval
 * rather than per patch — without it every chart on screen recompiles on every line of the stream.
 */
export function useGeneration(): GenerationControls {
  const [state, setState] = useState<GenerationState>(IDLE);
  const abortRef = useRef<AbortController | null>(null);
  // Read at send time so a refinement patches the spec on screen rather than a stale render's copy.
  const specRef = useRef<Record<string, unknown> | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stop();
    specRef.current = null;
    setState(IDLE);
  }, [stop]);

  const generate = useCallback(
    async (prompt: string) => {
      stop();
      const controller = new AbortController();
      abortRef.current = controller;

      const previousSpec = specRef.current;
      const compiler = createSpecStreamCompiler<Record<string, unknown>>(
        previousSpec === null ? undefined : structuredClone(previousSpec)
      );

      let rawStream = '';
      let patchCount = 0;
      let droppedLines = 0;

      setState({ ...IDLE, status: 'streaming', spec: previousSpec });

      const publish = (status: GenerationStatus) => {
        const spec = { ...compiler.getResult() };
        specRef.current = spec;
        setState({ status, spec, patchCount, droppedLines, rawStream, error: null });
      };

      try {
        const body = await openGenerationStream({
          prompt,
          currentSpec: previousSpec,
          signal: controller.signal,
        });

        const reader = body.getReader();
        const decoder = new TextDecoder();
        const lineReader = createPatchLineReader();
        let lastFlush = 0;

        const apply = (reading: PatchLineReading): number => {
          droppedLines += reading.dropped;
          let applied = 0;
          for (const patch of reading.patches) {
            applied += compiler.push(`${patch}\n`).newPatches.length;
          }
          patchCount += applied;
          return applied;
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          // `stream: true` keeps a multi-byte character split across chunks from being mangled.
          const chunk = decoder.decode(value, { stream: true });
          rawStream += chunk;

          if (apply(lineReader.push(chunk)) === 0) {
            continue;
          }

          const now = performance.now();
          if (now - lastFlush >= FLUSH_INTERVAL_MS) {
            lastFlush = now;
            publish('streaming');
          }
        }

        apply(lineReader.flush());
        publish('done');
      } catch (error) {
        if (controller.signal.aborted) {
          // A stop leaves whatever streamed in place; it is still a legitimate spec to refine.
          setState((current) => ({ ...current, status: 'done' }));
          return;
        }
        setState((current) => ({ ...current, status: 'error', error: toMessage(error) }));
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [stop]
  );

  return { ...state, generate, stop, reset };
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
