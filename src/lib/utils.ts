import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extrai e normaliza uma URL do YouTube para formato embed.
 * Aceita: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 * Retorna null se o formato não for reconhecido.
 */
export function extractYouTubeEmbedUrl(url: string | undefined | null): string | null {
  if (!url || !url.trim()) return null

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return `https://www.youtube.com/embed/${match[1]}`
    }
  }

  return null
}
