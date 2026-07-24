import type { Editor } from 'tldraw'
import { ZoneManager } from './zones/ZoneManager'
import { setZoneManager } from './runtime'

export default function ({ editor, signal }: { editor: Editor; signal: AbortSignal }) {
  console.log('[tlwar] main loaded', editor)

  const zoneManager = new ZoneManager(editor)
  setZoneManager(zoneManager)
  zoneManager.renderBorders()

  editor.setCurrentTool('pencil-spawn')

  signal.addEventListener('abort', () => {
    zoneManager.cleanup()
  })
}
