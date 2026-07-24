import { atom } from 'tldraw'
import type { UnitType } from '../units/registry'

export const simState = atom<'idle' | 'running' | 'paused'>('simState', 'idle')
export const selectedUnitType = atom<UnitType>('selectedUnitType', 'warrior')
export const selectedTool = atom<'pencil' | 'brush' | 'delete'>('selectedTool', 'pencil')
export const brushRadius = atom<number>('brushRadius', 80)
export const unitCount = atom<number>('unitCount', 5)
export const zoneCount = atom<2 | 4>('zoneCount', 2)
export const borderWarning = atom<boolean>('borderWarning', false)
export const victoryTeam = atom<string | null>('victoryTeam', null)
