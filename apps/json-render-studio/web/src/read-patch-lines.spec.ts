import { describe, expect, it } from 'vitest';

import { createPatchLineReader } from './read-patch-lines';

function readAll(chunks: string[]): { patches: string[]; dropped: number } {
  const reader = createPatchLineReader();
  const patches: string[] = [];
  let dropped = 0;

  for (const chunk of chunks) {
    const reading = reader.push(chunk);
    patches.push(...reading.patches);
    dropped += reading.dropped;
  }

  const tail = reader.flush();
  patches.push(...tail.patches);

  return { patches, dropped: dropped + tail.dropped };
}

describe('createPatchLineReader', () => {
  it('passes single-line patches straight through', () => {
    const { patches, dropped } = readAll([
      '{"op":"add","path":"/root","value":"page"}\n{"op":"add","path":"/a","value":1}\n',
    ]);

    expect(patches).toHaveLength(2);
    expect(dropped).toBe(0);
  });

  it('rejoins a patch the model pretty-printed across lines', () => {
    const { patches, dropped } = readAll([
      '{"op":"add","path":"/elements/title","value":\n',
      '{"type":"Heading","props":\n',
      '{"text":"Hello","level":"h1"},"children":[]}}\n',
    ]);

    expect(dropped).toBe(0);
    expect(JSON.parse(patches[0]!)).toEqual({
      op: 'add',
      path: '/elements/title',
      value: { type: 'Heading', props: { text: 'Hello', level: 'h1' }, children: [] },
    });
  });

  it('rejoins across chunk boundaries that fall mid-line', () => {
    const line = '{"op":"add","path":"/elements/card","value":{"type":"Card","children":[]}}\n';
    const chunks = [];
    for (let offset = 0; offset < line.length; offset += 7) {
      chunks.push(line.slice(offset, offset + 7));
    }

    const { patches, dropped } = readAll(chunks);

    expect(patches).toHaveLength(1);
    expect(dropped).toBe(0);
  });

  it('abandons an unrecoverable fragment rather than swallowing the patches behind it', () => {
    const { patches, dropped } = readAll([
      '{"op":"add","path":"/broken","value":{{{\n',
      '{"op":"add","path":"/good","value":1}\n',
      '{"op":"add","path":"/alsoGood","value":2}\n',
    ]);

    expect(dropped).toBe(1);
    expect(patches.map((patch) => JSON.parse(patch).path)).toEqual(['/good', '/alsoGood']);
  });

  it('reports a fragment still open when the stream ends', () => {
    const { patches, dropped } = readAll(['{"op":"add","path":"/cut","value":\n']);

    expect(patches).toEqual([]);
    expect(dropped).toBe(1);
  });
});
