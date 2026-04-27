import type { Clock } from './Clock'

export class TestClock implements Clock {
  constructor(private fixedDate: Date) {}

  now(): Date {
    return this.fixedDate
  }

  advance(ms: number): void {
    this.fixedDate = new Date(this.fixedDate.getTime() + ms)
  }
}
