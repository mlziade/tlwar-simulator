import { ShapeUtil, HTMLContainer, Rectangle2d, Ellipse2d, Polygon2d, T, Vec, type TLShape, type RecordProps } from 'tldraw'
import { interpolateHealthColor, teamColor } from './colorUtils'
import type { UnitType } from '../units/registry'
import React from 'react'

declare module 'tldraw' {
  interface TLGlobalShapePropsMap {
    unit: {
      unitType: 'warrior' | 'tank' | 'assassin'
      hp: number
      maxHp: number
      team: string
      w: number
      h: number
    }
  }
}

type UnitShape = TLShape<'unit'>

const unitShapeProps: RecordProps<UnitShape> = {
  unitType: T.literalEnum('warrior', 'tank', 'assassin'),
  hp: T.number,
  maxHp: T.number,
  team: T.string,
  w: T.number,
  h: T.number,
}

export function unitSize(type: UnitType): { w: number; h: number } {
  switch (type) {
    case 'warrior':  return { w: 32, h: 32 }
    case 'tank':     return { w: 48, h: 48 }
    case 'assassin': return { w: 24, h: 24 }
  }
}

function diamond(w: number, h: number): Vec[] {
  return [
    new Vec(w / 2, 0),
    new Vec(w, h / 2),
    new Vec(w / 2, h),
    new Vec(0, h / 2),
  ]
}

export class UnitShapeUtil extends ShapeUtil<UnitShape> {
  static override type = 'unit' as const
  static override props = unitShapeProps

  override getDefaultProps(): UnitShape['props'] {
    return { unitType: 'warrior', hp: 100, maxHp: 100, team: 'unassigned', w: 32, h: 32 }
  }

  override getGeometry(shape: UnitShape) {
    const { w, h } = shape.props
    switch (shape.props.unitType) {
      case 'warrior':
        return new Ellipse2d({ width: w, height: h, isFilled: true })
      case 'tank':
        return new Rectangle2d({ width: w, height: h, isFilled: true })
      case 'assassin':
        return new Polygon2d({ points: diamond(w, h), isFilled: true })
    }
  }

  override component(shape: UnitShape) {
    const { hp, maxHp, team, unitType, w, h } = shape.props
    const ratio = maxHp > 0 ? hp / maxHp : 0
    const fill = interpolateHealthColor(ratio)
    const border = teamColor(team)

    const baseStyle: React.CSSProperties = {
      width: w,
      height: h,
      backgroundColor: fill,
      border: `3px solid ${border}`,
      boxSizing: 'border-box',
      pointerEvents: 'none',
    }

    const shapeStyle: React.CSSProperties =
      unitType === 'warrior'
        ? { ...baseStyle, borderRadius: '50%' }
        : unitType === 'assassin'
        ? { ...baseStyle, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }
        : baseStyle

    return React.createElement(HTMLContainer, null, React.createElement('div', { style: shapeStyle }))
  }

  override getIndicatorPath(shape: UnitShape) {
    const { w, h, unitType } = shape.props
    if (unitType === 'warrior') {
      const path = new Path2D()
      path.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
      return path
    }
    if (unitType === 'assassin') {
      const path = new Path2D()
      path.moveTo(w / 2, 0)
      path.lineTo(w, h / 2)
      path.lineTo(w / 2, h)
      path.lineTo(0, h / 2)
      path.closePath()
      return path
    }
    const path = new Path2D()
    path.rect(0, 0, w, h)
    return path
  }

  override canResize() { return false }
  override canEdit() { return false }
  override canBind() { return false }
}
