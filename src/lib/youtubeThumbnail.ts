/** YouTube 영상 썸네일 URL */
export function getYoutubeThumbnailUrl(
  youtubeId: string,
  quality: 'default' | 'hq' | 'mq' = 'hq'
): string {
  const file =
    quality === 'hq' ? 'hqdefault.jpg' : quality === 'mq' ? 'mqdefault.jpg' : 'default.jpg';
  return `https://img.youtube.com/vi/${youtubeId}/${file}`;
}
