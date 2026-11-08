// One selected book owns this cache. Warm-up and the viewer share the same
// requests, including on Safari where speculative prefetch is not reliable.
export function createBookResources(descriptor, {fetcher = fetch, maxBytes = 32 * 1024 * 1024} = {}) {
  const controller = new AbortController();
  const cache = new Map();
  let bytes = 0;
  const base = descriptor.manifest.slice(0, descriptor.manifest.lastIndexOf('/') + 1);
  async function get(url, {signal} = {}) {
    signal?.throwIfAborted();
    controller.signal.throwIfAborted();
    let entry = cache.get(url);
    if (!entry) {
      entry = {size: 0};
      cache.set(url, entry);
      entry.promise = (async () => {
        const request = new AbortController();
        const abort = () => request.abort();
        controller.signal.addEventListener('abort', abort, {once: true});
        const timer = setTimeout(abort, 30000);
        try {
          const response = await fetcher(url, {signal: request.signal});
          if (!response.ok) throw new Error('Sketchbook download failed.');
          const blob = await response.blob();
          controller.signal.throwIfAborted();
          entry.size = blob.size;
          bytes += blob.size;
          // Keep compressed image blobs, never decoded GPU textures, in this cache.
          for (const [key, value] of cache) {
            if (bytes <= maxBytes) break;
            if (value.size) { bytes -= value.size; cache.delete(key); }
          }
          return blob;
        } catch (error) {
          if (cache.get(url) === entry) cache.delete(url);
          throw error;
        } finally {
          clearTimeout(timer);
          controller.signal.removeEventListener('abort', abort);
        }
      })();
    } else {
      cache.delete(url); cache.set(url, entry);
    }
    const blob = await entry.promise;
    signal?.throwIfAborted();
    controller.signal.throwIfAborted();
    // Fetch already decoded Content-Encoding. Do not copy that header twice.
    return new Response(blob, {headers: {'Content-Type': blob.type}});
  }
  async function warm() {
    const manifest = await (await get(descriptor.manifest)).json();
    const covers = manifest.parts.filter(part => !part.name.startsWith('pages'));
    const pages = manifest.parts.filter(part => part.name.startsWith('pages'));
    const textures = parts => parts.map(part => part.material.texture).filter(Boolean).map(file => base + file);
    const first = [...new Set([...textures(covers.filter(part => /cover/i.test(part.name))), base + manifest.poseChunks.chunks[0].file, ...textures(pages.slice(0, 2))])];
    const rest = [...new Set([...textures(covers), ...textures(pages.slice(2))])].filter(url => !first.includes(url));
    // Only two background downloads at a time, with the first view ahead of the rest.
    for (const urls of [first, rest]) {
      let next = 0;
      await Promise.all([0, 1].map(async () => {
        while (next < urls.length && !controller.signal.aborted) await get(urls[next++]);
      }));
    }
  }
  return {fetch: get, warm, destroy() { controller.abort(); cache.clear(); bytes = 0; }};
}
