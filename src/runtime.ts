import type { ZoneManager } from './zones/ZoneManager'

export function setZoneManager(zm: ZoneManager): void {
  ;(globalThis as any).__tlwarZoneManager = zm
}

export function getZoneManager(): ZoneManager | null {
  return (globalThis as any).__tlwarZoneManager ?? null
}
