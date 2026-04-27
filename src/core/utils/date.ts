import type { Clock } from '@/core/clock/Clock'

export function getMonthBoundary(clock: Clock): { start: Date; end: Date } {
  const now = clock.now()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { start, end }
}

export function getWeekBoundary(clock: Clock): { start: Date; end: Date } {
  const now = clock.now()
  const day = now.getDay()
  const diffToMonday = (day === 0 ? -6 : 1 - day)
  const start = new Date(now)
  start.setDate(now.getDate() + diffToMonday)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function getPreviousMonthBoundary(clock: Clock): { start: Date; end: Date } {
  const now = clock.now()
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const end = new Date(now.getFullYear(), now.getMonth(), 0)
  return { start, end }
}

export function getPreviousWeekBoundary(clock: Clock): { start: Date; end: Date } {
  const now = clock.now()
  const day = now.getDay()
  const diffToMonday = (day === 0 ? -6 : 1 - day)
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() + diffToMonday)
  thisMonday.setHours(0, 0, 0, 0)
  const start = new Date(thisMonday)
  start.setDate(thisMonday.getDate() - 7)
  const end = new Date(thisMonday)
  end.setDate(thisMonday.getDate() - 1)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function formatDisplayDate(dateStr: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(dateStr))
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}
