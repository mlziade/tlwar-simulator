import type { ZoneManager } from './zones/ZoneManager'

let _zoneManager: ZoneManager | null = null

export function setZoneManager(zm: ZoneManager): void {
  _zoneManager = zm
}

export function getZoneManager(): ZoneManager | null {
  return _zoneManager
}
