function generateV4(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return [...bytes]
    .map((b, i) => {
      const hex = b.toString(16).padStart(2, '0')
      return i === 4 || i === 6 || i === 8 || i === 10 ? `-${hex}` : hex
    })
    .join('')
}

export function createUuid(): string {
  try {
    return globalThis.crypto.randomUUID()
  } catch {
    return generateV4()
  }
}
