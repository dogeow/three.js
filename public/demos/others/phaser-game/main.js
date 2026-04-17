// ============ Phaser · 2D 游戏引擎 ============
// Phaser 是 JS 界最成熟的 2D 游戏框架（不依赖 3D/WebGL 概念）
// 核心：场景（Scene）/ 物理（Physics）/ 精灵（Sprite）/ 输入
// 应用：网页小游戏、H5 推广游戏、微信小游戏、独立游戏

import Phaser from 'https://esm.sh/phaser@3.80.1'

// ============ 1. 游戏场景 ============
class MainScene extends Phaser.Scene {
  constructor() {
    super('main')
    this.score = 0
  }

  create() {
    const W = this.scale.width
    const H = this.scale.height

    // 背景渐变（用一个矩形 + 填充）
    const bg = this.add.graphics()
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1)
    bg.fillRect(0, 0, W, H)

    // ============ 2. 地面 + 平台 ============
    this.platforms = this.physics.add.staticGroup()
    const makePlatform = (x, y, w, h, color = 0x4a90ff) => {
      const g = this.add.rectangle(x, y, w, h, color)
      this.physics.add.existing(g, true) // true = 静态
      this.platforms.add(g)
    }
    makePlatform(W / 2, H - 20, W, 40)        // 地面
    makePlatform(200, H - 150, 180, 20)
    makePlatform(W - 200, H - 220, 180, 20)
    makePlatform(W / 2, H - 300, 180, 20)

    // ============ 3. 玩家 ============
    this.player = this.add.rectangle(100, H - 100, 30, 40, 0xff6b9d)
    this.physics.add.existing(this.player)
    this.player.body.setCollideWorldBounds(true)
    this.player.body.setBounce(0.1)
    this.physics.add.collider(this.player, this.platforms)

    // ============ 4. 金币 ============
    this.coins = this.physics.add.group()
    for (let i = 0; i < 12; i++) {
      const coin = this.add.circle(80 + i * 80, 50, 12, 0xffd166)
      this.physics.add.existing(coin)
      coin.body.setBounce(0.6)
      this.coins.add(coin)
    }
    this.physics.add.collider(this.coins, this.platforms)
    this.physics.add.overlap(this.player, this.coins, (_, coin) => {
      coin.destroy()
      this.score += 10
      this.scoreText.setText(`得分: ${this.score}`)

      // 全部收集完 => 重新生成
      if (this.coins.countActive() === 0) {
        for (let i = 0; i < 12; i++) {
          const c = this.add.circle(80 + i * 80, 50, 12, 0xffd166)
          this.physics.add.existing(c)
          c.body.setBounce(0.6)
          this.coins.add(c)
          this.physics.add.collider(c, this.platforms)
        }
      }
    })

    // ============ 5. 输入：方向键 + WASD + 空格 ============
    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys('W,A,S,D')

    // ============ 6. 分数 UI ============
    this.scoreText = this.add.text(16, 16, '得分: 0', {
      font: 'bold 20px -apple-system, sans-serif',
      color: '#fff',
    })
  }

  update() {
    const body = this.player.body
    const left = this.cursors.left.isDown || this.wasd.A.isDown
    const right = this.cursors.right.isDown || this.wasd.D.isDown
    const up = this.cursors.up.isDown || this.wasd.W.isDown || this.cursors.space.isDown

    if (left) body.setVelocityX(-220)
    else if (right) body.setVelocityX(220)
    else body.setVelocityX(0)

    // 只有在地面上才能跳（onFloor）
    if (up && body.blocked.down) body.setVelocityY(-450)
  }
}

// ============ 7. 启动游戏 ============
new Phaser.Game({
  type: Phaser.CANVAS,            // 强制用 Canvas 渲染（不走 WebGL）
  width: 900,
  height: 560,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',            // 街机物理（最简单快的 2D 物理）
    arcade: { gravity: { y: 800 }, debug: false },
  },
  scene: [MainScene],
})
