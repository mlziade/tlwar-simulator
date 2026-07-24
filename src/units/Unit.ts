export class Unit {
  id: string
  shapeId: string = ''
  team: string
  position: { x: number; y: number }
  hp: number
  maxHp: number
  damage: number
  resistance: number
  moveSpeed: number
  attackSpeed: number
  attackCooldownMs: number = 0
  isAlive: boolean = true
  currentTarget: Unit | null = null
  unitType: 'warrior' | 'tank' | 'assassin'

  constructor(
    team: string,
    position: { x: number; y: number },
    unitType: 'warrior' | 'tank' | 'assassin',
    maxHp: number,
    damage: number,
    resistance: number,
    moveSpeed: number,
    attackSpeed: number,
  ) {
    this.id = crypto.randomUUID()
    this.team = team
    this.position = { ...position }
    this.unitType = unitType
    this.maxHp = maxHp
    this.hp = maxHp
    this.damage = damage
    this.resistance = resistance
    this.moveSpeed = moveSpeed
    this.attackSpeed = attackSpeed
  }

  takeDamage(amount: number): void {
    const effective = Math.max(0, amount - this.resistance)
    this.hp -= effective
    if (this.hp <= 0) this.die()
  }

  die(): void {
    this.hp = 0
    this.isAlive = false
    this.onDeath()
  }

  onSpawn(): void {}
  onDeath(): void {}

  onTick(elapsed: number): void {
    if (this.attackCooldownMs > 0) {
      this.attackCooldownMs = Math.max(0, this.attackCooldownMs - elapsed)
    }
  }
}
