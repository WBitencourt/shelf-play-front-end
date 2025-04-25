
export function prettyTextCharSize(text: string | undefined, size: number) {
  if(!text || size === 0) {
    return ''
  }

  const hideSuspensionPoints = size >= text.length;
  const textLimitedCharSize = text.trim().substring(0, size);

  return `${textLimitedCharSize}${hideSuspensionPoints ? '' : '...'}`
}
