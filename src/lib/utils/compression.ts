async function streamToUint8Array(readable: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = readable.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

export async function compressString(input: string): Promise<string> {
  const stream = new CompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(new TextEncoder().encode(input))
  writer.close()
  const compressed = await streamToUint8Array(stream.readable)
  return btoa(String.fromCharCode(...compressed))
}

export async function decompressString(input: string): Promise<string> {
  const binary = Uint8Array.from(atob(input), (c) => c.charCodeAt(0))
  const stream = new DecompressionStream('gzip')
  const writer = stream.writable.getWriter()
  writer.write(binary)
  writer.close()
  const decompressed = await streamToUint8Array(stream.readable)
  return new TextDecoder().decode(decompressed)
}
