// ============ GSAP · SVG 动画 ============
// GSAP 是业界公认最流畅强大的 JS 动画库
// 核心：时间线（timeline）/ 缓动（ease）/ 补间（tween）/ stagger 错峰
// 应用：官网入场动画、落地页、H5、滚动特效、交互微动效

import gsap from 'https://esm.sh/gsap@3.12.5'

// ============ 1. 生成背景星星（原生 SVG DOM 操作）============
const starsGroup = document.getElementById('stars')
for (let i = 0; i < 80; i++) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  s.setAttribute('cx', Math.random() * 600)
  s.setAttribute('cy', Math.random() * 400)
  s.setAttribute('r', Math.random() * 1.5 + 0.3)
  s.setAttribute('fill', '#fff')
  s.setAttribute('opacity', 0)
  s.classList.add('star')
  starsGroup.appendChild(s)
}

// ============ 2. 构建时间线动画 ============
function playIntro() {
  // timeline 可以串接多个动画，用第二个参数 '-=0.3' 让动画重叠
  const tl = gsap.timeline()

  // 星星渐显（stagger 让每个元素错开执行）
  tl.to('.star', {
    opacity: () => Math.random() * 0.8 + 0.2,
    duration: 0.8,
    stagger: 0.01,
    ease: 'power2.out',
  })

  // 太阳从 0 放大 + 弹性缓动
  tl.from(
    '#sun',
    {
      attr: { r: 0 },
      duration: 1,
      ease: 'elastic.out(1, 0.4)',
    },
    '-=0.3'
  )

  // 行星从太阳位置"飞出"
  tl.from(
    '#planet',
    {
      attr: { cx: 300, cy: 200 },
      duration: 0.8,
      ease: 'back.out(1.7)',
    },
    '-=0.5'
  )

  // 文字从 0 字号放大
  tl.to(
    '#title',
    {
      attr: { 'font-size': 42 },
      duration: 0.6,
      ease: 'back.out(2)',
    },
    '-=0.3'
  )

  return tl
}

// ============ 3. 行星轨道运动（无限循环）============
// 用一个虚拟对象的 angle 属性驱动 cx/cy
const planet = document.getElementById('planet')
gsap.to(
  { angle: 0 },
  {
    angle: 360,
    duration: 10,
    repeat: -1,
    ease: 'none',
    onUpdate() {
      const a = (this.targets()[0].angle * Math.PI) / 180
      planet.setAttribute('cx', 300 + Math.cos(a) * 120)
      planet.setAttribute('cy', 200 + Math.sin(a) * 120)
    },
  }
)

// ============ 4. 星星闪烁（无限循环，yoyo 往返）============
gsap.to('.star', {
  opacity: () => Math.random() * 0.9 + 0.1,
  duration: 1.5,
  repeat: -1,
  yoyo: true,
  stagger: { each: 0.02, from: 'random' },
})

playIntro()

// ============ 5. 重播按钮 ============
document.getElementById('replay').onclick = () => {
  gsap.set('.star', { opacity: 0 })
  gsap.set('#title', { attr: { 'font-size': 0 } })
  playIntro()
}

window.gsap = gsap
