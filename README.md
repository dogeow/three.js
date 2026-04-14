# Three.js 入门到进阶教程

一套循序渐进的 Three.js 教程，**131 节**独立可运行的 HTML 示例，从第一个 Hello Cube 一路到 PBR、后期、物理、骨骼动画、程序化地形等高级技术。

## 运行方式

```bash
# 在当前目录启动本地服务（任选其一）
npx serve .
# 或
python3 -m http.server 8000
```

然后访问 `http://localhost:3000` 或 `http://localhost:8000`。

> 直接双击 HTML 通常也能跑，但第 09 (GLTF) / 20 / 22 等需要加载外部资源的章节必须走本地服务器，否则 CORS 拦截。

---

## 核心概念速览

Three.js 渲染一帧需要三样东西：

```
Scene（场景）        ——  3D 世界的容器，所有物体都加进去
  ├── Mesh         ——  网格 = 几何体(Geometry) + 材质(Material)
  ├── Light        ——  灯光
  └── Camera       ——  相机：决定从哪个角度看场景

Renderer（渲染器）   ——  把 Scene 用 Camera 视角画到 <canvas> 上
```

最小渲染循环：

```js
function animate() {
  requestAnimationFrame(animate)
  // 更新物体属性...
  renderer.render(scene, camera)
}
animate()
```

---

## 目录

### 一、基础篇 · 上手 Three.js（01~10）

| # | 章节 | 技术点 |
|---|------|-------|
| [01](./01-hello-scene/index.html) | Hello 场景 | Scene / Camera / Renderer 三件套 |
| [02](./02-geometry-material/index.html) | 几何体与材质 | 常见 Geometry + 4 种 Material 对比 |
| [03](./03-lights-shadows/index.html) | 灯光与阴影 | 环境光/平行光/点光 + castShadow |
| [04](./04-textures/index.html) | 纹理贴图 | TextureLoader，颜色贴图、法线贴图、重复 |
| [05](./05-canvas-texture/index.html) | Canvas 动态纹理 | 用 Canvas 2D 实时绘制并作为纹理 |
| [06](./06-video-texture/index.html) | Video 纹理 | `<video>` 元素直接变 3D 贴图 |
| [07](./07-orbit-controls/index.html) | 相机控制 | OrbitControls 鼠标拖拽/缩放 |
| [08](./08-raycaster/index.html) | 鼠标拾取 | Raycaster 悬停/点击物体 |
| [09](./09-gltf-loader/index.html) | 加载 3D 模型 | GLTFLoader 加载 .glb |
| [10](./10-loading-manager/index.html) | 加载管理器 | LoadingManager 统一管理进度 |

### 二、几何与材质进阶（11~20）

| # | 章节 | 技术点 |
|---|------|-------|
| [11](./11-extrude-shape/index.html) | Shape / ExtrudeGeometry | 2D 形状挤出成 3D |
| [12](./12-curve-tube/index.html) | 曲线与管道 | CatmullRomCurve3 + TubeGeometry |
| [13](./13-text-geometry/index.html) | 3D 文字 | FontLoader + TextGeometry |
| [14](./14-geometry-merge/index.html) | 几何体合并 | BufferGeometryUtils.mergeGeometries 性能优化 |
| [15](./15-vertex-animation/index.html) | 顶点动画 | 每帧修改 position buffer |
| [16](./16-morph-targets/index.html) | **形变目标 ★** | MorphTargets 多套顶点混合（球化/尖刺/扭曲） |
| [17](./17-blending-modes/index.html) | 混合模式 | Additive / Multiply / Normal 对比 |
| [18](./18-environment-map/index.html) | 环境贴图 PBR | PMREMGenerator + metalness/roughness |
| [19](./19-custom-shader/index.html) | 自定义 Shader | ShaderMaterial + GLSL 水波 |
| [20](./20-instanced-mesh/index.html) | 实例化渲染 | InstancedMesh 1 万方块 1 个 Draw Call |

### 三、场景与氛围（21~28）

| # | 章节 | 技术点 |
|---|------|-------|
| [21](./21-fog-atmosphere/index.html) | 雾效 | Scene.fog / FogExp2 远景渐隐 |
| [22](./22-sky-water/index.html) | 天空与海面 | Sky + Water addon 真实大气散射 |
| [23](./23-particles/index.html) | 粒子系统 | 5 万 Points + AdditiveBlending |
| [24](./24-galaxy/index.html) | 程序化银河 | 螺旋公式 + 颜色插值，可调参数 |
| [25](./25-terrain-perlin/index.html) | **程序化地形 ★** | Value Noise + FBM 分形，按高度着色 |
| [26](./26-marching-cubes/index.html) | Metaball 流体 | MarchingCubes 等值面 |
| [27](./27-mirror/index.html) | 镜面反射 | Reflector 真实倒映 |
| [28](./28-cube-camera/index.html) | 动态反射 | CubeCamera 实时环境捕捉 |

### 四、后期处理与渲染技巧（29~35）

| # | 章节 | 技术点 |
|---|------|-------|
| [29](./29-bloom-postfx/index.html) | 辉光 Bloom | EffectComposer + UnrealBloomPass |
| [30](./30-bokeh-postfx/index.html) | 景深 Bokeh | BokehPass 模拟大光圈虚化 |
| [31](./31-outline-selection/index.html) | 选中描边 | 双 OutlinePass（悬停+锁定） |
| [32](./32-render-target/index.html) | 离屏渲染 | WebGLRenderTarget 纹理作为另一个场景输入 |
| [33](./33-lod/index.html) | 细节层级 | LOD 远近切换低/高模 |
| [34](./34-clipping-planes/index.html) | 裁剪平面 | clippingPlanes 剖切查看内部 |
| [35](./35-decal/index.html) | **表面贴花 ★** | DecalGeometry 点击生成弹孔 |

### 五、交互与控制（36~44）

| # | 章节 | 技术点 |
|---|------|-------|
| [36](./36-css2d-labels/index.html) | HTML 标签 | CSS2DRenderer 跟随 3D 物体 |
| [37](./37-sprites-billboards/index.html) | 精灵 Billboard | Sprite 永远面向相机 |
| [38](./38-drag-controls/index.html) | 拖拽物体 | DragControls 鼠标直接拖动 |
| [39](./39-transform-controls/index.html) | 变换控件 | TransformControls 物体平移/旋转/缩放 |
| [40](./40-first-person/index.html) | 第一人称漫游 | PointerLockControls + WASD + 跳跃 |
| [41](./41-camera-switch/index.html) | 多相机切换 | 透视/正交 + 多视口布局 |
| [42](./42-camera-tween/index.html) | **相机补间 ★** | 自制 easeInOutCubic + waypoints 巡游 |
| [43](./43-animation-mixer/index.html) | 骨骼动画 | AnimationMixer + 动作交叉淡入淡出 |
| [44](./44-gui-debug/index.html) | 调试面板 | lil-gui 参数实时调节 |

### 六、物理与综合实战（45~46）

| # | 章节 | 技术点 |
|---|------|-------|
| [45](./45-physics/index.html) | 物理引擎 | cannon-es 发射球砸积木塔 |
| [46](./46-solar-system/index.html) | **综合：太阳系** | 父子节点 / 公转 / 自转 / 卫星 |

### 七、特效着色（47~50）

| # | 章节 | 技术点 |
|---|------|-------|
| [47](./47-toon-shading/index.html) | **卡通着色 ★** | MeshToonMaterial +渐变纹理，实现赛璐璐风格 |
| [48](./48-fat-lines/index.html) | 粗线条 | Line2 + LineMaterial，点线轨迹可视化 |
| [49](./49-edges-wireframe/index.html) | 线框增强 | EdgesGeometry + LineSegments，边缘提取 |
| [50](./50-fresnel-hologram/index.html) | **菲涅尔全息 ★** | Fresnel 着色器，透明物体边缘发光全息感 |

### 八、综合与进阶（51~58）

| # | 章节 | 技术点 |
|---|------|-------|
| [51](./51-particle-attractor/index.html) | **粒子引力场 ★** | 鼠标吸引/排斥粒子，速度/颜色随距离变化 |
| [52](./52-ssao-postfx/index.html) | **环境光遮蔽 ★** | SSAOPass，物体接触处产生接触阴影 |
| [53](./53-glass-refraction/index.html) | **玻璃折射 ★** | MeshPhysicalMaterial + transmission + IOR |
| [54](./54-camera-shake/index.html) | **镜头抖动 ★** | 多频正弦叠加衰减震动，点击/按钮触发 |
| [55](./55-shadow-mapping/index.html) | **阴影地图对比 ★** | Basic / PCF / PCFSoft 三种模式并排对比 |
| [56](./56-terrain-flythrough/index.html) | **地形穿越飞行 ★** | 程序化地形 + PointerLock + 地形跟随 |
| [57](./57-audio-reactive/index.html) | **音频可视化 ★** | Web Audio API，频谱驱动 3D 几何体缩放 |
| [58](./58-boolean-geometry/index.html) | **布尔几何体 ★** | 并集/差集/交集组合，透明材质观察内部 |

### 九、高级视觉效果（59~66）

### 十、综合创意（67~70）

### 十一、Shader与后处理（71~74）

### 十二、综合与视觉（75~78）

### 十三、综合创作（79~82）

### 十四、物理与仿真（83~86）

### 十五、综合与特色（87~90）

| # | 章节 | 技术点 |
|---|------|-------|
| [59](./59-ray-marching/index.html) | **光线步进 ★** | GLSL Ray Marching + SDF，实时渲染球体/立方体/圆环 |
| [60](./60-volumetric-light/index.html) | **体积光 ★** | God Rays 径向模糊，逆光穿透粒子的光柱效果 |
| [61](./61-sprite-animation/index.html) | **精灵动画 ★** | Canvas 绘制序列帧，UV 偏移驱动帧切换 |
| [62](./62-voxel-terrain/index.html) | **体素地形 ★** | 网格合并 + 面剔除，优化 Draw Call 渲染体素世界 |
| [63](./63-smoke-fire/index.html) | **火焰与烟雾 ★** | 多层粒子系统，GPU 顶点着色器驱动颜色与尺寸 |
| [64](./64-portal-wormhole/index.html) | **传送门 ★** | 极坐标着色器扭曲，粒子螺旋吸入效果 |
| [65](./65-water-ripple/index.html) | **水波涟漪 ★** | CPU 波浪方程，点击水面产生涟漪扩散 |
| [66](./66-snow-accumulation/index.html) | **积雪效果 ★** | 粒子落地堆积，实时顶点位移积雪层 |
| [67](./67-cloth-simulation/index.html) | **布料模拟 ★** | Verlet积分粒子-弹簧系统，鼠标拖拽交互 |
| [68](./68-gpu-particles/index.html) | **GPU粒子系统 ★** | 顶点着色器驱动轨迹，50万粒子零CPU开销 |
| [69](./69-terrain-erosion/index.html) | **地形侵蚀模拟 ★** | 水力侵蚀+热力侵蚀，实时刻蚀生成峡谷河道 |
| [70](./70-dithered-transparency/index.html) | **抖动透明 ★** | Bayer矩阵有序抖动，无需排序的伪透明渲染 |
| [71](./71-fluid-shader/index.html) | **流体着色器 ★** | 帧缓冲器乒乓技术，Navier-Stokes简化方程渲染墨水扩散 |
| [72](./72-metaballs/index.html) | **融球 Metaballs ★** | MarchingCubes等值面提取，融球合并分离的有机效果 |
| [73](./73-game-of-life/index.html) | **GPU生命游戏 ★** | 康威生命游戏，GPU帧缓冲器计算，鼠标点击染色，右键清除 |
| [74](./74-holographic-display/index.html) | **全息投影 ★** | Pepper's Ghost金字塔投影，扫描线菲涅尔全息效果 |
| [75](./75-aurora-borealis/index.html) | **极光 Aurora ★** | FBM噪声驱动光带，多层透明度叠加，粒子星尘效果 |
| [76](./76-lens-flare/index.html) | **镜头眩光 ★** | THREE.Lensflare六边形散景，鬼影重影，变形宽银幕光斑 |
| [77](./77-solar-system/index.html) | **太阳系 ★** | 开普勒轨道运动，公转自转，土星环与卫星系统 |
| [78](./78-noise-flow-field/index.html) | **噪声流场 ★** | Perlin噪声流场，4万GPU粒子系统，点击鼠标产生涡流扰动 |
| [79](./79-procedural-city/index.html) | **程序化城市 ★** | InstancedMesh高效渲染，程序建筑生成，日夜切换 |
| [80](./80-force-graph/index.html) | **力导向图 ★** | 库仑斥力+弹簧引力，Verlet物理积分，节点拖拽 |
| [81](./81-terrain-blend/index.html) | **地形材质混合 ★** | 多通道顶点色混合，坡度/高度分层，草方块散布 |
| [82](./82-wireframe-world/index.html) | **线框世界 ★** | 全线框渲染，扫描线动画，赛博朋克数字景观 |
| [83](./83-splines-animation/index.html) | **样条动画 ★** | CatmullRom曲线，物体沿路径运动，切线方向对齐 |
| [84](./84-soft-body/index.html) | **软体模拟 ★** | 弹簧-质点系统，Verlet积分，碰撞反弹形变 |
| [85](./85-parallax-mapping/index.html) | **视差映射 ★** | 法线/视差/遮蔽映射三档对比，砖墙高度图 |
| [86](./86-ocean-waves/index.html) | **海洋波浪 ★** | Gerstner波浪叠加，顶点位移着色器，菲涅尔反射 |
| [87](./87-voxel-character/index.html) | **体素角色 ★** | InstancedMesh身体部件，程序化行走/跳跃动画 |
| [88](./88-sound-visualizer/index.html) | **声音可视化 ★** | Web Audio API频谱分析，频谱驱动3D几何体 |
| [89](./89-rain-system/index.html) | **雨天气系统 ★** | Points粒子雨，溅射，闪电光效，湿地面反射 |
| [90](./90-hair-fur/index.html) | **毛发渲染 ★** | Shell分层渲染，阿尔法剔除，顶点位移风力动画 |

### 十六、风格化后期（91~99）

| # | 章节 | 技术点 |
|---|------|-------|
| [91](./91-afterimage-trails/index.html) | **残影拖尾 ★** | AfterimagePass 叠帧保留运动轨迹，强化速度感 |
| [92](./92-film-grain/index.html) | **胶片颗粒 ★** | FilmPass 统一处理最终画面，添加噪点和灰度风格 |
| [93](./93-halftone-postfx/index.html) | **半调印刷 ★** | HalftonePass 把渲染结果转成报纸/漫画式点阵 |
| [94](./94-rgb-shift-postfx/index.html) | **RGB 色散 ★** | ShaderPass + RGBShiftShader，做通道错位和镜头色散 |
| [95](./95-glitch-postfx/index.html) | **数字故障 ★** | GlitchPass 施加画面撕裂、错位、断层和扫描噪声 |
| [96](./96-ascii-effect/index.html) | **字符画渲染 ★** | AsciiEffect 用 DOM 字符逐帧重建 3D 场景 |
| [97](./97-css3d-cards/index.html) | **3D HTML 面板 ★** | CSS3DRenderer 把 DOM 卡片放进 3D 空间 |
| [98](./98-peppers-ghost/index.html) | **SVG 矢量渲染 ★** | SVGRenderer 把 3D 场景输出为真正的 SVG 路径 |
| [99](./99-lut-color-grading/index.html) | **LUT 调色 ★** | LUTPass 用查找表统一做电影化色彩分级 |

### 十七、几何采样与高级变形（100~102）

| # | 章节 | 技术点 |
|---|------|-------|
| [100](./100-mesh-surface-sampler/index.html) | **表面散布 ★** | MeshSurfaceSampler 在任意网格表面随机采样 |
| [101](./101-convex-geometry/index.html) | **凸包几何体 ★** | ConvexGeometry 用点云快速生成凸多面体 |
| [102](./102-curve-modifier/index.html) | **曲线变形 ★** | Flow / CurveModifier 让模型沿曲线弯折巡航 |

### 十八、几何优化与空间碰撞（103~105）

| # | 章节 | 技术点 |
|---|------|-------|
| [103](./103-simplify-modifier/index.html) | **网格简化 ★** | SimplifyModifier 在尽量保住轮廓时减少顶点数 |
| [104](./104-csm-shadows/index.html) | **级联阴影 CSM ★** | Cascaded Shadow Maps 把大视锥拆成多段分别投影 |
| [105](./105-obb-collision/index.html) | **定向包围盒 OBB ★** | OBB 跟着物体姿态旋转，碰撞比 AABB 更精确 |

### 十九、交互与 UI（106~108）

| # | 章节 | 技术点 |
|---|------|-------|
| [106](./106-virtual-joystick/index.html) | **虚拟操纵杆 ★** | 触控摇杆 + 跳跃按钮，适合移动端无鼠标漫游 |
| [107](./107-path-recorder/index.html) | **轨迹录制回放 ★** | R 录制相机飞行动画，P 回放，实时调速 |
| [108](./108-grid-snap/index.html) | **网格吸附多选 ★** | Shift 多选 / 框选 / 网格吸附 / 批量旋转删除 |

### 二十、工具与创作（109~111）

| # | 章节 | 技术点 |
|---|------|-------|
| [109](./109-voxel-editor/index.html) | **体素编辑器 ★** | Minecraft 式搭建，左键放块/右键删除，滚轮换色，镜像绘制 |
| [110](./110-procedural-tree/index.html) | **L-System 树木 ★** | 递归字符串替换生成树枝拓扑，风场动画，四季颜色切换 |
| [111](./111-shader-playground/index.html) | **着色器实验室 ★** | 左右分屏，左边写 GLSL 片段着色器，实时预览，6 种预设 |

### 二十一、综合创意（112~121）

| # | 章节 | 技术点 |
|---|------|-------|
| [112](./112-earth-globe/index.html) | **地球仪 ★** | 昼夜分界线、城市灯光、大气辉光、云层、月球卫星 |
| [113](./113-rubiks-cube/index.html) | **魔方 ★** | 3×3 魔方，点击选中面，方向旋转，平滑动画，Shuffle |
| [114](./114-shooting-gallery/index.html) | **射击靶场 ★** | 瞄准射击、弹道轨迹、命中粒子特效、积分系统 |
| [115](./115-solar-system-orbits/index.html) | **太阳系轨道 ★** | 6 大行星、开普勒轨道速度、土星环、卫星、速度滑块 |
| [116](./116-qr-code-3d/index.html) | **3D 二维码 ★** | 立体像素方块、扫描激光、URL 输入重建、InstancedMesh |
| [117](./117-wave-interference/index.html) | **波干涉 ★** | 多源圆波干涉、GLSL 顶点位移、霓虹色图、lil-gui 调参 |
| [118](./118-morphing-blobs/index.html) | **融球变形 ★** | Icosahedron + FBM 噪声变形、虹彩着色器、鼠标悬停发光 |
| [119](./119-data-bar-chart/index.html) | **3D 数据柱图 ★** | CSS2D 标签、动态渐变、弹性入场动画、5 种配色方案 |
| [120](./120-fireworks/index.html) | **烟花粒子 ★** | GPU 粒子爆发、重力下落、拖尾、自动波次，点击/空格发射 |
| [121](./121-crystal-gem/index.html) | **水晶宝石 ★** | 物理材质折射、色散、菲涅尔高光、点击随机生成 |

### 二十二、综合创意 2（122~131）

| # | 章节 | 技术点 |
|---|------|-------|
| [122](./122-fluid-sim/index.html) | **流体模拟 ★** | Eulerian 流体、Navier-Stokes 速度场、压力求解、染料密度、ping-pong FBO |
| [123](./123-character-controller/index.html) | **角色控制器 ★** | 第三人称、胶囊体+WASD+跳跃、重力物理、AABB 碰撞检测、肢体动画 |
| [124](./124-spline-road/index.html) | **程序化道路 ★** | CatmullRomCurve3 道路挤出、车道标线、噪声地形、程序化树木、自动相机 |
| [125](./125-portal-door/index.html) | **传送门 ★** | 双传送门渲染、视口替换、穿越传送、第一人称控制 |
| [126](./126-voronoi-shatter/index.html) | **Voronoi 破碎 ★** | Voronoi 细胞破碎动画、ConvexGeometry 碎片、飞散 + 重力 + 复原 |
| [127](./127-terrain-carver/index.html) | **地形雕刻器 ★** | 可编辑地形、笔刷升降/平滑、Raycaster 笔刷光标、实时顶点更新 |
| [128](./128-cloth-flag/index.html) | **布料旗帜 ★** | Verlet 积分布料模拟、弹簧约束、风力震动、顶点着色器联动 |
| [129](./129-magnetic-field/index.html) | **磁场可视化 ★** | 偶极子场计算、RK4 磁场线追踪、粒子流线、磁铁交互 |
| [130](./130-kinect-pose/index.html) | **姿态捕捉 ★** | 摄像头姿态骨架、手部/全身关键点、骨骼线框跟随、交互球体 |
| [131](./131-sdf-sculptor/index.html) | **SDF 雕刻器 ★** | GPU Raymarching、SDF 基础体素、雕刻/减去/平滑、笔刷光标 |

---

## 学习建议

1. **按顺序看**：每节都基于上一节的概念
2. **动手改参数**：调灯光颜色、相机位置、几何体分段数，观察变化
3. **打开 DevTools**：每节都把关键对象挂到 `window` 上（如 `window.cube.rotation.x = 1`）
4. 每章顶部的 `<div class="tip">` 会用一句话说明「本节技术点 + 对应效果」，先看这段再读代码

## 技术栈

- **Three.js** `0.160.0`
- **原生 ES Modules + importmap**，零构建工具
- **cannon-es** `0.20.0`（仅第 45 节物理章节）
- 第 09/13/20/22/26/28/35/43/52/53 节需要联网加载模型/纹理，其余完全离线可跑

## 章节索引（按技术点）

需要查某个功能在哪节？按字母序速查：

- **AnimationMixer** → 43
- **AfterimagePass** → 91
- **AsciiEffect** → 96
- **BloomPass** → 29
- **BokehPass** → 30
- **BufferGeometryUtils** → 14
- **CanvasTexture** → 05
- **cannon-es 物理** → 45
- **ClippingPlanes** → 34
- **CSM / Cascaded Shadows** → 104
- **CSS2DRenderer** → 36
- **CSS3DRenderer** → 97
- **CubeCamera** → 28
- **DecalGeometry** → 35
- **DragControls** → 38
- **EffectComposer** → 29 / 30 / 31 / 91 / 92 / 93 / 94 / 95 / 99
- **ExtrudeGeometry** → 11
- **FilmPass** → 92
- **FirstPerson / PointerLock** → 40 / 56 / 125
- **Fog** → 21
- **FontLoader / TextGeometry** → 13
- **GLTFLoader** → 09
- **GlitchPass** → 95
- **GPU 粒子** → 68
- **HalftonePass** → 93
- **InstancedMesh** → 20
- **lil-gui** → 44
- **LOD** → 33
- **LUTPass** → 99
- **MarchingCubes** → 26
- **MeshSurfaceSampler** → 100
- **MorphTargets** → 16
- **OBB / 定向包围盒** → 105
- **OrbitControls** → 07
- **OutlinePass** → 31
- **Particles / Points** → 23 / 24
- **SVGRenderer** → 98
- **PMREM / PBR** → 18
- **Raycaster** → 08 / 35 / 38 / 31
- **Reflector** → 27
- **RenderTarget** → 32
- **RGBShiftShader** → 94
- **ShaderMaterial** → 19
- **ShaderPass** → 94
- **SimplifyModifier** → 103
- **Sky + Water** → 22
- **Sprite** → 37
- **TransformControls** → 39
- **TubeGeometry** → 12
- **ConvexGeometry** → 101 / 126
- **CurveModifier / Flow** → 102
- **Tween (自制)** → 42
- **Value Noise / FBM** → 25
- **VideoTexture** → 06
- **顶点动画** → 15
- **多相机视口** → 41
- **混合模式** → 17
- **加载管理器** → 10
- **Toon / 卡通着色** → 47
- **Fat Lines** → 48
- **EdgesGeometry** → 49
- **Fresnel** → 50
- **粒子引力场** → 51
- **SSAO** → 52
- **玻璃折射** → 53
- **镜头抖动** → 54
- **阴影地图** → 55
- **地形穿越** → 56
- **音频可视化** → 57
- **布尔几何体** → 58
- **Ray Marching / SDF** → 59
- **体积光 / God Rays** → 60
- **精灵动画** → 61
- **Voxel 体素** → 62
- **烟雾 / 火焰粒子** → 63
- **传送门 / 虫洞** → 64
- **水波涟漪** → 65
- **积雪效果** → 66
- **布料模拟** → 67 / 128
- **GPU粒子系统** → 68
- **地形侵蚀** → 69
- **抖动透明** → 70
- **流体着色器** → 71
- **融球 / Metaballs** → 72
- **GPU 生命游戏** → 73
- **全息投影** → 74
- **极光** → 75
- **镜头眩光** → 76
- **太阳系** → 77
- **噪声流场** → 78
- **程序化城市** → 79
- **力导向图** → 80
- **地形材质混合** → 81
- **线框世界** → 82
- **样条动画** → 83
- **软体模拟** → 84
- **视差映射** → 85
- **海洋波浪** → 86
- **体素角色** → 87
- **声音可视化** → 88
- **雨天气系统** → 89
- **毛发渲染** → 90
- **虚拟操纵杆** → 106
- **轨迹录制回放** → 107
- **网格吸附** → 108
- **多选 / 框选** → 108
- **体素编辑器** → 109
- **L-System 树木** → 110
- **Shader Playground** → 111
- **GLSL 片段着色器** → 111
- **地球仪 / 昼夜分界** → 112
- **魔方** → 113
- **射击靶场** → 114
- **太阳系轨道** → 115
- **3D 二维码** → 116
- **波干涉** → 117
- **融球 / Metaballs** → 118
- **3D 数据柱图** → 119
- **烟花粒子** → 120
- **水晶宝石** → 121
- **流体模拟** → 122
- **角色控制器** → 123
- **程序化道路** → 124
- **传送门** → 125
- **Voronoi 破碎** → 126
- **地形雕刻器** → 127
- **布料模拟** → 128
- **磁场可视化** → 129
- **姿态捕捉** → 130
- **SDF 雕刻** → 131
