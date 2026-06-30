export type NoticePart =
  { type: 'text'; text: string } | { type: 'link'; text: string; href: string }

export function parseNotice(message: string, links: string): NoticePart[] {
  if (!message.trim()) return []

  const messageParts = message.split('{link}')
  const linkParts = links.split('{link}').filter(Boolean)

  return messageParts.flatMap((text, index): NoticePart[] => {
    if (index % 2 === 0) {
      return text ? [{ type: 'text', text }] : []
    }

    const href = linkParts[Math.floor(index / 2)]
    return href && text
      ? [{ type: 'link', text, href }]
      : text
        ? [{ type: 'text', text }]
        : []
  })
}
