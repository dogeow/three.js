// ============ Lottie · 矢量动画播放器 ============
// Lottie = Airbnb 开源的矢量动画格式
// 设计师在 AE 里做动画 → Bodymovin 插件导出 JSON → Web/iOS/Android 通吃
// 核心优势：文件只有几 KB、无损缩放、性能比 GIF 好 10 倍
// 应用：引导页、loading、按钮微交互、空状态插画、礼物特效

import lottie from 'https://esm.sh/lottie-web@5.12.2'

// ============ 1. 内置示例动画（一个简单的弹跳小球，作者手搓）============
// Lottie JSON 的 schema：
//   v=版本 / fr=帧率 / ip,op=起止帧 / w,h=尺寸 / layers=图层数组
// 每个图层有自己的 transform（位置/旋转/缩放）和 shapes（形状描述）
const DEMO_JSON = {
  v: '5.7.4', fr: 60, ip: 0, op: 120, w: 400, h: 400, nm: 'demo', ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0, ind: 1, ty: 4, nm: 'ball',
      sr: 1, ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        // 位置：关键帧动画（y 轴上下弹跳）
        p: {
          a: 1,
          k: [
            { t: 0,   s: [200, 80],  h: 0, i: { x: 0.5, y: 1 }, o: { x: 0.5, y: 0 } },
            { t: 60,  s: [200, 320], h: 0, i: { x: 0.5, y: 1 }, o: { x: 0.5, y: 0 } },
            { t: 120, s: [200, 80] },
          ],
        },
        a: { a: 0, k: [0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0,  s: [100, 100] },
            { t: 58, s: [120, 80]  },
            { t: 62, s: [120, 80]  },
            { t: 120, s: [100, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] } },
            { ty: 'fl', c: { a: 0, k: [0.29, 0.56, 1, 1] }, o: { a: 0, k: 100 } },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        },
      ],
      ao: 0, ip: 0, op: 120, st: 0, bm: 0,
    },
    // 地面阴影
    {
      ddd: 0, ind: 2, ty: 4, nm: 'shadow',
      sr: 1, ks: {
        o: { a: 1, k: [{ t: 0, s: [40] }, { t: 60, s: [80] }, { t: 120, s: [40] }] },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [200, 360] },
        a: { a: 0, k: [0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0,  s: [100, 100] },
            { t: 60, s: [60, 60]   },
            { t: 120, s: [100, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [120, 30] } },
            { ty: 'fl', c: { a: 0, k: [0, 0, 0, 1] }, o: { a: 0, k: 100 } },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
        },
      ],
      ao: 0, ip: 0, op: 120, st: 0, bm: 0,
    },
  ],
}

// ============ 2. 加载动画 ============
let anim

function loadAnim(data) {
  if (anim) anim.destroy()
  anim = lottie.loadAnimation({
    container: document.getElementById('stage'),
    renderer: 'svg',   // 也可以用 'canvas' / 'html'
    loop: true,
    autoplay: true,
    animationData: data,
  })
  anim.addEventListener('enterFrame', () => {
    frameInput.max = anim.totalFrames.toFixed(0)
    frameInput.value = anim.currentFrame.toFixed(0)
    frameLabel.textContent = anim.currentFrame.toFixed(0)
  })
}

loadAnim(DEMO_JSON)

// ============ 3. 控制按钮 ============
const speedInput = document.getElementById('speed')
const speedLabel = document.getElementById('speedLabel')
const frameInput = document.getElementById('frame')
const frameLabel = document.getElementById('frameLabel')

document.getElementById('play').onclick = () => anim.play()
document.getElementById('pause').onclick = () => anim.pause()
document.getElementById('stop').onclick = () => anim.stop()

speedInput.oninput = () => {
  anim.setSpeed(parseFloat(speedInput.value))
  speedLabel.textContent = parseFloat(speedInput.value).toFixed(1) + '×'
}

frameInput.oninput = () => {
  anim.goToAndStop(parseInt(frameInput.value), true)
  frameLabel.textContent = frameInput.value
}

// ============ 4. 文件上传：加载用户自己的 Lottie JSON ============
document.getElementById('file').onchange = e => {
  const f = e.target.files[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      loadAnim(JSON.parse(reader.result))
    } catch (err) {
      alert('解析失败：' + err.message)
    }
  }
  reader.readAsText(f)
}

// 暴露调试
window.anim = () => anim
