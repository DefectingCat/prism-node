/**
 * 检测字符串是否为有效的 URL
 * @param url - 待检测的字符串
 * @returns 是否为有效的 URL
 */
export function isUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObject = new URL(url);
    // 检查协议是否为 http 或 https
    return urlObject.protocol === 'http:' || urlObject.protocol === 'https:';
  } catch {
    return false;
  }
}
