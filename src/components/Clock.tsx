import { formatClock } from '../game/engine'

export function Clock({ minutes }: { minutes: number }) {
  return (
    <div className="clock" aria-live="polite">
      <span className="clock-label">Time</span>
      <span className="clock-time">{formatClock(minutes)}</span>
    </div>
  )
}
