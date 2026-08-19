/** A patch this long is a runaway accumulation, not a wrapped value. */
const MAX_PENDING_CHARS = 500_000;

export interface PatchLineReading {
  /** Complete, single-line JSON patches, ready for the stream compiler. */
  patches: string[];
  /** Lines abandoned because they never completed a patch. */
  dropped: number;
}

export interface PatchLineReader {
  push: (chunk: string) => PatchLineReading;
  /** Call once the stream ends, to settle whatever is still buffered. */
  flush: () => PatchLineReading;
}

/**
 * Reassembles JSONL patches from a stream that does not always honour one-object-per-line.
 *
 * The protocol says one patch per line, and `createSpecStreamCompiler` skips anything that does not
 * parse — so a model that pretty-prints a long value drops that patch silently, and the page comes
 * out with a parent pointing at a child that never arrived. The prompt asks for single lines and
 * mostly gets them; this is what makes the difference recoverable rather than fatal.
 *
 * Lines that fail to parse are held and re-tried with the next one appended. A held fragment is
 * abandoned as soon as a line arrives that starts a patch of its own, so one genuinely malformed
 * line cannot swallow every patch behind it.
 */
export function createPatchLineReader(): PatchLineReader {
  let remainder = '';
  let pending = '';

  const startsPatch = (line: string): boolean => line.trimStart().startsWith('{');

  const consume = (lines: string[]): PatchLineReading => {
    const patches: string[] = [];
    let dropped = 0;

    for (const line of lines) {
      if (line.trim() === '') {
        continue;
      }

      if (pending !== '' && startsPatch(line) && pending.length + line.length > MAX_PENDING_CHARS) {
        dropped += 1;
        pending = '';
      }

      const candidate = pending + line;
      if (isCompleteJson(candidate)) {
        patches.push(candidate);
        pending = '';
        continue;
      }

      // A fragment that cannot be completed and is followed by a fresh patch is unrecoverable.
      if (pending !== '' && startsPatch(line) && isCompleteJson(line)) {
        dropped += 1;
        patches.push(line);
        pending = '';
        continue;
      }

      pending = candidate;
    }

    return { patches, dropped };
  };

  return {
    push: (chunk) => {
      const lines = (remainder + chunk).split('\n');
      remainder = lines.pop() ?? '';
      return consume(lines);
    },

    flush: () => {
      const tail = remainder;
      remainder = '';
      const reading = consume(tail === '' ? [] : [tail]);

      if (pending !== '') {
        pending = '';
        return { patches: reading.patches, dropped: reading.dropped + 1 };
      }

      return reading;
    },
  };
}

function isCompleteJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}
