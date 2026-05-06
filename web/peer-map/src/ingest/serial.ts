export type SerialIngest = {
  linesRx: number;
  lastLineAt: number;
  close: () => Promise<void>;
};

type SerialPortLike = {
  open: (o: { baudRate: number }) => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  close: () => Promise<void>;
};

/** Web Serial: line-delimited text fed to `onLine` (trimmed, non-empty). */
export async function startWebSerialIngest(onLine: (line: string) => void): Promise<SerialIngest> {
  const serial = (navigator as Navigator & { serial?: { requestPort: () => Promise<SerialPortLike> } })
    .serial;
  if (!serial) {
    throw new Error('Web Serial not supported in this browser');
  }
  const port = await serial.requestPort();
  await port.open({ baudRate: 115200 });
  const readable = port.readable;
  if (!readable) {
    await port.close();
    throw new Error('Serial port has no readable stream');
  }
  const reader = readable.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let linesRx = 0;
  let lastLineAt = 0;
  let cancelled = false;
  let closed = false;
  const emitLine = (line: string) => {
    try {
      onLine(line);
    } catch (error) {
      console.error('serial ingest callback failed', error);
    }
  };
  const emitTrimmed = (line: string) => {
    const t = line.trim();
    if (!t) return;
    linesRx++;
    lastLineAt = Date.now();
    emitLine(t);
  };
  const processChunk = (chunk: Uint8Array) => {
    buf += dec.decode(chunk, { stream: true });
    const parts = buf.split(/\r?\n/);
    buf = parts.pop() ?? '';
    for (const line of parts) {
      emitTrimmed(line);
    }
  };

  const pump = async () => {
    try {
      while (!cancelled) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value == null) continue;
        processChunk(value);
      }
      if (!cancelled) emitTrimmed(buf);
    } catch (error) {
      // Only swallow expected cancellation-like read errors.
      const name =
        typeof error === 'object' && error && 'name' in error ? String(error.name) : '';
      if (!cancelled && name !== 'AbortError') {
        console.error('serial ingest read loop failed', error);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* ignore */
      }
    }
  };
  void pump();

  return {
    get linesRx() {
      return linesRx;
    },
    get lastLineAt() {
      return lastLineAt;
    },
    close: async () => {
      if (closed) return;
      closed = true;
      cancelled = true;
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      try {
        await port.close();
      } catch {
        /* ignore */
      }
    },
  };
}
