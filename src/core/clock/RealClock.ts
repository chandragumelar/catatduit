import type { Clock } from './Clock'

export class RealClock implements Clock {
  now(): Date {
    return new Date()
  }
}
