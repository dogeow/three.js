// ============ Web Audio API · 频谱可视化 ============
// 核心链路：AudioContext → MediaElementSource → AnalyserNode → 频域数据 → Canvas
// 不用第三方库，纯浏览器 API
// 应用：音乐播放器、语音 UI、直播特效、短视频滤镜

const canvas = document.getElementById('c')
const ctx = canvas.getContext('2d')
const fileInput = document.getElementById('file')
const audio = document.getElementById('audio')
const intro = document.getElementById('intro')

function resize() {
  const dpr = devicePixelRatio || 1
  canvas.width = innerWidth * dpr
  canvas.height = innerHeight * dpr
  canvas.style.width = innerWidth + 'px'
  canvas.style.height = innerHeight + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}
resize()
addEventListener('resize', resize)

let audioCtx, analyser, data, bufLen

// ============ 1. 选择音频文件 ============
fileInput.onchange = () => {
  const f = fileInput.files[0]
  if (!f) return
  audio.src = URL.createObjectURL(f)
  audio.style.display = 'block'
  intro.style.display = 'none'
  audio.play()
  if (!audioCtx) setupAudio()
}

// ============ 2. 构建 Web Audio 节点图 ============
function setupAudio() {
  // AudioContext 是 Web Audio 的总入口，所有节点都挂在它上面
  audioCtx = new (window.AudioContext || window.webkitAudioContext)()

  // 把 <audio> 元素转成 audio source
  const source = audioCtx.createMediaElementSource(audio)

  // AnalyserNode：分析器，可以取频域 / 时域数据
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 512               // 2 的幂，越大频率分辨率越高
  analyser.smoothingTimeConstant = 0.8 // 平滑系数（0~1），越大越柔和

  // 节点图：audio 元素 → 分析器 → 扬声器
  source.connect(analyser)
  analyser.connect(audioCtx.destination) // 连到 destination 才能听到声音

  bufLen = analyser.frequencyBinCount // = fftSize / 2
  data = new Uint8Array(bufLen)

  draw()
}

// ============ 3. 渲染循环 ============
function draw() {
  requestAnimationFrame(draw)
  if (!analyser) return
  analyser.getByteFrequencyData(data) // 填入 0~255 的频谱数据

  // 半透明覆盖做拖尾
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.fillRect(0, 0, innerWidth, innerHeight)

  const cx = innerWidth / 2
  const cy = innerHeight / 2
  const radius = Math.min(innerWidth, innerHeight) * 0.15

  // 环形频谱柱
  for (let i = 0; i < bufLen; i++) {
    const v = data[i] / 255
    const angle = (i / bufLen) * Math.PI * 2 - Math.PI / 2
    const barLen = v * 200 + 5

    const x1 = cx + Math.cos(angle) * radius
    const y1 = cy + Math.sin(angle) * radius
    const x2 = cx + Math.cos(angle) * (radius + barLen)
    const y2 = cy + Math.sin(angle) * (radius + barLen)

    ctx.strokeStyle = `hsl(${(i / bufLen) * 360}, 90%, ${50 + v * 30}%)`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // 中间的音量脉冲圆
  const avg = data.reduce((a, b) => a + b, 0) / bufLen / 255
  ctx.beginPath()
  ctx.arc(cx, cy, radius * (0.9 + avg * 0.4), 0, Math.PI * 2)
  ctx.strokeStyle = `hsla(${(performance.now() * 0.1) % 360}, 90%, 70%, 0.9)`
  ctx.lineWidth = 3
  ctx.stroke()
}

window.getAnalyser = () => analyser
