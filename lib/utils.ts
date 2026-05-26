import { format, formatDistanceToNow } from 'date-fns'

export function formatDate(date: string): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatTime(date: string): string {
  return format(new Date(date), 'HH:mm:ss')
}

export function formatRelative(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-emerald-400'
  if (confidence >= 0.6) return 'text-amber-400'
  return 'text-red-400'
}
