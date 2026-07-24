import { UnitShapeUtil } from './shapes/UnitShape'
import { PencilSpawnTool } from './tools/PencilSpawnTool'
import { BrushSpawnTool } from './tools/BrushSpawnTool'
import { DeleteTool } from './tools/DeleteTool'
import { Controls } from './ui/controls'

export default function ({ config }: { config: any }) {
  config.shapeUtils.push(UnitShapeUtil)
  config.tools.push(PencilSpawnTool, BrushSpawnTool, DeleteTool)
  config.components = {
    ...config.components,
    SharePanel: Controls,
  }
  return config
}
