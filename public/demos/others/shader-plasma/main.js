// ============ GLSL Shader · Plasma ============
// 纯 WebGL 原生 API，零依赖
// 核心思路：一个全屏矩形 + fragment shader 每像素独立计算颜色
// 这是 shadertoy 那种"GPU 数学艺术"的入门款
// 应用：H5 背景、游戏后处理、创意编程、视觉特效

const canvas = document.getElementById('c')
const gl = canvas.getContext('webgl')
if (!gl) throw new Error('WebGL 不支持')

// ============ 1. 两个 shader ============

// 顶点着色器：只负责把全屏四边形放到裁剪空间（clip space）
const vsSrc = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

// 片元着色器：每个像素独立运行（GPU 并行几百万次/帧）
// 用 sin/cos 叠加 + 距离场做经典 plasma 效果
const fsSrc = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;

void main() {
  // 归一化坐标（-1 ~ 1，保持宽高比）
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  vec2 m = (u_mouse - 0.5 * u_res) / min(u_res.x, u_res.y);

  float t = u_time * 0.5;

  // 叠加 4 层正弦波 => 经典 plasma
  float v = sin(uv.x * 4.0 + t);
  v += sin(uv.y * 4.0 - t * 0.7);
  v += sin((uv.x + uv.y + t) * 3.0);
  v += sin(length(uv - m) * 8.0 - t * 2.0); // 鼠标距离场
  v *= 0.25;

  // 用 cos 生成彩虹色带
  vec3 col = 0.5 + 0.5 * cos(6.2831 * (v + vec3(0.0, 0.33, 0.67)));

  gl_FragColor = vec4(col, 1.0);
}
`

// ============ 2. 编译 + 链接 ============
function compile(type, src) {
  const s = gl.createShader(type)
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s))
  }
  return s
}

const prog = gl.createProgram()
gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc))
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc))
gl.linkProgram(prog)
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(prog))
}
gl.useProgram(prog)

// ============ 3. 全屏矩形（两个三角形盖满整个 clip space）============
const buf = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buf)
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    -1, -1,  1, -1,  -1,  1,
    -1,  1,  1, -1,   1,  1,
  ]),
  gl.STATIC_DRAW
)

const locPos = gl.getAttribLocation(prog, 'a_pos')
gl.enableVertexAttribArray(locPos)
gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0)

// ============ 4. uniform 句柄 ============
const uTime = gl.getUniformLocation(prog, 'u_time')
const uRes = gl.getUniformLocation(prog, 'u_res')
const uMouse = gl.getUniformLocation(prog, 'u_mouse')

// ============ 5. 鼠标 + resize ============
const mouse = { x: innerWidth / 2, y: innerHeight / 2 }
addEventListener('mousemove', e => {
  mouse.x = e.clientX
  mouse.y = innerHeight - e.clientY // WebGL 的 y 向上
})

function resize() {
  canvas.width = innerWidth * devicePixelRatio
  canvas.height = innerHeight * devicePixelRatio
  gl.viewport(0, 0, canvas.width, canvas.height)
}
resize()
addEventListener('resize', resize)

// ============ 6. 渲染循环 ============
function frame(t) {
  gl.uniform1f(uTime, t * 0.001)
  gl.uniform2f(uRes, canvas.width, canvas.height)
  gl.uniform2f(uMouse, mouse.x * devicePixelRatio, mouse.y * devicePixelRatio)
  gl.drawArrays(gl.TRIANGLES, 0, 6)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
