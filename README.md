# Three.js 入门到进阶教程

一套循序渐进的 Three.js 教程，**169 节**独立可运行的 HTML 示例，从第一个 Hello Cube 一路到 PBR、后期、物理、骨骼动画、程序化地形等高级技术。

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
- [170] Particle Attractor - distance-based force field, velocity color coding

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

### 二十三、综合创意 3（132~141）

| # | 章节 | 技术点 |
|---|------|-------|
| [132](./132-graph-layout/index.html) | **力导向图 ★** | 力导向布局、Coulomb 排斥 + 弹簧吸引、可拖拽节点、CSS2D 标签 |
| [133](./133-stellar-collision/index.html) | **星系碰撞 ★** | 螺旋星系、N-body 引力交互、粒子拖尾、星空背景 |
| [134](./134-flip-clock/index.html) | **翻页时钟 ★** | 3D 翻页动画、Canvas 数字纹理、实时时间、多种配色 |
| [135](./135-marching-cubes/index.html) | **Marching Cubes ★** | 标量场等值面提取、Metaball 密度场、实时网格更新 |
| [136](./136-puzzle-swap/index.html) | **滑块拼图 ★** | 8-puzzle/15-puzzle、滑动动画、华容道、胜利检测 |
| [137](./137-audio-waveform/index.html) | **音频可视化 ★** | Web Audio API、频谱柱图、波形带、文件加载 |
| [138](./138-dither-shader/index.html) | **抖动着色器 ★** | 后期抖动处理、Bayer 矩阵、Floyd-Steinberg、颜色量化 |
| [139](./139-car-physics/index.html) | **汽车物理 ★** | 简化车辆物理、WASD 驾驶、轮胎旋转、障碍碰撞 |
| [140](./140-billiards/index.html) | **台球模拟 ★** | 2D 物理弹性碰撞、摩擦力、瞄准击球、落袋检测 |
| [141](./141-fractal-tree/index.html) | **分形之树 ★** | L-System 分形树、四季变化、风力摇摆、落叶粒子 |

### 二十四、综合创意 4（142~151）

| # | 章节 | 技术点 |
|---|------|-------|
| [142](./142-bubble-pop/index.html) | **泡泡爆破 ★** | 物理材质泡泡、点击爆破、雪花粒子特效、无限生成 |
| [143](./143-parallax-scene/index.html) | **视差场景 ★** | 多层视差背景、Canvas 程序化贴图、鼠标拖拽层间运动 |
| [144](./144-pinball-machine/index.html) | **弹珠台 ★** | 倾斜桌面、弹球物理、弹射挡板、重力弹跳、积分系统 |
| [145](./145-splat-paint/index.html) | **颜料飞溅 ★** | 程序化颜料泼洒、Canvas 纹理生成、颜色选择、撤销功能 |
| [146](./146-crystal-growth/index.html) | **晶体生长 ★** | 程序化晶体生成、MeshPhysicalMaterial 宝石材质、生长动画 |
| [147](./147-domino-chain/index.html) | **多米诺骨牌 ★** | 刚体连锁反应、倾斜动画、球触发、骨牌链式倒塌 |
| [148](./148-lens-distortion/index.html) | **镜头畸变 ★** | ShaderPass 桶形/枕形畸变、场景可视化、多种扭曲模式 |
| [149](./149-rope-bridge/index.html) | **绳索吊桥 ★** | Verlet 绳索模拟、重力下垂、角色行走、动态桥面 |
| [150](./150-neural-network/index.html) | **神经网络可视化 ★** | 节点连线、激活传播动画、数据包流、权重颜色编码 |
| [151](./151-snow-globe/index.html) | **水晶球 ★** | 玻璃穹顶折射、Fresnel 边缘光、内部微缩场景、雪花粒子 |

### 二十五、综合创意 5（152~161）

| # | 章节 | 技术点 |
|---|------|-------|
| [152](./152-origami-crane/index.html) | **折纸仙鹤 ★** | 纸艺折叠动画、顶点关键帧插值、纸张材质 |
| [153](./153-space-debris/index.html) | **太空碎片 ★** | InstancedMesh 碎片场、地球轨道、卫星解体、星空背景 |
| [154](./154-fireflies-swarm/index.html) | **萤火虫群 ★** | Boids 群体算法、发光粒子、吸引/分离/对齐 |
| [155](./155-kaleidoscope/index.html) | **万花筒 ★** | 对称分片着色器、UV 镜像、旋转几何体 |
| [156](./156-holographic-ui/index.html) | **全息面板 ★** | 线框发光面板、雷达扫描动画、HUD 界面元素 |
| [157](./157-lava-lamp/index.html) | **熔岩灯 ★** | 热对流模拟、Metaball 融合、玻璃折射 |
| [158](./158-particle-texture/index.html) | **粒子图像 ★** | Canvas 像素采样、粒子颜色重建、动态图案 |
| [159](./159-spiral-galaxy/index.html) | **螺旋星系 ★** | 对数螺旋星系、粒子星场、自定义着色器 |
| [160](./160-mini-golf/index.html) | **迷你高尔夫 ★** | 2D 物理、传送带瞄准、球洞检测、多球洞 |
| [161](./161-sushi-plate/index.html) | **旋转寿司 ★** | 环形传送带、点击点餐、账单系统、无限补盘 |

### 二十六、综合创意 6（162~169）

| # | 章节 | 技术点 |
|---|------|-------|
| [162](./162-wave-collapse/index.html) | **波函数坍缩 ★** | 约束传播算法，相邻砖块边匹配，实时3D可视化 |
| [163](./163-volumetric-cloud/index.html) | **体积云 Raymarching ★** | GLSL 体积密度采样，48 步光线累积，动态云层流动 |
| [164](./164-physics-pendulum/index.html) | **双摆混沌物理 ★** | Lagrangian 方程 RK4 积分，混沌敏感度，轨迹保留动画 |
| [165](./165-interactive-piano/index.html) | **交互钢琴 ★** | Web Audio 多谐波合成，ADSR 包络，3D 白键/黑键，点击/键盘触发 |
| [166](./166-procedural-clouds/index.html) | **程序化云层 ★** | 多层 2D FBM 噪声，覆盖度/速度可调，UV 漂移流动 |
| [167](./167-holographic-comm/index.html) | **全息通信器 ★** | 全息投影锥，扫描环，脉冲粒子，输入文字实时全息渲染 |
| [168](./168-qubit-viz/index.html) | **量子比特可视化 ★** | 三维布洛赫球，θ/φ 角拖拽，预设 Pauli 态 |
| [169](./169-time-dilation/index.html) | **时间膨胀效应 ★** | 狭义相对论 Lorentz 因子，地面/飞船双时钟，多普勒频移着色 |

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
- **Web Audio API** → 137
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
- **力导向图** → 132
- **星系碰撞** → 133
- **翻页时钟** → 134
- **Marching Cubes** → 135
- **滑块拼图** → 136
- **音频可视化** → 137
- **抖动着色** → 138
- **汽车物理** → 139
- **台球物理** → 140
- **L-System** → 141
- **分形树** → 141
- **泡泡特效** → 142
- **视差渲染** → 143
- **弹珠台** → 144
- **颜料泼洒** → 145
- **晶体生成** → 146
- **多米诺骨牌** → 147
- **镜头畸变** → 148
- **绳索物理** → 149
- **神经网络** → 150
- **水晶球** → 151
- **折纸动画** → 152
- **太空碎片** → 153
- **Boids 算法** → 154
- **万花筒** → 155
- **全息 UI** → 156
- **熔岩灯** → 157
- **粒子图像** → 158
- **螺旋星系** → 159
- **迷你高尔夫** → 160
- **传送带** → 161
- **MeshPhysicalMaterial** → 53 / 121 / 142 / 146 / 151
- **Wave Function Collapse** → 162
- **Volumetric Cloud** → 163
- **Double Pendulum** → 164
- **Interactive Piano** → 165
- **Procedural Clouds** → 166
- **Holographic Communicator** → 167
- **Bloch Sphere** → 168
- **Time Dilation** → 169

## 二十七、新示例（170~）

| [170](./170-particle-attractor/index.html) | **Particle Attractor** | 距离场引力粒子群、鼠标吸引/排斥、速度颜色编码 |
| [171](./171-morph-blob/index.html) | **Morph Blob ★** | FBM顶点变形、虹彩菲涅尔着色、鼠标悬停发光 |
| [172](./172-voxel-fracture/index.html) | **Voxel Fracture ★** | 点击爆炸、Verlet物理、InstancedMesh碎片模拟 |
| [173](./173-audio-fft-visualizer/index.html) | **Audio FFT Visualizer ★** | Web Audio API频谱分析、3D柱图频谱驱动 |
| [174](./174-sdf-raymarcher/index.html) | **SDF Ray Marching ★** | GLSL光线步进、SDF基础体素、软阴影、环境光遮蔽 |
| [175](./175-fluid-dye/index.html) | **Fluid Dye Sim ★** | Navier-Stokes流体、染料平流、ping-pong FBO、鼠标注入 |
| [176](./176-terrain-erosion/index.html) | **Terrain Erosion ★** | 程序化地形、水力侵蚀、热力侵蚀、实时顶点位移 |
| [177](./177-portal-portal/index.html) | **Portal Door ★** | StencilBuffer传送门、RenderTarget视口替换、穿越位移 |
| [178](./178-neural-style-transfer/index.html) | **神经风格迁移 ★** | GLSL 神经风格迁移着色器，卷积网络驱动的艺术风格滤镜 |
| [179](./179-volumetric-fog/index.html) | **体积雾 ★** | Raymarching 体积雾着色器，密度采样衰减，真实雾效 |
| [180](./180-motion-blur/index.html) | **Motion Blur ★** | 累积缓冲时域采样，速度向量驱动方向模糊 |
| [181](./181-water-caustics/index.html) | **水面焦散 ★** | GLSL 焦散着色器，波纹折射光纹，水下光影效果 |
| [182](./182-subsurface-scatter/index.html) | **次表面散射 ★** | MeshPhysicalMaterial 次表面散射，半透明材质光透射效果 |
| [183](./183-procedural-city/index.html) | **程序化城市 ★** | 程序化城市建模，建筑生成，道路网络，日夜切换 |
| [184](./184-crowd-simulation/index.html) | **群体模拟 ★** | Boids 群体行为模拟，分离/聚集/对齐，拥挤人群渲染 |
| [185](./185-quantum-viz/index.html) | **量子计算可视化 ★** | 量子比特门操作可视化，叠加态与纠缠态演示 |


## 二十八、更新示例（186~193）

| [186](./186-sss-skin/index.html) | **次表面散射皮肤 ★** | MeshPhysicalMaterial 次表面散射、透射厚度、散射色彩 |
| [187](./187-cloth-physics/index.html) | **布料物理模拟 ★** | Verlet积分布料、弹簧约束、风力、重力 |
| [188](./188-node-material/index.html) | **程序化材质编辑器 ★** | GLSL程序化图案、棋盘格/同心圆/砖块着色器 |
| [189](./189-gpu-particles-webgl/index.html) | **GPU粒子银河 ★** | 顶点着色器驱动10万粒子、螺旋星系、鼠标吸引交互 |
| [190](./190-procedural-planet/index.html) | **程序化行星生成 ★** | 程序化地形、噪声驱动高度图、多层材质、大气层渲染 |
| [191](./191-ik-chain/index.html) | **反向动力学链条 ★** | FABRIK IK算法、2骨骼链、鼠标跟随末端执行器 |
| [192](./192-audio-visualizer-webgl/index.html) | **Web Audio 3D频谱 ★** | Web Audio API频谱分析、3D柱图、文件加载音频可视化 |
| [193](./193-atmospheric-scattering/index.html) | **大气散射天空 ★** | Rayleigh/Mie散射着色器、太阳位置驱动、天空渐变 |

## 二十九、高级特效（196~）

| # | 章节 | 技术点 |
|---|------|-------|
| [194](./194-particle-trails/index.html) | **粒子轨迹系统 ★** | 流场驱动粒子、环形缓冲拖尾、点击爆发、附加混合发光 |
| [195](./195-lightning-effect/index.html) | **闪电特效 ★** | 递归细分闪电、分支闪电、UnrealBloom发光、Web Audio雷鸣合成 |
| [196](./196-heatmap-visualization/index.html) | **热力图可视化 ★** | Gaussian热力图、ShaderMaterial渐变、Raycaster悬停/点击注入 |
| [197](./197-procedural-fire/index.html) | **程序化火焰特效 ★** | 三层GPU粒子、顶点着色器上升+风力、热度闪烁后期处理、点击冲击 |
| [198](./198-snowflake-generator/index.html) | **雪花生成器 ★** | 六重对称分形、CatmullRomCurve3晶体管、点击随机生成 |
| [199](./199-sand-simulation/index.html) | **沙子物理模拟 ★** | 网格粒子、角度安息角、InstancedMesh 25万粒子、点击/拖动倾倒 |
| [200](./200-graph-layout/index.html) | **力导向图布局 ★** | Barabási–Albert无标度网络、Verlet物理、Coulomb排斥+弹簧吸引、拖拽交互 |
| [201](./201-voronoi-diagram/index.html) | **Voronoi 图可视化 ★** | Fortune算法3D Voronoi细胞、点击添加点、边缘着色、动态更新 |
| [202](./202-dna-helix/index.html) | **DNA 双螺旋可视化 ★** | 双螺旋骨架、碱基对rungs、5'/3'端点标签、MeshStandardMaterial金属质感 |
| [203](./203-fractal-mandelbrot/index.html) | **Mandelbrot 分形可视化 ★** | GLSL Mandelbrot迭代计算、顶点着色器Z轴位移、三套平滑配色方案 |
| [204](./204-puzzle-3d-slab/index.html) | **3D 滑块拼图 ★** | 4×4滑块谜题、点击滑动、胜利检测、洗牌动画 |
| [205](./205-solar-system-3d/index.html) | **太阳系 3D ★** | 八大行星、艺术比例、土星环、木卫四、地球月亮、5000星场 |
| [206](./206-spline-editor/index.html) | **CatmullRom样条编辑器 ★** | 拖拽控制点、实时曲线更新、TubeGeometry管道、沿曲线运动体 |
| [207](./207-ping-pong-physics/index.html) | **3D乒乓球游戏 ★** | 球拍物理、AI对战、旋转效果、Web Audio音效、粒子爆发 |
| [208](./208-procedural-crystal/index.html) | **程序化水晶生成器 ★** | MeshPhysicalMaterial折射、IOR 2.4、彩虹棱晶色、PMREM环境映射、UnrealBloom |
| [209](./209-wave-function-collapse-3d/index.html) | **3D波函数坍缩 ★** | WFC熵选择+约束传播、InstancedMesh体素渲染、三种瓷砖类型、生成耗时显示 |
| [210](./210-tesseract-hypercube/index.html) | **四维超立方体 ★** | 4D tesseract投影、旋转动画、投影矩阵可视化 |
| [211](./211-packing-spheres/index.html) | **球体最密堆积 ★** | FCC晶格排列、空间填充算法、Raycaster交互 |
| [212](./212-shader-graph-visualizer/index.html) | **着色器函数图像 ★** | GLSL动态编译、实时函数可视化、ShaderMaterial |
| [213](./213-diffusion-limited-aggregation/index.html) | **DLA分形生长 ★** | 随机游走粒子聚集、分形树生长、InstancedMesh |
| [214](./214-marching-squares-contour/index.html) | **等值线图 Marching Squares ★** | 标量场等值线、噪声高度场、交互式场编辑 |
| [215](./215-planck-scale-universe/index.html) | **普朗克尺度到宇宙 ★** | 宇宙尺度对比、指数级缩放、25个数量级 |
| [216](./216-music-visualizer-3d/index.html) | **3D音乐可视化器 ★** | Web Audio API频谱分析、3D柱图森林、节拍检测 |
| [217](./217-topological-data-analysis/index.html) | **拓扑数据分析 TDA ★** | 持续同调、Vietoris-Rips复形、拓扑特征可视化 |
| [218](./218-quantum-entanglement/index.html) | **量子纠缠可视化 ★** | 量子纠缠态、Bell态、粒子对关联、纠缠度量 |
| [219](./219-plasma-physics/index.html) | **等离子体物理模拟 ★** | 等离子体粒子模拟、电磁场渲染、Lorentz力、粒子轨迹 |
| [220](./220-procedural-coral/index.html) | **程序化珊瑚礁 ★** | 程序化珊瑚生成、递归分支算法、水下焦散、气泡粒子 |
| [221](./221-crystal-lattice/index.html) | **晶体晶格振动 ★** | FCC晶格、晶格振动波传播、顶点着色器、声子概念 |
| [222](./222-perlin-flowmap/index.html) | **Perlin噪声流场 ★** | FBM噪声流场、粒子丝带轨迹、流向颜色编码、环形包裹 |
| [223](./223-magnetic-monopole/index.html) | **磁单极子可视化 ★** | 磁场线可视化、Line2场线箭头、UnrealBloom发光、Dirac磁单极子理论 |
| [224](./224-string-theory/index.html) | **弦理论可视化 ★** | 卡拉比-丘流形、额外维度、弦振动模式、弦论物理 |
| [225](./225-black-hole-lensing/index.html) | **黑洞引力透镜 ★** | 引力透镜后期着色器、吸积盘多普勒频移、事件视界、光子球 |

## 三十、科学与物理特效（226~232）

| # | 章节 | 技术点 |
|---|------|-------|
| [226](./226-webxr-vr/index.html) | **WebXR VR体验 ★** | WebXR API、VR控制器、沉浸式虚拟现实、三维空间交互 |
| [227](./227-sdf-garden/index.html) | **SDF 虚拟花园 ★** | SDF渲染、程序化植物生长、距离场着色、虚拟自然场景 |
| [228](./228-ecosystem-sim/index.html) | **生态系统模拟 ★** | 生态仿真、生物种群动态、捕食者-猎物模型、生态平衡 |
| [229](./229-weather-system/index.html) | **天气系统模拟 ★** | 体积云渲染、雨粒子系统、闪电效果、天气状态切换 |
| [230](./230-procedural-architecture/index.html) | **程序化建筑学 ★** | 程序化建筑生成、Algorithmic AIA、规则驱动设计、结构优化 |
| [231](./231-reaction-diffusion/index.html) | **反应扩散系统 ★** | Gray-Scott模型、化学反应扩散、图灵斑图、Pattern生成 |
| [232](./232-particle-sandglider/index.html) | **粒子沙盒滑块 ★** | 3D网格空间哈希、粒子碰撞、InstancedMesh渲染、24万粒子 |
| [233](./233-spline-railroad/index.html) | **铁路过山车 ★** | CatmullRomCurve3铁轨生成、火车车厢跟随、Matrix4轨道铺设、预设轨道形状 |
| [234](./234-particle-physics/index.html) | **粒子物理引擎 ★** | Verlet积分、弹簧约束、刚体碰撞、摩擦力 |
| [235](./235-procedural-canyon/index.html) | **程序化峡谷地形 ★** | 程序化地形生成、侵蚀模拟、顶点着色器位移、岩层纹理 |
| [236](./236-holographic-shader/index.html) | **全息着色器 ★** | 扫描线着色、菲涅尔发光、透明折射、RGB色散、全息干扰图纹 |

---

## 附录：基础示例集（examples/）

| 文件 | 内容 |
|------|------|
| [01-basic-scene.html](./examples/01-basic-scene.html) | 基础场景、立方体、轨道控制、Bloom后期 |
| [02-lighting.html](./examples/02-lighting.html) | 环境光/平行光/点光/聚光灯、lil-gui控制 |
| [03-materials.html](./examples/03-materials.html) | Standard/Phong/Physical/Toon材质对比 |
| [04-particle-system.html](./examples/04-particle-system.html) | Shader粒子系统、15000粒子、流动动画 |
| [05-physics-animation.html](./examples/05-physics-animation.html) | 弹簧物理、Verlet积分、碰撞边界 |
| [06-post-processing.html](./examples/06-post-processing.html) | Bloom/Film/Bokeh后期处理切换 |
| [07-3d-text.html](./examples/07-3d-text.html) | TextGeometry 3D文字、金属反射材质 |
| [08-raycasting.html](./examples/08-raycasting.html) | 射线检测、悬停高亮、点击脉冲效果 |
| [animation.html](./examples/animation.html) | 骨骼动画混合、关键帧插值 |

## 三十一、高级视觉与物理（237~352）

| # | 章节 | 技术点 |
|---|------|-------|
| [237](./237-skeletal-animation-blend/index.html) | **骨骼动画混合 ★** | 骨骼动画、动画混合、关键帧插值、IK/FK切换 |
| [238](./238-volumetric-smoke/index.html) | **体积烟雾渲染 ★** | GPU烟雾模拟、体积渲染、粒子系统、光线步进 |
| [239](./239-galaxy-merger/index.html) | **星系碰撞合并 ★** | N-body模拟、引力交互、星系碰撞、粒子动力学 |
| [240](./240-spatial-hash-grid/index.html) | **空间哈希网格 ★** | 空间分割算法、网格单元着色、InstancedMesh、实时碰撞检测 |
| [241](./240-quantum-circuit/index.html) | **量子电路可视化 ★** | 量子门电路、量子比特可视化、量子计算 |
| [242](./242-voxel-maze-generator/index.html) | **体素迷宫生成器 ★** | 递归回溯、Prim、Kruskal算法、InstancedMesh渲染 |
| [243](./240-3d-histogram/index.html) | **3D数据柱图可视化 ★** | 3D柱状图、交互式数据可视化、实时更新 |
| [244](./244-procedural-planet-erosion/index.html) | **程序化行星侵蚀 ★** | 水力侵蚀模拟、FBM地形、顶点颜色、大气辉光 |
| [245](./240-isosurface/index.html) | **等值面可视化 ★** | Marching Cubes算法、三维标量场、表面重建、隐式曲面 |
| [246](./243-skybox-procedural/index.html) | **程序化天空盒 ★** | 大气散射、Rayleigh/Mie散射、FBM云朵着色、Three.js Sky |
| [247](./240-spatial-hash/index.html) | **空间哈希表 ★** | 空间哈希表可视化、O(1)查找、点击高亮、时间复杂度对比 |
| [248](./248-fluid-shader-ink/index.html) | **墨水扩散流体 ★** | Navier-Stokes GPU流体、ping-pong FBO、墨水染料、鼠标拖拽注入 |
| [249](./240-fluid-sim/index.html) | **GPU流体模拟 ★** | Navier-Stokes GPU求解、涡度约束、压力投影、ping-pong FBO、鼠标染料注入 |
| [250](./240-spline-interpolation/index.html) | **样条插值动画 ★** | CatmullRom插值、路径动画、摄像机运动、粒子轨迹 |
| [250](./250-audio-dsp-equalizer/index.html) | **音频DSP均衡器 ★** | 频谱可视化、音频DSP、实时均衡、FFT音频处理 |
| [251](./251-particle-sandstorm/index.html) | **粒子沙尘暴 ★** | GPU粒子风暴、粒子扩散、摩擦力场、沙漠效果 |
| [253](./253-physics-rigid-stack/index.html) | **刚体堆叠物理 ★** | cannon-es物理引擎、刚体堆叠、碰撞检测、堆塔物理 |
| [254](./254-geographic-heatmap/index.html) | **地理热力图 ★** | 地理数据可视化、热力图叠加、GIS数据映射 |
| [255](./255-molecular-dynamics/index.html) | **分子动力学 ★** | 原子弹簧系统、Verlet积分、Lennard-Jones势、UnrealBloom发光 |
| [256](./256-generative-art-forest/index.html) | **生成式艺术森林 ★** | L-system植物生长、程序化森林、分形几何 |
| [257](./257-performance-gpu-batching/index.html) | **GPU批量渲染 ★** | InstancedMesh批量渲染、Draw Call优化、GPU实例化 |
| [260](./260-particle-storm/index.html) | **粒子风暴 ★** | 湍流粒子场、GPU实例化、噪声速度场、鼠标扰动 |
| [261](./261-voronoi-shattering/index.html) | **Voronoi破碎效果 ★** | Voronoi碎片、爆炸物理模拟、Verlet积分、碰撞检测、火花粒子 |
| [262](./262-soft-body-water/index.html) | **软体水球模拟 ★** | 软体弹簧系统、浮力模拟、透明材质、水面着色器 |
| [263](./263-soft-body-cube/index.html) | **软体方块模拟 ★** | 软体物理、弹簧质点系统、形变着色器、弹性碰撞 |
| [266](./266-neural-gas/index.html) | **神经气算法 ★** | 神经气聚类、自组织映射、拓扑保持、竞争学习 |
| [267](./267-portal-sphere/index.html) | **传送门球体 ★** | 传送门特效、空间扭曲着色器、能量漩涡 |
| [268](./268-terrain-hydraulic-erosion/index.html) | **地形水力侵蚀 ★** | 水力侵蚀模拟、地形生成、顶点击穿、冲积扇 |
| [269](./269-wave-surface/index.html) | **波浪表面模拟 ★** | Gerstner波、海浪模拟、水面交互、水花粒子 |
| [270](./270-voxel-painter/index.html) | **体素画笔 ★** | 32³体素编辑、InstancedMesh、JSON导出、16色彩色板 |
| [271](./271-particle-sandbox/index.html) | **粒子沙盒 ★** | 粒子物珄编辑器、GPU粒子、交互控制、参数实时调节 |
| [272](./272-wave-particle/index.html) | **波动粒子系统 ★** | 波动方程、粒子同步振荡、群落行为、干涉图样 |
| [274](./274-fourier-series/index.html) | **傅里叶级数可视化 ★** | 傅里叶级数、频域分解、正弦波叠加、圆频运动 |
| [275](./275-mesh-fluid/index.html) | **网格流体模拟 ★** | 欧拉网格流体、Navier-Stokes、表面张力、网格变形 |
| [276](./276-koch-snowflake/index.html) | **科赫雪花分形 ★** | Koch雪花算法、分形几何、迭代细分、LineSegments顶点颜色 |
| [277](./277-kerning-glyph/index.html) | **字距调整可视化 ★** | 字体字距调整、TextGeometry、字间间距可视化、排版微调 |
| [278](./278-spring-lattice/index.html) | **弹簧晶格振子 ★** | 弹簧晶格物理、耦合振子、波传播、驻波模拟 |
| [273](./273-spherical-harmonics/index.html) | **球谐函数可视化 ★** | 球谐函数Y_lm、缔合Legendre多项式、量子数(l,m)、 lobe可视化 |
| [279](./279-particle-sph/index.html) | **粒子SPH流体 ★** | SPH光滑粒子流体、粒子间作用力、密度计算、 Navier-Stokes |
| [280](./280-webxr-grab/index.html) | **WebXR抓取交互 ★** | WebXR手势抓取、VR控制器、沉浸式3D交互 |
| [281](./281-procedural-clouds-volumetric/index.html) | **程序化体积云 ★** | 体积云渲染、光线步进、散射模拟、FBM噪声 |
| [282](./282-shader-water-caustic/index.html) | **焦散水面着色器 ★** | 实时焦散着色器、光线折射、水面波纹、水下光斑 |
| [283](./283-particle-constellation/index.html) | **粒子星座图 ★** | 粒子连线星座、3D星空、视差效果、星座连线 |
| [284](./284-sdf-raymarcher-advanced/index.html) | **高级SDF光线步进 ★** | 高级SDF渲染、smin/smax融合、软阴影、AO、三种预设场景 |
| [285](./285-procedural-terrain-erosion/index.html) | **程序化地形侵蚀 ★** | 地形生成、河流侵蚀模拟、沉积物传输、热侵蚀 |
| [286](./286-audio-visualizer-reactive/index.html) | **音频可视化反应 ★** | 音频频谱反应、实时FFT、粒子色彩响应、节拍检测 |
| [287](./287-sdf-boolean/index.html) | **SDF布尔运算 ★** | SDF联合/相减/相交、smooth blend、CSG几何 |
| [288](./288-gpu-ray-trace/index.html) | **GPU光线追踪 ★** | CubeCamera实时反射、菲涅尔反射、玻璃折射、 UnrealBloom |
| [289](./289-procedural-lava/index.html) | **程序化熔岩流 ★** | GPU粒子熔岩、温度着色、热力扭曲后处理、 InstancedMesh |
| [290](./290-interactive-water-fountain/index.html) | **交互水舞喷泉 ★** | Verlet粒子物理、音频反应、焦散光斑、MeshPhysicalMaterial水滴 |
| [291](./291-holographic-audio/index.html) | **全息音频可视化 ★** | 音频全息投影、波形渲染、三维频谱 |
| [292](./292-procedural-bonsai/index.html) | **程序化盆景树 ★** | L-system盆景、程序化植物、修剪模拟 |
| [293](./293-skeletal-rig/index.html) | **骨骼绑定系统 ★** | 骨骼动画、IK/FK、蒙皮权重、关键帧 |
| [294](./294-world-painter/index.html) | **世界画笔编辑器 ★** | 3D地形编辑、笔刷系统、实时渲染 |
| [295](./295-quantum-wave-function/index.html) | **量子波函数 ★** | 量子力学波函数、概率密度、3D可视化 |
| [296](./296-diffraction-grating/index.html) | **衍射光栅 ★** | 光栅衍射、光波干涉、光谱分解 |
| [297](./297-particle-beam/index.html) | **粒子束流 ★** | 高能粒子束、束流物理、光线追踪 |
| [298](./298-gravitational-lensing/index.html) | **引力透镜 ★** | 广义相对论、引力透镜、光线偏折 |
| [303](./303-gpu-particle-storm/index.html) | **GPU粒子风暴 ★** | 20万粒子、FBM湍流、UnrealBloom、鼠标力场 |
| [304](./304-webxr-hand-tracking/index.html) | **WebXR手势追踪 ★** | WebXR手势追踪、骨骼网格、VR交互 |
| [305](./305-procedural-terrain-biomes/index.html) | **程序化地形生物群落 ★** | 地形生物群落、气候带、程序化生态 |
| [306](./306-3d-graph-visualization/index.html) | **3D图形可视化 ★** | 3D图表、图形理论、网络可视化 |
| [307](./307-sdf-raymarching-scene/index.html) | **SDF光线步进场景 ★** | SDF场景构建、光线步进、距离场渲染 |
| [308](./308-soft-body-cloth/index.html) | **软体布料模拟 ★** | 布料物理、弹簧质点、碰撞检测 |
| [309](./309-particle-beam/index.html) | **粒子束流 ★** | 高能粒子束、CatmullRom曲线、UnrealBloom、鼠标点击粒子爆发 |
| [310](./310-gravitational-lensing/index.html) | **引力透镜 ★** | 黑洞透镜、吸积盘、爱因斯坦环、相对论喷流 |
| [311](./311-abel-inversion/index.html) | **Abel逆变换 ★** | Abel反演、轴对称可视化、等离子体诊断 |
| [312](./312-holographic-interference/index.html) | **全息干涉图样 ★** | 全息干涉、衍射光栅、光学干涉 |
| [313](./247-snowflake-crystal-generator/index.html) | **雪花晶体生成器 ★** | Koch雪花晶体、六重对称、递归细分、UnrealBloom发光、点击生成 |
| [259](./259-voxel-carving-terrain/index.html) | **体素地形雕刻 ★** | 32³体素编辑、InstancedMesh、噪声地形生成、左右键放/删体素 |
| [258](./258-sound-reactive-particles/index.html) | **音频反应粒子 ★** | FFT频谱驱动粒子、低/中/高频分层响应、AdditiveBlending、UnrealBloom |
| [314](./246-spherical-mesh-deformation/index.html) | **球面网格变形 ★** | 球谐函数Y_lm、Rodrigues公式、21个模式滑块、网格变形动画 |
| [315](./245-surface-tension-fluid/index.html) | **表面张力流体 ★** | Metaballs融合、smin平滑联合、表面张力物理、鼠标拖拽、Fresnel |
| [316](./249-mesh-wind-field/index.html) | **3D风场可视化 ★** | Simplex噪声风场、InstancedMesh箭头、点击阵风、速度颜色编码 |
| [321](./321-plasma-ball/index.html) | **等离子球 ★** | 等离子球闪电、电弧模拟、鼠标交互、UnrealBloom |
| [322](./322-soap-bubble/index.html) | **肥皂泡模拟 ★** | 薄膜干涉、彩虹色、MeshPhysicalMaterial、透明材质 |
| [323](./323-particle-sandpile/index.html) | **沙堆粒子模拟 ★** | 自组织临界、沙堆模型、粒子堆积、BTW模型 |
| [324](./324-knot-torus/index.html) | **结环面几何 ★** | 打结环面、拓扑结、三维曲线可视化 |
| [325](./325-wave-pendulum/index.html) | **波动摆模拟 ★** | 耦合摆波动、拍频现象、混沌摆 |
| [326](./326-shader-confetti/index.html) | **着色器彩屑 ★** | GLSL彩屑动画、粒子洒落、彩虹配色 |
| [327](./327-rorschach-inkblot/index.html) | **罗夏墨迹 ★** | 对称墨迹生成、随机图形、心理学投影 |
| [328](./328-mobius-strip/index.html) | **莫比乌斯环 ★** | 莫比乌斯带、非定向曲面、拓扑学 |
| [329](./329-spherical-harmonics-lighting/index.html) | **球谐光照 ★** | 球谐函数光照、PRT光照传输、环境光照 |
| [331](./331-particle-sandglider/index.html) | **粒子滑翔模拟 ★** | 粒子地形滑翔、SPH交互、粒子地形交互 |
| [332](./332-spline-railroad/index.html) | **程序化铁路轨道 ★** | CatmullRomCurve3铁轨生成、火车动画、Frenet帧 |
| [333](./333-voxel-maze-generator/index.html) | **体素迷宫生成器 ★** | 递归回溯迷宫、InstancedMesh渲染 |
| [334](./334-snowflake-generator/index.html) | **雪花生成器 ★** | 六重对称分形、Koch雪花 |
| [335](./335-fluid-shader-ink/index.html) | **着色器墨水 ★** | GPU墨水扩散、Navier-Stokes流体、ping-pong FBO |
| [336](./336-webgpu-renderer/index.html) | **WebGPU渲染器 ★** | WebGPU API、下一代Web图形、ComputeShader |
| [337](./337-procedural-architecture/index.html) | **程序化建筑学 ★** | 建筑程序生成、Algorithmic AIA、结构优化 |
| [338](./338-soft-body-physics/index.html) | **软体物理模拟 ★** | 软体物理、弹簧系统、形变动画 |
| [339](./339-audio-reactive-shader/index.html) | **音频反应着色器 ★** | 音频着色器、FFT频谱、实时图形渲染 |
| [340](./340-audio-dsp-equalizer/index.html) | **音频DSP均衡器 ★** | FFT频谱可视化、3D音频频谱、频率响应 |
| [341](./341-plasma-ball/index.html) | **等离子球 ★** | 等离子球闪电、电弧模拟、鼠标交互、UnrealBloom |
| [342](./342-soap-bubble/index.html) | **肥皂泡模拟 ★** | 薄膜干涉、彩虹色、MeshPhysicalMaterial |
| [343](./343-particle-sandpile/index.html) | **沙堆粒子模拟 ★** | 自组织临界、沙堆BTW模型、粒子堆积 |
| [344](./344-knot-torus/index.html) | **结环面几何 ★** | TorusKnotGeometry、p/q比率、拓扑结、wireframe |
| [345](./345-wave-pendulum/index.html) | **波动摆模拟 ★** | 耦合摆、拍频现象、混沌物理 |
| [346](./346-shader-confetti/index.html) | **着色器彩屑 ★** | GLSL彩屑、粒子洒落、彩虹配色 |
| [347](./347-rorschach-inkblot/index.html) | **罗夏墨迹 ★** | 对称墨迹、随机图形、心理投影 |
| [348](./348-audio-visualizer-3d/index.html) | **3D音频频谱可视化 ★** | Web Audio API、FFT驱动3D频谱柱、环形布局、音频文件加载 |
| [349](./349-procedural-terrain-biomes/index.html) | **程序化地形生物群系 ★** | FBM噪声地形、生物群落生成、气候带模拟 |
| [350](./350-3d-graph-visualization/index.html) | **3D图形可视化 ★** | 力导向图布局、Verlet物理、节点-边可视化、CSS2DRenderer标签 |
| [351](./351-sdf-raymarching-scene/index.html) | **SDF光线步进场景 ★** | SDF场景构建、光线步进、距离场渲染 |
| [352](./352-soft-body-cloth/index.html) | **软体布料模拟 ★** | 布料物理、弹簧质点、碰撞检测 |
| [353](./353-wind-erosion-terrain/index.html) | **风力侵蚀地形 ★** | FBM噪声地形、风力侵蚀模拟、顶点着色器位移、沙粒粒子漂流、暖色沙漠 |
| [354](./354-particle-settling/index.html) | **粒子沉降模拟 ★** | GPU InstancedMesh引力沉降、安息角堆积、点击倾倒、InstancedMesh |
| [356](./356-kinematic-chain/index.html) | **机械连杆运动链 ★** | 正逆运动学、多段连杆、旋转关节约束、点击控制 |

## 三十二、新示例（353~360）

| # | 章节 | 技术点 |
|---|------|-------|
| [353](./353-wind-erosion-terrain/index.html) | **风力侵蚀地形 ★** | FBM噪声地形、风力侵蚀模拟、沙粒粒子漂流、点击阵风 |
| [354](./354-particle-settling/index.html) | **粒子沉降模拟 ★** | GPU InstancedMesh引力沉降、安息角堆积、点击倾倒、碰撞物理 |
| [357](./357-reaction-diffusion-turing/index.html) | **反应扩散图灵斑图 ★** | Gray-Scott反应扩散、GPU FBO迭代、图灵生物图案、点击注入催化剂 |
| [358](./358-abel-inversion/index.html) | **Abel逆变换可视化 ★** | 轴对称投影、Abel反演重建、3D密度场可视化、等离子体诊断 |
| [359](./359-electromagnetic-wave/index.html) | **电磁波传播可视化 ★** | Maxwell平面波、偏振态可视化、E/B场箭头、线/圆/椭圆偏振切换 |
| [360](./360-voxel-extrusion-font/index.html) | **体素字体挤压 ★** | InstancedMesh体素动画、入场逐字弹出、赛博朋克霓虹风格 |

## 附录：全部示例索引
- **dendritic-crystal-growth** — [3041](./3041-dendritic-crystal-growth/index.html)
- **karman-vortex-street-fluid-dynamics** — [3816](./3816-karman-vortex-street-fluid-dynamics/index.html)
- **soap-film-minimal-surface-tension** — [3817](./3817-soap-film-minimal-surface-tension/index.html)
- **crowd-evacuation-steering-behaviors** — [3818](./3818-crowd-evacuation-steering-behaviors/index.html)
- **spinodal-decomposition-phase-field** — [3819](./3819-spinodal-decomposition-phase-field/index.html)
- **klein-bottle-topological-surface** — [3820](./3820-klein-bottle-topological-surface/index.html)

- **gyroid** — [3811](./3811-gyroid/index.html)
- **string-vibration** — [3812](./3812-string-vibration/index.html)
- **glass-fracture** — [3814](./3814-glass-fracture/index.html)
- **blackhole-lensing** — [3815](./3815-blackhole-lensing/index.html)

- **quantum-tunneling-wave-packet** — [3805](./3805-quantum-tunneling-wave-packet/index.html)
- **stochastic-resonance-physical-signal** — [3806](./3806-stochastic-resonance-physical-signal/index.html)
- **hebbian-associative-memory-network** — [3807](./3807-hebbian-associative-memory-network/index.html)
- **ricci-flow-geometry-uniformization** — [3808](./3808-ricci-flow-geometry-uniformization/index.html)
- **hailstone-collatz-3d-attractor** — [3809](./3809-hailstone-collatz-3d-attractor/index.html)
- **tesla-coil-discharge-plasma-art** — [3810](./3810-tesla-coil-discharge-plasma-art/index.html)

- **planetary-gearbox-sim** — [3799](./3799-planetary-gearbox-sim/index.html)
- **infinity-mirror-room** — [3800](./3800-infinity-mirror-room/index.html)
- **npr-hatching-shader** — [3801](./3801-npr-hatching-shader/index.html)
- **kessler-syndrome-sim** — [3802](./3802-kessler-syndrome-sim/index.html)
- **caustic-water-pool-optics** — [3803](./3803-caustic-water-pool-optics/index.html)
- **subsurface-scattering-gemstone** — [3804](./3804-subsurface-scattering-gemstone/index.html)

- **dijkstra-shortest-path-3d** — [3786](./3786-dijkstra-shortest-path-3d/index.html)
- **phase-space-attractor** — [3787](./3787-phase-space-attractor/index.html)
- **syntax-tree-visualizer** — [3788](./3788-syntax-tree-visualizer/index.html)
- **bayesian-network-inference** — [3789](./3789-bayesian-network-inference/index.html)
- **persistent-homology-tda** — [3790](./3790-persistent-homology-tda/index.html)
- **geographic-network-flow** — [3791](./3791-geographic-network-flow/index.html)

- **fluid-simulation** — [3780](./3780-fluid-simulation/index.html)
- **procedural-terrain** — [3782](./3782-procedural-terrain/index.html)
- **particle-galaxy** — [3783](./3783-particle-galaxy/index.html)
- **morphing-geometry** — [3784](./3784-morphing-geometry/index.html)
- **bloom-postprocessing** — [3785](./3785-bloom-postprocessing/index.html)

- **reinforcement-learning-q-learning-3d** — [3772](./3772-reinforcement-learning-q-learning-3d/index.html)
- **materials-science-alloy-solidification** — [3773](./3773-materials-science-alloy-solidification/index.html)
- **network-science-cascading-failure** — [3774](./3774-network-science-cascading-failure/index.html)
- **karplus-strong-synthesis-3d** — [3775](./3775-karplus-strong-synthesis-3d/index.html)
- **computer-vision-slam-3d** — [3776](./3776-computer-vision-slam-3d/index.html)
- **fluid-mechanics-boundary-layer** — [3777](./3777-fluid-mechanics-boundary-layer/index.html)
- **geophysics-seismic-3d** — [3778](./3778-geophysics-seismic-3d/index.html)

- **dendrimer-branched-polymer-simulation** — [3765](./3765-dendrimer-branched-polymer-simulation/index.html)
- **photonic-crystal-fiber-optics-bandgap** — [3766](./3766-photonic-crystal-fiber-optics-bandgap/index.html)
- **synaptic-plasticity-spike-timing-dependent** — [3767](./3767-synaptic-plasticity-spike-timing-dependent/index.html)
- **bénard-convection-rayleigh-bénard-cells** — [3768](./3768-bénard-convection-rayleigh-bénard-cells/index.html)
- **crack-bridging-grain-boundary-material** — [3769](./3769-crack-bridging-grain-boundary-material/index.html)
- **dendrogram-hierarchical-clustering-3d** — [3770](./3770-dendrogram-hierarchical-clustering-3d/index.html)
- **belousov-zhabotinsky-reaction-3d** — [3771](./3771-belousov-zhabotinsky-reaction-3d/index.html)

- **virus-particle-diffusion-3d** — [3759](./3759-virus-particle-diffusion-3d/index.html)
- **hurricane-eye-wall-simulation** — [3760](./3760-hurricane-eye-wall-simulation/index.html)
- **double-gyre-ocean-circulation** — [3761](./3761-double-gyre-ocean-circulation/index.html)
- **ifs-fractal-explorer** — [3762](./3762-ifs-fractal-explorer/index.html)
- **turbulent-kolmogorov-flow** — [3763](./3763-turbulent-kolmogorov-flow/index.html)
- **traffic-intersection-signal-sync** — [3764](./3764-traffic-intersection-signal-sync/index.html)

- **quantum-error-correction-surface-code** — [3752](./3752-quantum-error-correction-surface-code/index.html)
- **molecular-docking-shape-complementarity** — [3753](./3753-molecular-docking-shape-complementarity/index.html)
- **fluid-structure-vortex-induced-vibration** — [3754](./3754-fluid-structure-vortex-induced-vibration/index.html)
- **piv-particle-image-velocimetry** — [3755](./3755-piv-particle-image-velocimetry/index.html)
- **soft-robotics-pneumatic-actuator** — [3756](./3756-soft-robotics-pneumatic-actuator/index.html)
- **blockchain-dag-transaction-graph** — [3757](./3757-blockchain-dag-transaction-graph/index.html)
- **stress-optics-birefringence-simulation** — [3758](./3758-stress-optics-birefringence-simulation/index.html)

- **cnc-milling-simulation** — [3738](./3738-cnc-milling-simulation/index.html)
- **satellite-attitude-dynamics** — [3739](./3739-satellite-attitude-dynamics/index.html)
- **blood-flow-vessel-sim** — [3740](./3740-blood-flow-vessel-sim/index.html)
- **soil-triaxial-test** — [3742](./3742-soil-triaxial-test/index.html)
- **gpu-rigid-body-chaos** — [3743](./3743-gpu-rigid-body-chaos/index.html)
- **huygens-principle-wave-interference** — [3744](./3744-huygens-principle-wave-interference/index.html)
- **diffusion-limited-aggregation-dla** — [3745](./3745-diffusion-limited-aggregation-dla/index.html)
- **shoaling-wave-breaking-physics** — [3746](./3746-shoaling-wave-breaking-physics/index.html)
- **game-of-life-cellular-automata** — [3747](./3747-game-of-life-cellular-automata/index.html)
- **chaotic-double-pendulum-sim** — [3748](./3748-chaotic-double-pendulum-sim/index.html)
- **urban-traffic-flow-cellular-automaton** — [3749](./3749-urban-traffic-flow-cellular-automaton/index.html)
- **caustic-light-focusing-simulation** — [3750](./3750-caustic-light-focusing-simulation/index.html)
- **n-body-gravitational-simulation** — [3751](./3751-n-body-gravitational-simulation/index.html)

- **mhd-ferrofluid-surface** — [3732](./3732-mhd-ferrofluid-surface/index.html)
- **phase-field-crystal-3d** — [3733](./3733-phase-field-crystal-3d/index.html)
- **electrohydrodynamics-dielectrophoresis** — [3734](./3734-electrohydrodynamics-dielectrophoresis/index.html)
- **voronoi-brittle-fracture** — [3735](./3735-voronoi-brittle-fracture/index.html)
- **active-matter-vicsek** — [3736](./3736-active-matter-vicsek/index.html)
- **pendulum-wave-vernier** — [3737](./3737-pendulum-wave-vernier/index.html)

- **cloth-softbody** — [3725](./3725-cloth-softbody/index.html)
- **fluid-particle** — [3727](./3727-fluid-particle/index.html)
- **fluid-dynamics** — [3728](./3728-fluid-dynamics/index.html)
- **geometry-morphing** — [3730](./3730-geometry-morphing/index.html)
- **particle-attraction** — [3731](./3731-particle-attraction/index.html)

- **pool-billiards-3d** — [3711](./3711-pool-billiards-3d/index.html)
- **ant-colony-pheromone** — [3712](./3712-ant-colony-pheromone/index.html)
- **particle-in-cell-plasma** — [3713](./3713-particle-in-cell-plasma/index.html)
- **golf-physics-game** — [3714](./3714-golf-physics-game/index.html)
- **minesweeper-3d** — [3715](./3715-minesweeper-3d/index.html)
- **voxel-carving-sculpture** — [3716](./3716-voxel-carving-sculpture/index.html)
- **light-field-camera** — [3717](./3717-light-field-camera/index.html)
- **bidirectional-path-tracer** — [3718](./3718-bidirectional-path-tracer/index.html)
- **brillouin-scattering** — [3719](./3719-brillouin-scattering/index.html)
- **acoustic-streaming** — [3720](./3720-acoustic-streaming/index.html)
- **plenoptic-refocus** — [3721](./3721-plenoptic-refocus/index.html)
- **spectral-rainbow-dispersion** — [3722](./3722-spectral-rainbow-dispersion/index.html)
- **fourier-ptychography** — [3723](./3723-fourier-ptychography/index.html)

- **enzyme-kinetics** — [3696](./3696-enzyme-kinetics/index.html)
- **electrophysiology-neuron** — [3697](./3697-electrophysiology-neuron/index.html)
- **seismic-wave-propagation** — [3698](./3698-seismic-wave-propagation/index.html)
- **stellar-formation-hii-region** — [3699](./3699-stellar-formation-hii-region/index.html)
- **glacier-ice-flow** — [3700](./3700-glacier-ice-flow/index.html)
- **ocean-thermal-circulation** — [3701](./3701-ocean-thermal-circulation/index.html)
- **cloth-drape-physics-sim** — [3702](./3702-cloth-drape-physics-sim/index.html)
- **lattice-boltzmann-fluid** — [3703](./3703-lattice-boltzmann-fluid/index.html)
- **recursive-menger-sponge** — [3704](./3704-recursive-menger-sponge/index.html)
- **shader-graph-node-editor** — [3705](./3705-shader-graph-node-editor/index.html)
- **music-reactive-particles** — [3706](./3706-music-reactive-particles/index.html)
- **sandstorm-particle-macro** — [3707](./3707-sandstorm-particle-macro/index.html)
- **voxel-destruction-physics** — [3708](./3708-voxel-destruction-physics/index.html)
- **fluid-karman-vortex-street** — [3709](./3709-fluid-karman-vortex-street/index.html)
- **spring-mass-pendulum-chain** — [3710](./3710-spring-mass-pendulum-chain/index.html)

- **quantum-circuit-visualizer-3d** — [3689](./3689-quantum-circuit-visualizer-3d/index.html)
- **flag-flutter-fluid-structure-sim** — [3690](./3690-flag-flutter-fluid-structure-sim/index.html)
- **crystal-precipitation-nucleation-growth** — [3691](./3691-crystal-precipitation-nucleation-growth/index.html)
- **procedural-terrain-hydraulic-erosion** — [3692](./3692-procedural-terrain-hydraulic-erosion/index.html)
- **mri-volumetric-medical-rendering** — [3693](./3693-mri-volumetric-medical-rendering/index.html)
- **swarm-robotics-coordination-sim** — [3694](./3694-swarm-robotics-coordination-sim/index.html)
- **turing-pattern-3d-reaction-diffusion** — [3695](./3695-turing-pattern-3d-reaction-diffusion/index.html)

- **neuromorphic-spiking-neuron** — [3677](./3677-neuromorphic-spiking-neuron/index.html)
- **quantum-zeno-effect** — [3678](./3678-quantum-zeno-effect/index.html)
- **casimir-vacuum-fluctuation** — [3679](./3679-casimir-vacuum-fluctuation/index.html)
- **topological-photonics-edge-state** — [3680](./3680-topological-photonics-edge-state/index.html)
- **neural-network-saliency-cam** — [3681](./3681-neural-network-saliency-cam/index.html)
- **holographic-optical-tweezer** — [3682](./3682-holographic-optical-tweezer/index.html)
- **kuramoto-sync** — [3683](./3683-kuramoto-sync/index.html)
- **hamiltonian-mechanics** — [3684](./3684-hamiltonian-mechanics/index.html)
- **particle-transport-monte-carlo** — [3685](./3685-particle-transport-monte-carlo/index.html)
- **stefan-problem-phase-change** — [3686](./3686-stefan-problem-phase-change/index.html)
- **spectral-graph-partitioning** — [3687](./3687-spectral-graph-partitioning/index.html)
- **peridynamics-fracture** — [3688](./3688-peridynamics-fracture/index.html)

- **climate-data-stream** — [3670](./3670-climate-data-stream/index.html)
- **autonomous-drone-swarm** — [3671](./3671-autonomous-drone-swarm/index.html)
- **medical-ultrasound-simulation** — [3672](./3672-medical-ultrasound-simulation/index.html)
- **solar-panel-efficiency** — [3673](./3673-solar-panel-efficiency/index.html)
- **optical-fiber-telecom** — [3674](./3674-optical-fiber-telecom/index.html)
- **holographic-3d-display** — [3675](./3675-holographic-3d-display/index.html)
- **fermentation-biology-sim** — [3676](./3676-fermentation-biology-sim/index.html)

- **crystal-lattice-vibration-phonon** — [3662](./3662-crystal-lattice-vibration-phonon/index.html)
- **tessellation-escher-impossible** — [3663](./3663-tessellation-escher-impossible/index.html)
- **stellar-atmosphere-spectrum-simulation** — [3664](./3664-stellar-atmosphere-spectrum-simulation/index.html)
- **fracture-ice-shelf-calving-glacial** — [3665](./3665-fracture-ice-shelf-calving-glacial/index.html)
- **morphogen-concentration-gradient-pattern** — [3666](./3666-morphogen-concentration-gradient-pattern/index.html)
- **quantum-walk-interference-visualizer** — [3667](./3667-quantum-walk-interference-visualizer/index.html)
- **vortex-ring-pair-dynamics-simulation** — [3668](./3668-vortex-ring-pair-dynamics-simulation/index.html)

- **holographic-optical-element** — [3657](./3657-holographic-optical-element/index.html)
- **quantum-error-correction** — [3658](./3658-quantum-error-correction/index.html)
- **point-cloud-heritage-scan** — [3659](./3659-point-cloud-heritage-scan/index.html)
- **architectural-acoustics** — [3660](./3660-architectural-acoustics/index.html)
- **tropical-geometry** — [3661](./3661-tropical-geometry/index.html)

- **npr-crosshatch-shader** — [3647](./3647-npr-crosshatch-shader/index.html)
- **voxel-chunk-terrain-engine** — [3648](./3648-voxel-chunk-terrain-engine/index.html)
- **softbody-volume-pressure-sim** — [3649](./3649-softbody-volume-pressure-sim/index.html)
- **sdf-csg-boolean-ops** — [3650](./3650-sdf-csg-boolean-ops/index.html)
- **hair-strand-follicle-sim** — [3651](./3651-hair-strand-follicle-sim/index.html)
- **topology-simp-optimization** — [3652](./3652-topology-simp-optimization/index.html)
- **morphogenetic-tissue-growth** — [3653](./3653-morphogenetic-tissue-growth/index.html)
- **fluid-structure-coupled-sim** — [3654](./3654-fluid-structure-coupled-sim/index.html)

- **vortex-shedding-fluid-turbulence** — [3643](./3643-vortex-shedding-fluid-turbulence/index.html)
- **plasma-ball-electrode-discharge** — [3644](./3644-plasma-ball-electrode-discharge/index.html)
- **sandpile-avalanche-cellular-automata** — [3645](./3645-sandpile-avalanche-cellular-automata/index.html)
- **lissajous-3d-curve-visualizer** — [3646](./3646-lissajous-3d-curve-visualizer/index.html)

- **sph-fluid-simulation** — [3638](./3638-sph-fluid-simulation/index.html)
- **slime-mold-physarum-3d** — [3639](./3639-slime-mold-physarum-3d/index.html)
- **galton-board-bean-machine** — [3640](./3640-galton-board-bean-machine/index.html)
- **marching-cubes-metaballs** — [3641](./3641-marching-cubes-metaballs/index.html)

- **phase-field-dendrite** — [3632](./3632-phase-field-dendrite/index.html)
- **neural-ode-dynamics** — [3633](./3633-neural-ode-dynamics/index.html)
- **genetic-algorithm-3d** — [3634](./3634-genetic-algorithm-3d/index.html)
- **fourier-neural-operator** — [3635](./3635-fourier-neural-operator/index.html)
- **cfd-solver-pressure** — [3636](./3636-cfd-solver-pressure/index.html)

- **reaction-diffusion-turing-patterns** — [3625](./3625-reaction-diffusion-turing-patterns/index.html)
- **procedural-city-generation** — [3626](./3626-procedural-city-generation/index.html)
- **snowflake-vapor-deposition-growth** — [3627](./3627-snowflake-vapor-deposition-growth/index.html)
- **double-pendulum-chaos** — [3628](./3628-double-pendulum-chaos/index.html)
- **minimal-surface-soap-film** — [3629](./3629-minimal-surface-soap-film/index.html)
- **fracture-crack-propagation** — [3630](./3630-fracture-crack-propagation/index.html)
- **granular-hourglass-physics** — [3631](./3631-granular-hourglass-physics/index.html)

- **bioluminescent-deep-sea-ecosystem** — [3618](./3618-bioluminescent-deep-sea-ecosystem/index.html)
- **ferromagnetic-ising-domain-evolution** — [3619](./3619-ferromagnetic-ising-domain-evolution/index.html)
- **parametric-tensegrity-structure-sim** — [3620](./3620-parametric-tensegrity-structure-sim/index.html)
- **quantum-quantum-dot-electron-shell** — [3621](./3621-quantum-quantum-dot-electron-shell/index.html)
- **kohonen-self-organizing-map-3d** — [3622](./3622-kohonen-self-organizing-map-3d/index.html)
- **procedural-gothic-cathedral-architecture** — [3623](./3623-procedural-gothic-cathedral-architecture/index.html)
- **traffic-ring-road-flow-simulation** — [3624](./3624-traffic-ring-road-flow-simulation/index.html)

- **piano-roll-sequencer** — [3608](./3608-piano-roll-sequencer/index.html)
- **epidemic-sir-spatial-spread** — [3609](./3609-epidemic-sir-spatial-spread/index.html)
- **neural-network-graph-viz** — [3610](./3610-neural-network-graph-viz/index.html)
- **soft-body-particle-physics** — [3611](./3611-soft-body-particle-physics/index.html)
- **holographic-volumetric-display** — [3612](./3612-holographic-volumetric-display/index.html)
- **botanical-parametric-phyllotaxis-3d** — [3613](./3613-botanical-parametric-phyllotaxis-3d/index.html)
- **markov-chain-text-genetic-art** — [3614](./3614-markov-chain-text-genetic-art/index.html)
- **kaleidoscope-symmetry-generator** — [3615](./3615-kaleidoscope-symmetry-generator/index.html)
- **topological-insulator-sim** — [3616](./3616-topological-insulator-sim/index.html)
- **pendulum-wave-3d-harmonic** — [3617](./3617-pendulum-wave-3d-harmonic/index.html)

- **particle-life-system** — [3607](./3607-particle-life-system/index.html)

- **brians-brain-cellular-automata** — [3599](./3599-brians-brain-cellular-automata/index.html)
- **hyperbolic-geometry-poincare-disc** — [3600](./3600-hyperbolic-geometry-poincare-disc/index.html)
- **coupled-map-lattice-wave-sim** — [3601](./3601-coupled-map-lattice-wave-sim/index.html)
- **elastic-scattering-particle-collision** — [3602](./3602-elastic-scattering-particle-collision/index.html)
- **3d-pong-game** — [3603](./3603-3d-pong-game/index.html)
- **parametric-curve-surface-gallery** — [3604](./3604-parametric-curve-surface-gallery/index.html)

- **cloth-simulation-physics** — [3593](./3593-cloth-simulation-physics/index.html)
- **sound-wave-3d-propagation** — [3594](./3594-sound-wave-3d-propagation/index.html)
- **boids-flocking-simulation** — [3595](./3595-boids-flocking-simulation/index.html)
- **sand-dune-aeolian-erosion** — [3596](./3596-sand-dune-aeolian-erosion/index.html)
- **tda-persistence-landscape** — [3597](./3597-tda-persistence-landscape/index.html)
- **nebula-volumetric-render** — [3598](./3598-nebula-volumetric-render/index.html)

- **volumetric-fluid** — [3584](./3584-volumetric-fluid/index.html)
- **rayleigh-atmosphere** — [3585](./3585-rayleigh-atmosphere/index.html)
- **dla-crystal-growth** — [3586](./3586-dla-crystal-growth/index.html)
- **3d-graph-network** — [3587](./3587-3d-graph-network/index.html)
- **erosion-simulation** — [3588](./3588-erosion-simulation/index.html)
- **morphogenesis** — [3591](./3591-morphogenesis/index.html)

- **causal-bayesian-network-viz** — [3578](./3578-causal-bayesian-network-viz/index.html)
- **transformer-attention-heads-3d** — [3579](./3579-transformer-attention-heads-3d/index.html)
- **evolutionary-art-genome-selection** — [3580](./3580-evolutionary-art-genome-selection/index.html)
- **sailing-aerodynamics-lift-drag** — [3581](./3581-sailing-aerodynamics-lift-drag/index.html)
- **market-bubble-crash-dynamics** — [3582](./3582-market-bubble-crash-dynamics/index.html)
- **kerf-bending-wood-fabrication** — [3583](./3583-kerf-bending-wood-fabrication/index.html)

- **stellar-nucleosynthesis** — [3571](./3571-stellar-nucleosynthesis/index.html)
- **holographic-interferometry-sim** — [3572](./3572-holographic-interferometry-sim/index.html)
- **dripping-faucet-chaos** — [3573](./3573-dripping-faucet-chaos/index.html)
- **acoustic-levitation-standing-wave** — [3574](./3574-acoustic-levitation-standing-wave/index.html)
- **gyroscopic-precession** — [3575](./3575-gyroscopic-precession/index.html)
- **quasicrystal-growth-simulation** — [3576](./3576-quasicrystal-growth-simulation/index.html)
- **origami-rigid-fold-physics** — [3577](./3577-origami-rigid-fold-physics/index.html)

- **l-system-plant-growth** — [3565](./3565-l-system-plant-growth/index.html)
- **raymarched-sdf-fractal-art** — [3566](./3566-raymarched-sdf-fractal-art/index.html)
- **ambient-occlusion-comparison** — [3567](./3567-ambient-occlusion-comparison/index.html)
- **fractal-noise-erosion-terrain** — [3569](./3569-fractal-noise-erosion-terrain/index.html)
- **gpu-compute-particles-fbo** — [3570](./3570-gpu-compute-particles-fbo/index.html)

- **saffman-taylor-fingering** — [3551](./3551-saffman-taylor-fingering/index.html)
- **spinodal-decomposition-sim** — [3552](./3552-spinodal-decomposition-sim/index.html)
- **langton-ant-cellular** — [3553](./3553-langton-ant-cellular/index.html)
- **phyllotaxis-spiral** — [3554](./3554-phyllotaxis-spiral/index.html)
- **photonic-crystal-bandgap** — [3555](./3555-photonic-crystal-bandgap/index.html)
- **singer-quadrupole-field** — [3556](./3556-singer-quadrupole-field/index.html)
- **hadamard-geodesic-flow** — [3557](./3557-hadamard-geodesic-flow/index.html)
- **dendrogram-hierarchy** — [3558](./3558-dendrogram-hierarchy/index.html)
- **traffic-flow-simulation** — [3559](./3559-traffic-flow-simulation/index.html)
- **crowd-steering-behaviors** — [3560](./3560-crowd-steering-behaviors/index.html)
- **nbody-gravity-orbits** — [3562](./3562-nbody-gravity-orbits/index.html)
- **verlet-physics-playground** — [3563](./3563-verlet-physics-playground/index.html)
- **procedural-organic-sculpture** — [3564](./3564-procedural-organic-sculpture/index.html)

- **量子纠缠可视化** — [3539](./3539-量子纠缠可视化/index.html)
- **音乐可视化** — [3540](./3540-音乐可视化/index.html)
- **气候数据流** — [3541](./3541-气候数据流/index.html)
- **城市建筑生成** — [3542](./3542-城市建筑生成/index.html)
- **粒子物理解算** — [3543](./3543-粒子物理解算/index.html)

- **generative-art-interactive** — [3534](./3534-generative-art-interactive/index.html)
- **parametric-form-finding** — [3536](./3536-parametric-form-finding/index.html)
- **ink-wash-sumi-e** — [3537](./3537-ink-wash-sumi-e/index.html)
- **softbody-jelly-physics** — [3538](./3538-softbody-jelly-physics/index.html)

- **quantum-hall-edge-states** — [3529](./3529-quantum-hall-edge-states/index.html)
- **chladni-plate-modes** — [3530](./3530-chladni-plate-modes/index.html)
- **ferrofluid-surface-spikes** — [3531](./3531-ferrofluid-surface-spikes/index.html)
- **parametric-pendulum-bifurcation** — [3532](./3532-parametric-pendulum-bifurcation/index.html)
- **hele-shaw-fingering** — [3533](./3533-hele-shaw-fingering/index.html)

- **magnetic-field-biotsavart** — [3523](./3523-magnetic-field-biotsavart/index.html)
- **sintering-grain-growth** — [3524](./3524-sintering-grain-growth/index.html)
- **binary-star-orbit** — [3525](./3525-binary-star-orbit/index.html)
- **langevin-dynamics** — [3527](./3527-langevin-dynamics/index.html)
- **rayleigh-inglis-rainbow** — [3528](./3528-rayleigh-inglis-rainbow/index.html)

- **tidal-force-moon-earth-sim** — [3515](./3515-tidal-force-moon-earth-sim/index.html)
- **epigenetic-cell-differentiation** — [3516](./3516-epigenetic-cell-differentiation/index.html)
- **fire-particle-sim** — [3517](./3517-fire-particle-sim/index.html)
- **antikythera-mechanism-ancient** — [3518](./3518-antikythera-mechanism-ancient/index.html)
- **financial-network-risk-sim** — [3519](./3519-financial-network-risk-sim/index.html)
- **autonomous-driving-decision-tree** — [3520](./3520-autonomous-driving-decision-tree/index.html)
- **lattice-boltzmann-3d-fluid** — [3521](./3521-lattice-boltzmann-3d-fluid/index.html)
- **holographic-architecture-sculpture** — [3522](./3522-holographic-architecture-sculpture/index.html)

- **3d-wave-interference** — [3508](./3508-3d-wave-interference/index.html)
- **3d-agent-simulation** — [3510](./3510-3d-agent-simulation/index.html)
- **3d-fractal-terrain** — [3511](./3511-3d-fractal-terrain/index.html)
- **3d-molecular-dynamics** — [3512](./3512-3d-molecular-dynamics/index.html)
- **3d-smoke-fluid** — [3513](./3513-3d-smoke-fluid/index.html)
- **3d-neural-network** — [3514](./3514-3d-neural-network/index.html)

- **ct-slice-reconstruction** — [3501](./3501-ct-slice-reconstruction/index.html)
- **fourier-optics-lens** — [3502](./3502-fourier-optics-lens/index.html)
- **optimal-transport-wasserstein** — [3503](./3503-optimal-transport-wasserstein/index.html)
- **slit-scan-photography** — [3504](./3504-slit-scan-photography/index.html)
- **brillouin-zone-visualization** — [3505](./3505-brillouin-zone-visualization/index.html)
- **kdv-soliton-wave** — [3506](./3506-kdv-soliton-wave/index.html)

- **liquid-crystal-nematic-defects** — [3496](./3496-liquid-crystal-nematic-defects/index.html)
- **visual-cryptography-steganography** — [3497](./3497-visual-cryptography-steganography/index.html)
- **causal-diamond-spacetime-diagram** — [3498](./3498-causal-diamond-spacetime-diagram/index.html)
- **spherical-voronoi-geodesic-cells** — [3499](./3499-spherical-voronoi-geodesic-cells/index.html)
- **bernoulli-fluid-airfoil** — [3500](./3500-bernoulli-fluid-airfoil/index.html)

- **solar-system-kepler-orbits** — [3490](./3490-solar-system-kepler-orbits/index.html)
- **eulerian-fluid-naviers-stokes** — [3491](./3491-eulerian-fluid-naviers-stokes/index.html)
- **wave-function-collapse-dungeon** — [3492](./3492-wave-function-collapse-dungeon/index.html)
- **volumetric-cloud-raymarching** — [3493](./3493-volumetric-cloud-raymarching/index.html)
- **lotka-volterra-predator-prey** — [3494](./3494-lotka-volterra-predator-prey/index.html)
- **hydraulic-erosion-terrain** — [3495](./3495-hydraulic-erosion-terrain/index.html)

- **vortex-filament-reconnection** — [3482](./3482-vortex-filament-reconnection/index.html)
- **splash-droplet-dynamics** — [3483](./3483-splash-droplet-dynamics/index.html)
- **sand-dune-morphodynamics** — [3484](./3484-sand-dune-morphodynamics/index.html)
- **quantum-spin-hall-effect** — [3485](./3485-quantum-spin-hall-effect/index.html)
- **snow-avalanche-granular** — [3486](./3486-snow-avalanche-granular/index.html)
- **viscous-fingering-hele-shaw** — [3487](./3487-viscous-fingering-hele-shaw/index.html)
- **topological-data-analysis-persistent-homology** — [3488](./3488-topological-data-analysis-persistent-homology/index.html)
- **fracture-mechanics-dynamic-crack** — [3489](./3489-fracture-mechanics-dynamic-crack/index.html)

- **procedural-watercolor-shader** — [3477](./3477-procedural-watercolor-shader/index.html)
- **spring-rope-chain-sim** — [3478](./3478-spring-rope-chain-sim/index.html)
- **underwater-acoustic-propagation** — [3478](./3478-underwater-acoustic-propagation/index.html)
- **lidar-pointcloud-semantic** — [3479](./3479-lidar-pointcloud-semantic/index.html)
- **parametric-shoe-draping** — [3480](./3480-parametric-shoe-draping/index.html)
- **real-time-progressive-pathtrace** — [3480](./3480-real-time-progressive-pathtrace/index.html)
- **digital-twin-sensor-floor** — [3481](./3481-digital-twin-sensor-floor/index.html)

- **frustrated-magnetism-skyrmion** — [3471](./3471-frustrated-magnetism-skyrmion/index.html)
- **kuramoto-oscillator-sync** — [3472](./3472-kuramoto-oscillator-sync/index.html)
- **epigenetic-landscape-stem-cell** — [3473](./3473-epigenetic-landscape-stem-cell/index.html)
- **granular-acoustic-standing-wave** — [3474](./3474-granular-acoustic-standing-wave/index.html)
- **syntactic-foam-material** — [3475](./3475-syntactic-foam-material/index.html)
- **dna-helix-oscillator** — [3476](./3476-dna-helix-oscillator/index.html)

- **reaction-diffusion-turing-pattern** — [3459](./3459-reaction-diffusion-turing-pattern/index.html)
- **vortex-shedding-fluid** — [3460](./3460-vortex-shedding-fluid/index.html)
- **schlieren-imaging-fluid** — [3461](./3461-schlieren-imaging-fluid/index.html)
- **leidenfrost-droplet-levitation** — [3462](./3462-leidenfrost-droplet-levitation/index.html)
- **lattice-gas-automaton-traffic** — [3463](./3463-lattice-gas-automaton-traffic/index.html)
- **percolation-cluster-growth** — [3464](./3464-percolation-cluster-growth/index.html)
- **elastic-wave-propagation-beam** — [3465](./3465-elastic-wave-propagation-beam/index.html)
- **karman-vortex-street-3d** — [3466](./3466-karman-vortex-street-3d/index.html)
- **quasicrystal-diffraction** — [3467](./3467-quasicrystal-diffraction/index.html)
- **apollonian-gasket-fractal** — [3468](./3468-apollonian-gasket-fractal/index.html)
- **optical-art-moire-3d** — [3469](./3469-optical-art-moire-3d/index.html)
- **anamorphic-art-3d** — [3470](./3470-anamorphic-art-3d/index.html)

- **voronoi-fracture-concrete** — [3449](./3449-voronoi-fracture-concrete/index.html)
- **fem-stress-analysis** — [3450](./3450-fem-stress-analysis/index.html)
- **sintering-granular** — [3451](./3451-sintering-granular/index.html)
- **procedural-crochet-knit** — [3452](./3452-procedural-crochet-knit/index.html)
- **inverse-kinematics-leg** — [3453](./3453-inverse-kinematics-leg/index.html)
- **voxel-tree-generator** — [3454](./3454-voxel-tree-generator/index.html)
- **real-time-raytracer** — [3455](./3455-real-time-raytracer/index.html)
- **procedural-moss-lichen** — [3456](./3456-procedural-moss-lichen/index.html)
- **cloth-pattern-cutting** — [3457](./3457-cloth-pattern-cutting/index.html)
- **fluid-acoustic-sim** — [3458](./3458-fluid-acoustic-sim/index.html)

- **chaos-double-pendulum** — [3441](./3441-chaos-double-pendulum/index.html)
- **wave-interference-ripple** — [3442](./3442-wave-interference-ripple/index.html)
- **magnetic-field-lines** — [3443](./3443-magnetic-field-lines/index.html)
- **ferrofluid-surface** — [3444](./3444-ferrofluid-surface/index.html)
- **granular-material-sim** — [3445](./3445-granular-material-sim/index.html)
- **combustion-flame-sim** — [3446](./3446-combustion-flame-sim/index.html)

- **light-field-display** — [3435](./3435-light-field-display/index.html)
- **virtual-production-led-volume** — [3436](./3436-virtual-production-led-volume/index.html)
- **neural-style-transfer-3d** — [3437](./3437-neural-style-transfer-3d/index.html)
- **pcb-circuit-3d** — [3438](./3438-pcb-circuit-3d/index.html)
- **satellite-orbit-planner** — [3439](./3439-satellite-orbit-planner/index.html)
- **bokeh-depth-reconstruction** — [3440](./3440-bokeh-depth-reconstruction/index.html)

- **物理摆钟** — [3426](./3426-物理摆钟/index.html)
- **交互式音乐可视化** — [3427](./3427-交互式音乐可视化/index.html)
- **gpu粒子场** — [3428](./3428-gpu粒子场/index.html)
- **织物模拟** — [3429](./3429-织物模拟/index.html)
- **程序化地形** — [3430](./3430-程序化地形/index.html)
- **体积光渲染** — [3431](./3431-体积光渲染/index.html)
- **弹簧链条系统** — [3432](./3432-弹簧链条系统/index.html)
- **全息投影效果** — [3433](./3433-全息投影效果/index.html)
- **透视矫正hud** — [3434](./3434-透视矫正hud/index.html)

- **agent-based-schelling-segregation** — [3419](./3419-agent-based-schelling-segregation/index.html)
- **interactive-physics-lab** — [3420](./3420-interactive-physics-lab/index.html)
- **abstract-expressionism-pollock** — [3421](./3421-abstract-expressionism-pollock/index.html)
- **lattice-gas-automaton-fhp** — [3422](./3422-lattice-gas-automaton-fhp/index.html)
- **boolean-logic-propagation** — [3423](./3423-boolean-logic-propagation/index.html)
- **procedural-calligraphy** — [3424](./3424-procedural-calligraphy/index.html)
- **pcr-gel-electrophoresis** — [3425](./3425-pcr-gel-electrophoresis/index.html)

- **pencil-sketch-npr** — [3413](./3413-pencil-sketch-npr/index.html)
- **point-cloud-kinect** — [3414](./3414-point-cloud-kinect/index.html)
- **robot-arm-kinematics** — [3415](./3415-robot-arm-kinematics/index.html)
- **fractal-flame-shader** — [3416](./3416-fractal-flame-shader/index.html)
- **webxr-teleportation** — [3417](./3417-webxr-teleportation/index.html)
- **scent-olfactory-visual** — [3418](./3418-scent-olfactory-visual/index.html)

- **opinion-dynamics-axelrod** — [3408](./3408-opinion-dynamics-axelrod/index.html)
- **michelson-interferometer** — [3409](./3409-michelson-interferometer/index.html)
- **food-web-ecology-3d** — [3410](./3410-food-web-ecology-3d/index.html)
- **urban-percolation-growth** — [3411](./3411-urban-percolation-growth/index.html)
- **diffraction-grating-spectrometer** — [3412](./3412-diffraction-grating-spectrometer/index.html)

- **game-of-life-3d** — [3402](./3402-game-of-life-3d/index.html)
- **geographic-globe** — [3404](./3404-geographic-globe/index.html)
- **artifact-museum** — [3405](./3405-artifact-museum/index.html)
- **particle-swarm** — [3406](./3406-particle-swarm/index.html)
- **procedural-bamboo-forest** — [3407](./3407-procedural-bamboo-forest/index.html)

- **soft-robotics-sim** — [3394](./3394-soft-robotics-sim/index.html)
- **black-scholes-3d-surface** — [3395](./3395-black-scholes-3d-surface/index.html)
- **reinforcement-learning-maze** — [3396](./3396-reinforcement-learning-maze/index.html)
- **procedural-cloud-city** — [3397](./3397-procedural-cloud-city/index.html)
- **autonomous-driving-simulation** — [3398](./3398-autonomous-driving-simulation/index.html)
- **morphogenetic-tissue-sim** — [3399](./3399-morphogenetic-tissue-sim/index.html)
- **holographic-nearest-neighbor** — [3400](./3400-holographic-nearest-neighbor/index.html)

- **ising-model-phase-transition** — [3389](./3389-ising-model-phase-transition/index.html)
- **stress-strain-beam-sim** — [3390](./3390-stress-strain-beam-sim/index.html)
- **delaunay-triangulation-dynamic** — [3391](./3391-delaunay-triangulation-dynamic/index.html)
- **percolation-cluster-3d** — [3392](./3392-percolation-cluster-3d/index.html)
- **ray-optics-lab** — [3393](./3393-ray-optics-lab/index.html)

- **shader-material-builder** — [3381](./3381-shader-material-builder/index.html)
- **swarm-robotics-sim** — [3382](./3382-swarm-robotics-sim/index.html)
- **path-tracer-global** — [3383](./3383-path-tracer-global/index.html)
- **dataflow-graph-viz** — [3384](./3384-dataflow-graph-viz/index.html)
- **fabric-weave-pattern** — [3385](./3385-fabric-weave-pattern/index.html)
- **music-step-sequencer-3d** — [3386](./3386-music-step-sequencer-3d/index.html)
- **structural-fem-analysis** — [3387](./3387-structural-fem-analysis/index.html)
- **archaeological-dig-sim** — [3388](./3388-archaeological-dig-sim/index.html)

- **dendritic-solidification-sim** — [3374](./3374-dendritic-solidification-sim/index.html)
- **agent-based-market-sim** — [3375](./3375-agent-based-market-sim/index.html)
- **evolutionary-algorithm-3d** — [3376](./3376-evolutionary-algorithm-3d/index.html)
- **stress-analysis-beam** — [3377](./3377-stress-analysis-beam/index.html)
- **boolean-logic-circuit-viz** — [3378](./3378-boolean-logic-circuit-viz/index.html)
- **parking-lot-sim** — [3379](./3379-parking-lot-sim/index.html)
- **multi-agent-drone-swarm** — [3380](./3380-multi-agent-drone-swarm/index.html)

- **procedural-architecture-parametric** — [3354](./3354-procedural-architecture-parametric/index.html)
- **voxel-game-engine** — [3355](./3355-voxel-game-engine/index.html)
- **robot-path-planning** — [3356](./3356-robot-path-planning/index.html)
- **fluid-paint-sim** — [3357](./3357-fluid-paint-sim/index.html)
- **caustic-art-shader** — [3358](./3358-caustic-art-shader/index.html)
- **procedural-glasswork** — [3359](./3359-procedural-glasswork/index.html)
- **scatter-plot-matrix-3d** — [3360](./3360-scatter-plot-matrix-3d/index.html)
- **sonar-wave-propagation** — [3361](./3361-sonar-wave-propagation/index.html)
- **confocal-microscopy-volume** — [3363](./3363-confocal-microscopy-volume/index.html)
- **parametric-sail-aerodynamics** — [3364](./3364-parametric-sail-aerodynamics/index.html)
- **non-newtonian-fluid-sim** — [3366](./3366-non-newtonian-fluid-sim/index.html)
- **brachistochrone-curve** — [3367](./3367-brachistochrone-curve/index.html)
- **holographic-ar-display** — [3368](./3368-holographic-ar-display/index.html)
- **algorithmic-music-gen** — [3369](./3369-algorithmic-music-gen/index.html)
- **wind-turbine-aero** — [3370](./3370-wind-turbine-aero/index.html)
- **shader-debugger-visualizer** — [3371](./3371-shader-debugger-visualizer/index.html)
- **voxel-raytrace-hybrid** — [3372](./3372-voxel-raytrace-hybrid/index.html)
- **shadow-volume-rendering** — [3373](./3373-shadow-volume-rendering/index.html)

- **heat-equation-diffusion-3d** — [3347](./3347-heat-equation-diffusion-3d/index.html)
- **voronoi-foam-plateau** — [3348](./3348-voronoi-foam-plateau/index.html)
- **stock-market-candlestick-3d** — [3349](./3349-stock-market-candlestick-3d/index.html)
- **medical-volume-cast** — [3350](./3350-medical-volume-cast/index.html)
- **molecular-dynamics-3d** — [3351](./3351-molecular-dynamics-3d/index.html)
- **acoustic-room-impulse** — [3352](./3352-acoustic-room-impulse/index.html)
- **simulated-annealing-opt** — [3353](./3353-simulated-annealing-opt/index.html)

- **electromagnetic-wave-antenna-radiation** — [3341](./3341-electromagnetic-wave-antenna-radiation/index.html)
- **gpu-computational-fluid-dynamics** — [3342](./3342-gpu-computational-fluid-dynamics/index.html)
- **sintering-grain-growth-material** — [3343](./3343-sintering-grain-growth-material/index.html)
- **options-greeks-surface-visualization** — [3344](./3344-options-greeks-surface-visualization/index.html)
- **gis-3d-terrain-hydrology** — [3345](./3345-gis-3d-terrain-hydrology/index.html)
- **volume-rendering-medical-ct** — [3346](./3346-volume-rendering-medical-ct/index.html)

- **tower-defense-wave** — [3336](./3336-tower-defense-wave/index.html)
- **rhythm-game-3d** — [3337](./3337-rhythm-game-3d/index.html)
- **stealth-guard-ai** — [3338](./3338-stealth-guard-ai/index.html)
- **procedural-city-zoning** — [3339](./3339-procedural-city-zoning/index.html)
- **platformer-side-scroll** — [3340](./3340-platformer-side-scroll/index.html)

- **acoustic-room-sim** — [3332](./3332-acoustic-room-sim/index.html)
- **brewster-angle-polarization** — [3333](./3333-brewster-angle-polarization/index.html)
- **phonon-crystal-lattice** — [3334](./3334-phonon-crystal-lattice/index.html)
- **el-nino-ocean-current** — [3335](./3335-el-nino-ocean-current/index.html)

- **stress-fiber-cell** — [3326](./3326-stress-fiber-cell/index.html)
- **haptic-soft-touch** — [3327](./3327-haptic-soft-touch/index.html)
- **metamaterial-inversion** — [3328](./3328-metamaterial-inversion/index.html)
- **crystal-plane-slip** — [3329](./3329-crystal-plane-slip/index.html)
- **soap-bubble-bounce** — [3330](./3330-soap-bubble-bounce/index.html)

- **--analyze-readme** — [3310](./3310---analyze-readme/index.html)
- **procedural-moss-wall** — [3311](./3311-procedural-moss-wall/index.html)
- **reaction-diffusion-pattern** — [3312](./3312-reaction-diffusion-pattern/index.html)
- **wood-grain-shader** — [3313](./3313-wood-grain-shader/index.html)
- **origami-folding-physics** — [3314](./3314-origami-folding-physics/index.html)
- **traffic-intersection-sim** — [3315](./3315-traffic-intersection-sim/index.html)
- **circuit-trace-viz** — [3316](./3316-circuit-trace-viz/index.html)

- **quantum-walk-2d** — [3309](./3309-quantum-walk-2d/index.html)

- **sph-fluid-sim** — [3303](./3303-sph-fluid-sim/index.html)
- **lattice-boltzmann-2d** — [3304](./3304-lattice-boltzmann-2d/index.html)
- **dendritic-solidification** — [3306](./3306-dendritic-solidification/index.html)
- **liquid-crystal-phase** — [3307](./3307-liquid-crystal-phase/index.html)
- **tumor-growth-agent** — [3308](./3308-tumor-growth-agent/index.html)

- **procedural-wood-grain** — [3295](./3295-procedural-wood-grain/index.html)
- **islamic-geometric-pattern** — [3296](./3296-islamic-geometric-pattern/index.html)
- **pointillism-shader** — [3297](./3297-pointillism-shader/index.html)
- **parametric-fashion-drape** — [3298](./3298-parametric-fashion-drape/index.html)
- **truchet-tile-volumetric** — [3299](./3299-truchet-tile-volumetric/index.html)
- **fibonacci-phyllotaxis** — [3300](./3300-fibonacci-phyllotaxis/index.html)
- **optical-art-moire** — [3301](./3301-optical-art-moire/index.html)
- **impossible-ames-room** — [3302](./3302-impossible-ames-room/index.html)

- **self-organizing-criticality-sandpile** — [3290](./3290-self-organizing-criticality-sandpile/index.html)
- **maze-generation-3d** — [3291](./3291-maze-generation-3d/index.html)
- **spectral-clustering-visual** — [3292](./3292-spectral-clustering-visual/index.html)
- **rigid-body-fracture-sim** — [3293](./3293-rigid-body-fracture-sim/index.html)
- **reaction-transport-diffusion** — [3294](./3294-reaction-transport-diffusion/index.html)

- **path-integral-quantum-mechanics** — [3285](./3285-path-integral-quantum-mechanics/index.html)
- **protein-ligand-docking-sim** — [3286](./3286-protein-ligand-docking-sim/index.html)
- **topological-quantum-anyons** — [3287](./3287-topological-quantum-anyons/index.html)
- **cellular-potts-tissue-growth** — [3288](./3288-cellular-potts-tissue-growth/index.html)
- **granular-rayleigh-benard-convection** — [3289](./3289-granular-rayleigh-benard-convection/index.html)

- **delaunay-triangulation** — [3278](./3278-delaunay-triangulation/index.html)
- **concert-hall-acoustics** — [3279](./3279-concert-hall-acoustics/index.html)
- **gait-cycle-biomechanics** — [3280](./3280-gait-cycle-biomechanics/index.html)
- **bloom-filter-visual** — [3281](./3281-bloom-filter-visual/index.html)
- **grain-growth-sintering** — [3282](./3282-grain-growth-sintering/index.html)
- **magnetic-reconnection-plasma** — [3283](./3283-magnetic-reconnection-plasma/index.html)
- **behavior-tree-npc** — [3284](./3284-behavior-tree-npc/index.html)

- **procedural-bonsai-growth** — [3272](./3272-procedural-bonsai-growth/index.html)
- **fluid-structure-flutter** — [3273](./3273-fluid-structure-flutter/index.html)
- **music-notation-3d** — [3274](./3274-music-notation-3d/index.html)
- **bridge-engineering-sim** — [3275](./3275-bridge-engineering-sim/index.html)
- **pottery-wheel-lathe** — [3276](./3276-pottery-wheel-lathe/index.html)
- **3d-data-dashboard** — [3277](./3277-3d-data-dashboard/index.html)

- **cellular-biology-mitosis** — [3266](./3266-cellular-biology-mitosis/index.html)
- **blockchain-transaction-viz** — [3267](./3267-blockchain-transaction-viz/index.html)
- **impressionist-painting-style** — [3268](./3268-impressionist-painting-style/index.html)
- **real-time-gis-3d-map** — [3269](./3269-real-time-gis-3d-map/index.html)
- **granular-synthesis-visualizer** — [3270](./3270-granular-synthesis-visualizer/index.html)
- **procedural-kirigami-paper-art** — [3271](./3271-procedural-kirigami-paper-art/index.html)

- **volcanic-eruption** — [3258](./3258-volcanic-eruption/index.html)
- **telescope-optics** — [3259](./3259-telescope-optics/index.html)
- **drone-swarm-sim** — [3260](./3260-drone-swarm-sim/index.html)
- **wing-aerodynamics** — [3261](./3261-wing-aerodynamics/index.html)
- **cable-stayed-bridge** — [3262](./3262-cable-stayed-bridge/index.html)
- **lidar-scanning-visual** — [3263](./3263-lidar-scanning-visual/index.html)
- **wave-energy-converter** — [3264](./3264-wave-energy-converter/index.html)
- **speaker-acoustics** — [3265](./3265-speaker-acoustics/index.html)

- **benard-convection-cells** — [3252](./3252-benard-convection-cells/index.html)
- **kelvin-helmholtz-instability** — [3253](./3253-kelvin-helmholtz-instability/index.html)
- **liquid-crystal-nematic-phase** — [3254](./3254-liquid-crystal-nematic-phase/index.html)
- **phylogenetic-tree-evolution** — [3255](./3255-phylogenetic-tree-evolution/index.html)
- **economic-order-book-depth** — [3256](./3256-economic-order-book-depth/index.html)
- **shear-wave-elastography** — [3257](./3257-shear-wave-elastography/index.html)

- **organic-fluid-simulation** — [3245](./3245-organic-fluid-simulation/index.html)
- **generative-art-noise** — [3246](./3246-generative-art-noise/index.html)
- **particle-starfield** — [3247](./3247-particle-starfield/index.html)
- **data-visualization-3d** — [3248](./3248-data-visualization-3d/index.html)
- **audio-reactive-visuals** — [3251](./3251-audio-reactive-visuals/index.html)

- **chladni-plate-cymatics** — [3237](./3237-chladni-plate-cymatics/index.html)
- **gravity-slingshot-orbit** — [3238](./3238-gravity-slingshot-orbit/index.html)
- **black-scholes-options-surface** — [3239](./3239-black-scholes-options-surface/index.html)
- **fm-synthesis-visualizer** — [3240](./3240-fm-synthesis-visualizer/index.html)
- **merkle-tree-data-structure** — [3241](./3241-merkle-tree-data-structure/index.html)
- **lagrange-points-orbit** — [3242](./3242-lagrange-points-orbit/index.html)
- **isometric-city-builder** — [3243](./3243-isometric-city-builder/index.html)

- **double-slit-quantum-interference** — [3230](./3230-double-slit-quantum-interference/index.html)
- **neural-network-training-3d-visualization** — [3231](./3231-neural-network-training-3d-visualization/index.html)
- **protein-folding-alpha-helix-sim** — [3232](./3232-protein-folding-alpha-helix-sim/index.html)
- **hadley-cell-atmospheric-circulation** — [3233](./3233-hadley-cell-atmospheric-circulation/index.html)
- **double-pendulum-chaos-attractor** — [3234](./3234-double-pendulum-chaos-attractor/index.html)
- **tsunami-shallow-water-propagation** — [3235](./3235-tsunami-shallow-water-propagation/index.html)
- **hiv-progression-immune-response** — [3236](./3236-hiv-progression-immune-response/index.html)

- **cochlear-frequency-mapping** — [3224](./3224-cochlear-frequency-mapping/index.html)
- **jet-stream-atmospheric-circulation** — [3225](./3225-jet-stream-atmospheric-circulation/index.html)
- **cortical-folding-gyri-sulci** — [3226](./3226-cortical-folding-gyri-sulci/index.html)
- **buckling-instability-structural** — [3227](./3227-buckling-instability-structural/index.html)
- **grain-boundary-migration-material** — [3228](./3228-grain-boundary-migration-material/index.html)
- **karplus-strong-acoustic-physics** — [3229](./3229-karplus-strong-acoustic-physics/index.html)

- **klein-bottle** — [3216](./3216-klein-bottle/index.html)
- **pid-controller-3d** — [3217](./3217-pid-controller-3d/index.html)
- **fourier-series-3d** — [3218](./3218-fourier-series-3d/index.html)
- **lotka-volterra-population** — [3219](./3219-lotka-volterra-population/index.html)
- **penrose-tiling** — [3220](./3220-penrose-tiling/index.html)
- **electrostatic-field** — [3221](./3221-electrostatic-field/index.html)
- **ratchet-mechanism** — [3222](./3222-ratchet-mechanism/index.html)
- **harmonograph-3d** — [3223](./3223-harmonograph-3d/index.html)

- **hatching-npr-sketch** — [3210](./3210-hatching-npr-sketch/index.html)
- **voronoi-foam-bubble** — [3211](./3211-voronoi-foam-bubble/index.html)
- **subsurface-scattering-wax** — [3212](./3212-subsurface-scattering-wax/index.html)
- **hilbert-space-curve-3d** — [3213](./3213-hilbert-space-curve-3d/index.html)
- **rayleigh-plateau-jet** — [3214](./3214-rayleigh-plateau-jet/index.html)
- **fluid-structure-coupled-v2** — [3215](./3215-fluid-structure-coupled-v2/index.html)

- **granular-crystallization-sim** — [3204](./3204-granular-crystallization-sim/index.html)
- **creeping-drying-fluid** — [3205](./3205-creeping-drying-fluid/index.html)
- **bacterial-growth-pattern** — [3206](./3206-bacterial-growth-pattern/index.html)
- **pinning-depinning-phase** — [3207](./3207-pinning-depinning-phase/index.html)
- **wavefunction-tomography** — [3208](./3208-wavefunction-tomography/index.html)
- **microfacet-brdf-pbr** — [3209](./3209-microfacet-brdf-pbr/index.html)

- **conways-game-of-life-3d** — [3198](./3198-conways-game-of-life-3d/index.html)
- **ray-optics-simulation** — [3199](./3199-ray-optics-simulation/index.html)
- **supply-demand-3d-chart** — [3200](./3200-supply-demand-3d-chart/index.html)
- **heat-equation-diffusion** — [3201](./3201-heat-equation-diffusion/index.html)
- **turing-pattern-generator** — [3202](./3202-turing-pattern-generator/index.html)
- **parametric-surface-visualizer** — [3203](./3203-parametric-surface-visualizer/index.html)

- **physarum-slime-mold-network** — [3190](./3190-physarum-slime-mold-network/index.html)
- **viscoelastic-fluid-sim** — [3191](./3191-viscoelastic-fluid-sim/index.html)
- **ant-colony-optimization-3d** — [3192](./3192-ant-colony-optimization-3d/index.html)
- **speckle-interferometry-pattern** — [3193](./3193-speckle-interferometry-pattern/index.html)
- **sand-mandala-generator** — [3194](./3194-sand-mandala-generator/index.html)
- **root-soil-growth-sim** — [3195](./3195-root-soil-growth-sim/index.html)
- **real-time-stock-ticker-3d** — [3196](./3196-real-time-stock-ticker-3d/index.html)
- **gear-transmission-mechanism** — [3197](./3197-gear-transmission-mechanism/index.html)

- **cellular-potts-tissue** — [3186](./3186-cellular-potts-tissue/index.html)
- **agent-based-market** — [3187](./3187-agent-based-market/index.html)
- **procedural-gothic-architecture** — [3188](./3188-procedural-gothic-architecture/index.html)
- **voice-mesh-deformation** — [3189](./3189-voice-mesh-deformation/index.html)

- **meander-river-erosion** — [3179](./3179-meander-river-erosion/index.html)
- **transformer-attention-3d** — [3180](./3180-transformer-attention-3d/index.html)
- **bonsai-procedural-growth** — [3181](./3181-bonsai-procedural-growth/index.html)
- **implied-volatility-surface** — [3182](./3182-implied-volatility-surface/index.html)
- **evacuation-social-force** — [3183](./3183-evacuation-social-force/index.html)
- **parametric-space-frame** — [3184](./3184-parametric-space-frame/index.html)

- **belousov-zhabotinsky-reaction** — [3171](./3171-belousov-zhabotinsky-reaction/index.html)
- **traffic-flow-intersection** — [3173](./3173-traffic-flow-intersection/index.html)
- **acoustic-levitation-physics** — [3174](./3174-acoustic-levitation-physics/index.html)
- **ising-model-ferromagnet** — [3175](./3175-ising-model-ferromagnet/index.html)
- **forest-fire-spread-ca** — [3176](./3176-forest-fire-spread-ca/index.html)
- **dendrite-metal-solidification** — [3177](./3177-dendrite-metal-solidification/index.html)
- **chladni-cymatics-pattern** — [3178](./3178-chladni-cymatics-pattern/index.html)

- **--analyze** — [3162](./3162---analyze/index.html)
- **superformula-3d-morphing** — [3163](./3163-superformula-3d-morphing/index.html)
- **caustic-water-light** — [3164](./3164-caustic-water-light/index.html)
- **lennard-jones-cluster** — [3165](./3165-lennard-jones-cluster/index.html)
- **erosion-thermal-geomorphology** — [3166](./3166-erosion-thermal-geomorphology/index.html)
- **crack-propagation-fracture** — [3167](./3167-crack-propagation-fracture/index.html)
- **phase-diagram-material-sim** — [3168](./3168-phase-diagram-material-sim/index.html)
- **superstring-membrane-vibration** — [3169](./3169-superstring-membrane-vibration/index.html)
- **weaving-pattern-textile** — [3170](./3170-weaving-pattern-textile/index.html)

- **shader-canvas-paint** — [3151](./3151-shader-canvas-paint/index.html)
- **monte-carlo-path-tracer** — [3152](./3152-monte-carlo-path-tracer/index.html)
- **navier-stokes-cfd** — [3153](./3153-navier-stokes-cfd/index.html)
- **fluid-structure-coupled** — [3154](./3154-fluid-structure-coupled/index.html)
- **julia-set-3d** — [3155](./3155-julia-set-3d/index.html)
- **moire-optical-art** — [3156](./3156-moire-optical-art/index.html)
- **schlierenn-imaging** — [3157](./3157-schlierenn-imaging/index.html)
- **leidenfrost-droplet** — [3158](./3158-leidenfrost-droplet/index.html)
- **apollonian-gasket** — [3159](./3159-apollonian-gasket/index.html)
- **anamorphic-art** — [3160](./3160-anamorphic-art/index.html)
- **fractal-coral-growth** — [3161](./3161-fractal-coral-growth/index.html)

- **--help** — [3143](./3143---help/index.html)
- **mechanical-watch** — [3144](./3144-mechanical-watch/index.html)
- **origami-folding** — [3145](./3145-origami-folding/index.html)
- **lattice-boltzmann** — [3146](./3146-lattice-boltzmann/index.html)
- **sir-epidemic** — [3147](./3147-sir-epidemic/index.html)
- **plate-tectonics** — [3148](./3148-plate-tectonics/index.html)
- **clebsch-cubic** — [3149](./3149-clebsch-cubic/index.html)
- **wang-tiles** — [3150](./3150-wang-tiles/index.html)

- **--list** — [3136](./3136---list/index.html)
- **cellular-biology-sim** — [3137](./3137-cellular-biology-sim/index.html)
- **ray-optics-sim** — [3138](./3138-ray-optics-sim/index.html)
- **platformer-game-3d** — [3139](./3139-platformer-game-3d/index.html)
- **molecular-dynamics-lennard** — [3140](./3140-molecular-dynamics-lennard/index.html)
- **tower-defense-sim** — [3141](./3141-tower-defense-sim/index.html)
- **fourier-series-visualizer** — [3142](./3142-fourier-series-visualizer/index.html)

- **impossible-geometry** — [3130](./3130-impossible-geometry/index.html)
- **penrose** — [3131](./3131-penrose/index.html)
- **voronoi-bone-tissue** — [3132](./3132-voronoi-bone-tissue/index.html)
- **turing-machine-visual** — [3133](./3133-turing-machine-visual/index.html)
- **morphogenesis-cell-division** — [3134](./3134-morphogenesis-cell-division/index.html)
- **procedural-highway-system** — [3135](./3135-procedural-highway-system/index.html)

- **gravitational-lensing-gr** — [3123](./3123-gravitational-lensing-gr/index.html)
- **ocean-wave-spectrum-sim** — [3124](./3124-ocean-wave-spectrum-sim/index.html)
- **quantum-circuit-3d** — [3125](./3125-quantum-circuit-3d/index.html)
- **smoke-ink-diffusion-fo** — [3126](./3126-smoke-ink-diffusion-fo/index.html)
- **parametric-nurbs-architecture** — [3127](./3127-parametric-nurbs-architecture/index.html)
- **cinematic-depth-of-field** — [3128](./3128-cinematic-depth-of-field/index.html)
- **magnetic-monopole-fields** — [3129](./3129-magnetic-monopole-fields/index.html)

- **mpm-material-point-granular** — [3112](./3112-mpm-material-point-granular/index.html)
- **traffic-lane-change-sim** — [3113](./3113-traffic-lane-change-sim/index.html)
- **ising-spin-glass** — [3114](./3114-ising-spin-glass/index.html)
- **evacuation-crowd-sim** — [3115](./3115-evacuation-crowd-sim/index.html)
- **semiconductor-device-sim** — [3116](./3116-semiconductor-device-sim/index.html)

- **physics-simulation** — [3106](./3106-physics-simulation/index.html)
- **organic-shapes** — [3107](./3107-organic-shapes/index.html)
- **particle-system** — [3108](./3108-particle-system/index.html)
- **audio-visualization** — [3109](./3109-audio-visualization/index.html)
- **shader-art** — [3110](./3110-shader-art/index.html)
- **fractal-geometry** — [3111](./3111-fractal-geometry/index.html)

- **economic-supply-demand-sim** — [3098](./3098-economic-supply-demand-sim/index.html)
- **archaeological-stratigraphy-layer** — [3099](./3099-archaeological-stratigraphy-layer/index.html)
- **morphogenetic-turing-pattern** — [3100](./3100-morphogenetic-turing-pattern/index.html)
- **3d-music-step-sequencer** — [3101](./3101-3d-music-step-sequencer/index.html)
- **spacecraft-orbital-rendezvous** — [3102](./3102-spacecraft-orbital-rendezvous/index.html)
- **biomechanical-tissue-sim** — [3103](./3103-biomechanical-tissue-sim/index.html)
- **microstructure-evolution-sim** — [3104](./3104-microstructure-evolution-sim/index.html)
- **fracture-mechanics-propagation** — [3105](./3105-fracture-mechanics-propagation/index.html)

- **electromagnetic-wave-propagation** — [3090](./3090-electromagnetic-wave-propagation/index.html)
- **phase-field-soldering-solidification** — [3091](./3091-phase-field-soldering-solidification/index.html)
- **voronoi-fracture-shattering** — [3092](./3092-voronoi-fracture-shattering/index.html)
- **verlet-cloth-simulation** — [3093](./3093-verlet-cloth-simulation/index.html)
- **rain-particle-physics** — [3094](./3094-rain-particle-physics/index.html)
- **audio-reactive-surface-deform** — [3095](./3095-audio-reactive-surface-deform/index.html)
- **turbulence-fluid-eddy-sim** — [3096](./3096-turbulence-fluid-eddy-sim/index.html)
- **stress-strain-elastic-beam** — [3097](./3097-stress-strain-elastic-beam/index.html)

- **diffraction-grating-optics** — [3083](./3083-diffraction-grating-optics/index.html)
- **plate-tectonics-continental-drift** — [3084](./3084-plate-tectonics-continental-drift/index.html)
- **epidemic-spread-sir-model** — [3085](./3085-epidemic-spread-sir-model/index.html)
- **lattice-boltzmann-fluid-sim** — [3086](./3086-lattice-boltzmann-fluid-sim/index.html)
- **holographic-interference-pattern** — [3087](./3087-holographic-interference-pattern/index.html)
- **tsunami-shallow-water-wave** — [3088](./3088-tsunami-shallow-water-wave/index.html)

- **abel-flux-divergence** — [3075](./3075-abel-flux-divergence/index.html)
- **spinodal-decomposition** — [3076](./3076-spinodal-decomposition/index.html)
- **eulerian-fluid-smoke** — [3077](./3077-eulerian-fluid-smoke/index.html)
- **soap-film-minimal-surface** — [3078](./3078-soap-film-minimal-surface/index.html)
- **tree-ring-dendrochronology** — [3079](./3079-tree-ring-dendrochronology/index.html)
- **pendulum-chaos-lorenz** — [3080](./3080-pendulum-chaos-lorenz/index.html)
- **percolation-transport** — [3081](./3081-percolation-transport/index.html)
- **honeycomb-weaire-phelan** — [3082](./3082-honeycomb-weaire-phelan/index.html)

- **percolation-cluster** — [3071](./3071-percolation-cluster/index.html)
- **pythagorean-tree-3d** — [3072](./3072-pythagorean-tree-3d/index.html)
- **shader-art-parametric** — [3073](./3073-shader-art-parametric/index.html)
- **reaction-diffusion-gray-scott** — [3074](./3074-reaction-diffusion-gray-scott/index.html)

- **boids-flocking-sim** — [3063](./3063-boids-flocking-sim/index.html)
- **reaction-diffusion-turing-gpu** — [3064](./3064-reaction-diffusion-turing-gpu/index.html)
- **procedural-cave-dungeon-gem** — [3065](./3065-procedural-cave-dungeon-gem/index.html)
- **origa-folding-physics** — [3066](./3066-origa-folding-physics/index.html)
- **mpm-material-point-method** — [3067](./3067-mpm-material-point-method/index.html)
- **clebsch-cubic-surface** — [3069](./3069-clebsch-cubic-surface/index.html)
- **l-system-botanical-growth** — [3070](./3070-l-system-botanical-growth/index.html)

- **sph-fluid-water** — [3057](./3057-sph-fluid-water/index.html)
- **fourier-transform-visualizer** — [3058](./3058-fourier-transform-visualizer/index.html)
- **voxel-chunk-engine** — [3059](./3059-voxel-chunk-engine/index.html)
- **structural-stress-fem** — [3060](./3060-structural-stress-fem/index.html)
- **boolean-logic-circuit** — [3061](./3061-boolean-logic-circuit/index.html)
- **spirograph-lissajous** — [3062](./3062-spirograph-lissajous/index.html)

- **dendritic-crystal-growth** — [3041](./3041-dendritic-crystal-growth/index.html)
- **granular-segregation-sim** — [3042](./3042-granular-segregation-sim/index.html)
- **kelp-forest-underwater** — [3043](./3043-kelp-forest-underwater/index.html)
- **suspension-bridge-catenary** — [3044](./3044-suspension-bridge-catenary/index.html)
- **marangoni-convection** — [3045](./3045-marangoni-convection/index.html)
- **root-growth-tropism** — [3046](./3046-root-growth-tropism/index.html)
- **3d-physics-simulation** — [3047](./3047-3d-physics-simulation/index.html)
- **procedural-city-generator** — [3049](./3049-procedural-city-generator/index.html)
- **fluid-drip-solidification** — [3050](./3050-fluid-drip-solidification/index.html)
- **crystallographic-symmetry-groups** — [3051](./3051-crystallographic-symmetry-groups/index.html)
- **plasma-collision-reconnection** — [3052](./3052-plasma-collision-reconnection/index.html)
- **space-debris-orbit-sim** — [3053](./3053-space-debris-orbit-sim/index.html)
- **rutherford-scattering-gold-foil** — [3054](./3054-rutherford-scattering-gold-foil/index.html)
- **euler-fluid-gas-sim** — [3055](./3055-euler-fluid-gas-sim/index.html)
- **shallow-water-wave-equation** — [3056](./3056-shallow-water-wave-equation/index.html)

- **granular-segregation-sim** — [3042](./3042-granular-segregation-sim/index.html)
- **kelp-forest-underwater** — [3043](./3043-kelp-forest-underwater/index.html)
- **suspension-bridge-catenary** — [3044](./3044-suspension-bridge-catenary/index.html)
- **marangoni-convection** — [3045](./3045-marangoni-convection/index.html)
- **root-growth-tropism** — [3046](./3046-root-growth-tropism/index.html)

- **geodesic-dome-architecture** — [3036](./3036-geodesic-dome-architecture/index.html)
- **string-art-harmonograph** — [3037](./3037-string-art-harmonograph/index.html)
- **muscle-tendon-biomechanics** — [3038](./3038-muscle-tendon-biomechanics/index.html)
- **dna-basepair-helix** — [3039](./3039-dna-basepair-helix/index.html)
- **archimedean-solids** — [3040](./3040-archimedean-solids/index.html)

- **procedural-rock-garden-sandbox** — [3028](./3028-procedural-rock-garden-sandbox/index.html)
- **nbody-gravitational-galaxy-form** — [3029](./3029-nbody-gravitational-galaxy-form/index.html)
- **volumetric-cloud-formation** — [3030](./3030-volumetric-cloud-formation/index.html)
- **structural-stress-visualization** — [3031](./3031-structural-stress-visualization/index.html)
- **snow-avalanche-particle-sim** — [3032](./3032-snow-avalanche-particle-sim/index.html)
- **circuit-board-signal-propagation** — [3033](./3033-circuit-board-signal-propagation/index.html)
- **fluid-funnel-chaos-sim** — [3034](./3034-fluid-funnel-chaos-sim/index.html)
- **holographic-memory-hologram** — [3035](./3035-holographic-memory-hologram/index.html)

- **game-octree-spatial** — [3020](./3020-game-octree-spatial/index.html)
- **volume-rendering-medical** — [3021](./3021-volume-rendering-medical/index.html)
- **fft-spectral-waterfall** — [3022](./3022-fft-spectral-waterfall/index.html)
- **soft-body-verlet-sim** — [3023](./3023-soft-body-verlet-sim/index.html)
- **portal-rendering-room** — [3024](./3024-portal-rendering-room/index.html)
- **marching-cubes-isosurface** — [3025](./3025-marching-cubes-isosurface/index.html)
- **neural-network-3d-arch** — [3026](./3026-neural-network-3d-arch/index.html)
- **fractal-terrain-minecraft** — [3027](./3027-fractal-terrain-minecraft/index.html)

- **ink-wash-painting** — [3012](./3012-ink-wash-painting/index.html)
- **hex-grid-strategy** — [3013](./3013-hex-grid-strategy/index.html)
- **procedural-coral-reef** — [3014](./3014-procedural-coral-reef/index.html)
- **mechanical-clockwork** — [3015](./3015-mechanical-clockwork/index.html)
- **shader-particles-gpu** — [3016](./3016-shader-particles-gpu/index.html)
- **terrain-editing-tools** — [3017](./3017-terrain-editing-tools/index.html)
- **data-stream-network** — [3018](./3018-data-stream-network/index.html)

- **robot-arm-ik** — [3004](./3004-robot-arm-ik/index.html)
- **3d-breakout-game** — [3005](./3005-3d-breakout-game/index.html)
- **procedural-art-shader-gallery** — [3006](./3006-procedural-art-shader-gallery/index.html)
- **musical-spring-drum** — [3007](./3007-musical-spring-drum/index.html)
- **vr-3d-painting** — [3008](./3008-vr-3d-painting/index.html)
- **urban-planning-sim** — [3009](./3009-urban-planning-sim/index.html)
- **cellular-automata-art** — [3010](./3010-cellular-automata-art/index.html)
- **kinetic-typography-3d** — [3011](./3011-kinetic-typography-3d/index.html)

- **physics-platformer-sideview** — [2998](./2998-physics-platformer-sideview/index.html)
- **crowd-emergent-behaviors** — [2999](./2999-crowd-emergent-behaviors/index.html)
- **heat-transfer-thermodynamics** — [3000](./3000-heat-transfer-thermodynamics/index.html)
- **stained-glass-artistic** — [3001](./3001-stained-glass-artistic/index.html)
- **autonomous-vehicle-topdown** — [3002](./3002-autonomous-vehicle-topdown/index.html)
- **turnbased-tactics-grid** — [3003](./3003-turnbased-tactics-grid/index.html)

- **elastic-wave-propagation** — [2991](./2991-elastic-wave-propagation/index.html)
- **beat-synced-particle-explosion** — [2992](./2992-beat-synced-particle-explosion/index.html)
- **subsurface-scattering-gemstones** — [2993](./2993-subsurface-scattering-gemstones/index.html)
- **kdtree-raytracing-visualizer** — [2994](./2994-kdtree-raytracing-visualizer/index.html)
- **procedural-vegetation-scatter** — [2995](./2995-procedural-vegetation-scatter/index.html)
- **photorealistic-water-shader** — [2996](./2996-photorealistic-water-shader/index.html)
- **shader-node-editor** — [2997](./2997-shader-node-editor/index.html)

- **karman-vortex-street** — [2985](./2985-karman-vortex-street/index.html)
- **quasicrystal-differential-rotation** — [2987](./2987-quasicrystal-differential-rotation/index.html)
- **tesseract-4d-rotation** — [2988](./2988-tesseract-4d-rotation/index.html)
- **generative-typographic-forest** — [2989](./2989-generative-typographic-forest/index.html)
- **impossible-continuoushausdorff** — [2990](./2990-impossible-continuoushausdorff/index.html)

- **rigid-body-stacking** — [2980](./2980-rigid-body-stacking/index.html)
- **procedural-texture-shaders** — [2981](./2981-procedural-texture-shaders/index.html)
- **kinetic-typography** — [2982](./2982-kinetic-typography/index.html)
- **multi-agent-traffic** — [2983](./2983-multi-agent-traffic/index.html)
- **waterfall-cascade** — [2984](./2984-waterfall-cascade/index.html)

- **holographic-sculpture** — [361](./361-holographic-sculpture/index.html)
- **penrose-stairs** — [362](./362-penrose-stairs/index.html)
- **thermal-imaging** — [363](./363-thermal-imaging/index.html)
- **cymatics-pattern** — [364](./364-cymatics-pattern/index.html)
- **light-painting** — [365](./365-light-painting/index.html)

- **ice-crystal-growth** — [2973](./2973-ice-crystal-growth/index.html)
- **hair-strand-shader** — [2974](./2974-hair-strand-shader/index.html)
- **vocoder-audio-visualizer** — [2975](./2975-vocoder-audio-visualizer/index.html)
- **snow-accumulation-physics** — [2976](./2976-snow-accumulation-physics/index.html)
- **fluid-structure-interaction** — [2977](./2977-fluid-structure-interaction/index.html)
- **ray-tracer-real-time** — [2978](./2978-ray-tracer-real-time/index.html)
- **granular-pouring-sim** — [2979](./2979-granular-pouring-sim/index.html)

- **neural-network-training-3d** — [2965](./2965-neural-network-training-3d/index.html)
- **structural-stress-analysis** — [2966](./2966-structural-stress-analysis/index.html)
- **blood-cell-flow-sim** — [2967](./2967-blood-cell-flow-sim/index.html)
- **origami-folding-sim** — [2968](./2968-origami-folding-sim/index.html)
- **fluid-structure-vortex** — [2970](./2970-fluid-structure-vortex/index.html)
- **urban-growth-modeling** — [2971](./2971-urban-growth-modeling/index.html)
- **game-ai-pathfinding-spatial** — [2972](./2972-game-ai-pathfinding-spatial/index.html)

- **粒子系统-星云模拟** — [2961](./2961-粒子系统-星云模拟/index.html)
- **波动方程可视化** — [2962](./2962-波动方程可视化/index.html)
- **拓扑学曲面** — [2963](./2963-拓扑学曲面/index.html)
- **噪声地形生成** — [2964](./2964-噪声地形生成/index.html)

- **karplus-strong-string** — [2955](./2955-karplus-strong-string/index.html)
- **cloth-particle-sim** — [2956](./2956-cloth-particle-sim/index.html)
- **a-star-pathfinding** — [2957](./2957-a-star-pathfinding/index.html)
- **3d-boolean-csg-editor** — [2958](./2958-3d-boolean-csg-editor/index.html)
- **soap-bubble-foam** — [2959](./2959-soap-bubble-foam/index.html)
- **procedural-terrain-weathering** — [2960](./2960-procedural-terrain-weathering/index.html)

- **dendritic-growth** — [2948](./2948-dendritic-growth/index.html)
- **multiphase-fluid** — [2949](./2949-multiphase-fluid/index.html)
- **voronoi-tissue** — [2950](./2950-voronoi-tissue/index.html)
- **minimal-surfaces** — [2951](./2951-minimal-surfaces/index.html)
- **traffic-intersection** — [2952](./2952-traffic-intersection/index.html)
- **procedural-tree-lsystem** — [2954](./2954-procedural-tree-lsystem/index.html)

- **ferrofluid-spikes** — [2942](./2942-ferrofluid-spikes/index.html)
- **soliton-wave** — [2943](./2943-soliton-wave/index.html)
- **morphogenesis-sim** — [2944](./2944-morphogenesis-sim/index.html)
- **stellar-evolution** — [2945](./2945-stellar-evolution/index.html)
- **acoustic-levitation** — [2946](./2946-acoustic-levitation/index.html)
- **topological-insulator** — [2947](./2947-topological-insulator/index.html)

- **diffusion-limited-aggregation-gen** — [2936](./2936-diffusion-limited-aggregation-gen/index.html)
- **cellular-automata-wolfram** — [2937](./2937-cellular-automata-wolfram/index.html)
- **ecosystem-predator-prey** — [2938](./2938-ecosystem-predator-prey/index.html)
- **wang-tiles-procedural** — [2939](./2939-wang-tiles-procedural/index.html)
- **generative-mosaic-art** — [2940](./2940-generative-mosaic-art/index.html)
- **beam-physics-sim** — [2941](./2941-beam-physics-sim/index.html)

- **traffic-flow-sim** — [2930](./2930-traffic-flow-sim/index.html)
- **pyroclastic-flow** — [2931](./2931-pyroclastic-flow/index.html)
- **magnetic-levitation** — [2932](./2932-magnetic-levitation/index.html)
- **forest-fire-sim** — [2933](./2933-forest-fire-sim/index.html)
- **liquid-metal-morph** — [2934](./2934-liquid-metal-morph/index.html)
- **rain-on-glass** — [2935](./2935-rain-on-glass/index.html)

- **vortex-street-sim** — [2926](./2926-vortex-street-sim/index.html)
- **spin-glass-ising** — [2927](./2927-spin-glass-ising/index.html)
- **wave-interference-patterns** — [2928](./2928-wave-interference-patterns/index.html)
- **optical-ray-tracer** — [2929](./2929-optical-ray-tracer/index.html)

- **lorenz-attractor** — [2917](./2917-lorenz-attractor/index.html)
- **topological-knots** — [2918](./2918-topological-knots/index.html)
- **dna-replication-sim** — [2919](./2919-dna-replication-sim/index.html)
- **pendulum-clock** — [2920](./2920-pendulum-clock/index.html)
- **soap-film-minimal** — [2921](./2921-soap-film-minimal/index.html)
- **elastic-ribbon-sim** — [2922](./2922-elastic-ribbon-sim/index.html)
- **crystal-growth-diffusion** — [2923](./2923-crystal-growth-diffusion/index.html)

- **clockwork-gears** — [2909](./2909-clockwork-gears/index.html)
- **sandpile-self-organized** — [2910](./2910-sandpile-self-organized/index.html)
- **soap-bubble-thinfilm** — [2911](./2911-soap-bubble-thinfilm/index.html)
- **tensegrity-structure** — [2912](./2912-tensegrity-structure/index.html)
- **magnetic-dipole-field** — [2913](./2913-magnetic-dipole-field/index.html)
- **liquid-crystal-display** — [2914](./2914-liquid-crystal-display/index.html)
- **flame-propagation-sim** — [2915](./2915-flame-propagation-sim/index.html)
- **spring-mass-pendulum** — [2916](./2916-spring-mass-pendulum/index.html)

- **prism-rainbow** — [2898](./2898-prism-rainbow/index.html)
- **ferris-wheel-sim** — [2899](./2899-ferris-wheel-sim/index.html)
- **newton-cradle** — [2900](./2900-newton-cradle/index.html)
- **balloon-physics** — [2901](./2901-balloon-physics/index.html)
- **water-droplet** — [2902](./2902-water-droplet/index.html)
- **solar-system-sim** — [2903](./2903-solar-system-sim/index.html)
- **comet-tail-sim** — [2904](./2904-comet-tail-sim/index.html)
- **aurora-borealis-sim** — [2905](./2905-aurora-borealis-sim/index.html)
- **granular-sim** — [2908](./2908-granular-sim/index.html)

- **magnet-field-lines** — [2834](./2834-magnet-field-lines/index.html)
- **conway-life** — [2835](./2835-conway-life/index.html)
- **fractal-tree-gen** — [2836](./2836-fractal-tree-gen/index.html)
- **cloth-drape-sim** — [2837](./2837-cloth-drape-sim/index.html)
- **sand-particle-sim** — [2838](./2838-sand-particle-sim/index.html)
- **bubble-physics** — [2839](./2839-bubble-physics/index.html)
- **soap-film-sim** — [2840](./2840-soap-film-sim/index.html)
- **laser-reflection** — [2841](./2841-laser-reflection/index.html)

- **voxel-farm-builder** — [2803](./2803-voxel-farm-builder/index.html)
- **galaxy-cluster-sim** — [2804](./2804-galaxy-cluster-sim/index.html)
- **crystal-lattice-sim** — [2805](./2805-crystal-lattice-sim/index.html)
- **audio-waveform-3d** — [2806](./2806-audio-waveform-3d/index.html)
- **morphing-sphere** — [2807](./2807-morphing-sphere/index.html)
- **star-field-nav** — [2808](./2808-star-field-nav/index.html)
- **dna-helix-animation** — [2809](./2809-dna-helix-animation/index.html)
- **pendulum-wave** — [2810](./2810-pendulum-wave/index.html)
- **raymarch-sdf-scene** — [2811](./2811-raymarch-sdf-scene/index.html)
- **node-graph-visualizer** — [2812](./2812-node-graph-visualizer/index.html)
- **terrain-biome-gen** — [2813](./2813-terrain-biome-gen/index.html)
- **spring-physics** — [2814](./2814-spring-physics/index.html)
- **smoke-particle-sim** — [2815](./2815-smoke-particle-sim/index.html)
- **firework-burst** — [2816](./2816-firework-burst/index.html)
- **liquid-sim** — [2817](./2817-liquid-sim/index.html)

> 以下为由脚本自动生成的示例，每个类型收录最新版本，★ 表示该技术方向有多个版本。

- **3d-graph-visualization** — [350](./350-3d-graph-visualization/index.html) ★ (共2版)
- **3d-histogram** — [240](./240-3d-histogram/index.html)
- **abel-inversion** — [358](./358-abel-inversion/index.html) ★ (共2版)
- **advanced-skeletal-blend** — [240](./240-advanced-skeletal-blend/index.html)
- **afterimage-trails** — [91](./91-afterimage-trails/index.html)
- **animation-mixer** — [43](./43-animation-mixer/index.html)
- **ascii-effect** — [96](./96-ascii-effect/index.html)
- **atmospheric-scattering** — [193](./193-atmospheric-scattering/index.html)
- **audio-dsp-equalizer** — [340](./340-audio-dsp-equalizer/index.html) ★ (共2版)
- **audio-fft-visualizer** — [173](./173-audio-fft-visualizer/index.html)
- **audio-fingerprint** — [240](./240-audio-fingerprint/index.html)
- **audio-reactive** — [57](./57-audio-reactive/index.html)
- **audio-reactive-particles** — [2738](./2738-audio-reactive-particles/index.html) ★ (共10版)
- **audio-reactive-shader** — [339](./339-audio-reactive-shader/index.html)
- **audio-visualizer-3d** — [348](./348-audio-visualizer-3d/index.html)
- **audio-visualizer-reactive** — [286](./286-audio-visualizer-reactive/index.html)
- **audio-visualizer-webgl** — [192](./192-audio-visualizer-webgl/index.html)
- **audio-waveform** — [137](./137-audio-waveform/index.html)
- **aurora-borealis** — [75](./75-aurora-borealis/index.html)
- **billiards** — [140](./140-billiards/index.html)
- **black-hole-lensing** — [225](./225-black-hole-lensing/index.html)
- **blending-modes** — [17](./17-blending-modes/index.html)
- **bloom-postfx** — [29](./29-bloom-postfx/index.html)
- **bokeh-postfx** — [30](./30-bokeh-postfx/index.html)
- **boolean-geometry** — [58](./58-boolean-geometry/index.html)
- **bubble-pop** — [142](./142-bubble-pop/index.html)
- **camera-shake** — [54](./54-camera-shake/index.html)
- **camera-switch** — [41](./41-camera-switch/index.html)
- **camera-tween** — [42](./42-camera-tween/index.html)
- **canvas-texture** — [5](./05-canvas-texture/index.html)
- **car-physics** — [139](./139-car-physics/index.html)
- **character-controller** — [123](./123-character-controller/index.html)
- **clipping-planes** — [34](./34-clipping-planes/index.html)
- **cloth-flag** — [128](./128-cloth-flag/index.html)
- **cloth-physics** — [187](./187-cloth-physics/index.html)
- **cloth-simulation** — [67](./67-cloth-simulation/index.html)
- **convex-geometry** — [101](./101-convex-geometry/index.html)
- **crowd-simulation** — [184](./184-crowd-simulation/index.html)
- **crystal-gem** — [121](./121-crystal-gem/index.html)
- **crystal-growth** — [146](./146-crystal-growth/index.html)
- **crystal-lattice** — [221](./221-crystal-lattice/index.html)
- **csm-shadows** — [104](./104-csm-shadows/index.html)
- **css2d-labels** — [36](./36-css2d-labels/index.html)
- **css3d-cards** — [97](./97-css3d-cards/index.html)
- **cube-camera** — [28](./28-cube-camera/index.html)
- **curve-modifier** — [102](./102-curve-modifier/index.html)
- **curve-tube** — [12](./12-curve-tube/index.html)
- **custom-shader** — [19](./19-custom-shader/index.html)
- **data-bar-chart** — [119](./119-data-bar-chart/index.html)
- **decal** — [35](./35-decal/index.html)
- **diffraction-grating** — [296](./296-diffraction-grating/index.html)
- **diffusion-limited-aggregation** — [213](./213-diffusion-limited-aggregation/index.html)
- **dither-shader** — [138](./138-dither-shader/index.html)
- **dithered-transparency** — [70](./70-dithered-transparency/index.html)
- **dna-helix** — [202](./202-dna-helix/index.html)
- **domino-chain** — [147](./147-domino-chain/index.html)
- **drag-controls** — [38](./38-drag-controls/index.html)
- **dsp-audio-visualizer** — [241](./241-dsp-audio-visualizer/index.html)
- **earth-globe** — [112](./112-earth-globe/index.html)
- **ecosystem-sim** — [228](./228-ecosystem-sim/index.html)
- **edges-wireframe** — [49](./49-edges-wireframe/index.html)
- **electromagnetic-wave** — [359](./359-electromagnetic-wave/index.html)
- **environment-map** — [18](./18-environment-map/index.html)
- **extrude-shape** — [11](./11-extrude-shape/index.html)
- **fat-lines** — [48](./48-fat-lines/index.html)
- **film-grain** — [92](./92-film-grain/index.html)
- **fireflies-swarm** — [154](./154-fireflies-swarm/index.html)
- **fireworks** — [120](./120-fireworks/index.html)
- **first-person** — [40](./40-first-person/index.html)
- **flip-clock** — [134](./134-flip-clock/index.html)
- **fluid-dye** — [175](./175-fluid-dye/index.html)
- **fluid-fire** — [258](./258-fluid-fire/index.html)
- **fluid-shader** — [71](./71-fluid-shader/index.html)
- **fluid-shader-ink** — [335](./335-fluid-shader-ink/index.html) ★ (共2版)
- **fluid-shader-water** — [2736](./2736-fluid-shader-water/index.html) ★ (共10版)
- **fluid-sim** — [240](./240-fluid-sim/index.html) ★ (共2版)
- **fog-atmosphere** — [21](./21-fog-atmosphere/index.html)
- **force-graph** — [80](./80-force-graph/index.html)
- **fourier-series** — [274](./274-fourier-series/index.html)
- **fractal-mandelbrot** — [203](./203-fractal-mandelbrot/index.html)
- **fractal-tree** — [141](./141-fractal-tree/index.html)
- **fresnel-hologram** — [50](./50-fresnel-hologram/index.html)
- **galaxy** — [24](./24-galaxy/index.html)
- **galaxy-merger** — [239](./239-galaxy-merger/index.html)
- **game-of-life** — [73](./73-game-of-life/index.html)
- **generative-art-forest** — [256](./256-generative-art-forest/index.html)
- **geographic-heatmap** — [254](./254-geographic-heatmap/index.html)
- **geometry-material** — [2](./02-geometry-material/index.html)
- **geometry-merge** — [14](./14-geometry-merge/index.html)
- **glass-refraction** — [53](./53-glass-refraction/index.html)
- **glitch-postfx** — [95](./95-glitch-postfx/index.html)
- **gltf-loader** — [9](./09-gltf-loader/index.html)
- **gpu-particle-storm** — [303](./303-gpu-particle-storm/index.html)
- **gpu-particles** — [68](./68-gpu-particles/index.html)
- **gpu-particles-webgl** — [189](./189-gpu-particles-webgl/index.html)
- **gpu-ray-trace** — [288](./288-gpu-ray-trace/index.html)
- **graph-layout** — [200](./200-graph-layout/index.html) ★ (共2版)
- **gravitational-lensing** — [310](./310-gravitational-lensing/index.html) ★ (共2版)
- **grid-snap** — [108](./108-grid-snap/index.html)
- **gui-debug** — [44](./44-gui-debug/index.html)
- **hair-fur** — [90](./90-hair-fur/index.html)
- **halftone-postfx** — [93](./93-halftone-postfx/index.html)
- **heatmap-visualization** — [196](./196-heatmap-visualization/index.html)
- **hello-scene** — [1](./01-hello-scene/index.html)
- **holographic-audio** — [291](./291-holographic-audio/index.html)
- **holographic-comm** — [167](./167-holographic-comm/index.html)
- **holographic-display** — [74](./74-holographic-display/index.html)
- **holographic-interference** — [312](./312-holographic-interference/index.html)
- **holographic-shader** — [236](./236-holographic-shader/index.html)
- **holographic-ui** — [156](./156-holographic-ui/index.html)
- **ik-chain** — [191](./191-ik-chain/index.html)
- **instanced-mesh** — [20](./20-instanced-mesh/index.html)
- **interactive-piano** — [165](./165-interactive-piano/index.html)
- **interactive-water-fountain** — [290](./290-interactive-water-fountain/index.html)
- **isosurface** — [240](./240-isosurface/index.html)
- **kaleidoscope** — [155](./155-kaleidoscope/index.html)
- **kerning-glyph** — [277](./277-kerning-glyph/index.html)
- **kinect-pose** — [130](./130-kinect-pose/index.html)
- **kinematic-chain** — [356](./356-kinematic-chain/index.html)
- **knot-torus** — [344](./344-knot-torus/index.html) ★ (共2版)
- **koch-snowflake** — [276](./276-koch-snowflake/index.html)
- **lava-lamp** — [157](./157-lava-lamp/index.html)
- **lens-distortion** — [148](./148-lens-distortion/index.html)
- **lens-flare** — [76](./76-lens-flare/index.html)
- **lightning-effect** — [195](./195-lightning-effect/index.html)
- **lights-shadows** — [3](./03-lights-shadows/index.html)
- **loading-manager** — [10](./10-loading-manager/index.html)
- **lod** — [33](./33-lod/index.html)
- **lut-color-grading** — [99](./99-lut-color-grading/index.html)
- **magnetic-field** — [129](./129-magnetic-field/index.html)
- **magnetic-monopole** — [223](./223-magnetic-monopole/index.html)
- **marching-cubes** — [135](./135-marching-cubes/index.html) ★ (共2版)
- **marching-squares-contour** — [214](./214-marching-squares-contour/index.html)
- **mesh-fluid** — [275](./275-mesh-fluid/index.html)
- **mesh-surface-sampler** — [100](./100-mesh-surface-sampler/index.html)
- **mesh-wind-field** — [249](./249-mesh-wind-field/index.html)
- **metaballs** — [72](./72-metaballs/index.html)
- **mini-golf** — [160](./160-mini-golf/index.html)
- **mirror** — [27](./27-mirror/index.html)
- **mobius-strip** — [328](./328-mobius-strip/index.html)
- **molecular-dynamics** — [255](./255-molecular-dynamics/index.html)
- **morph-blob** — [171](./171-morph-blob/index.html)
- **morph-targets** — [16](./16-morph-targets/index.html)
- **morphing-blobs** — [118](./118-morphing-blobs/index.html)
- **motion-blur** — [180](./180-motion-blur/index.html)
- **music-visualizer-3d** — [216](./216-music-visualizer-3d/index.html)
- **neural-gas** — [266](./266-neural-gas/index.html)
- **neural-network** — [150](./150-neural-network/index.html)
- **neural-style-transfer** — [178](./178-neural-style-transfer/index.html)
- **node-material** — [188](./188-node-material/index.html)
- **noise-flow-field** — [78](./78-noise-flow-field/index.html)
- **obb-collision** — [105](./105-obb-collision/index.html)
- **ocean-waves** — [86](./86-ocean-waves/index.html)
- **orbit-controls** — [7](./07-orbit-controls/index.html)
- **origami-crane** — [152](./152-origami-crane/index.html)
- **outline-selection** — [31](./31-outline-selection/index.html)
- **packing-spheres** — [211](./211-packing-spheres/index.html)
- **parallax-mapping** — [85](./85-parallax-mapping/index.html)
- **parallax-scene** — [143](./143-parallax-scene/index.html)
- **particle-attractor** — [170](./170-particle-attractor/index.html) ★ (共2版)
- **particle-beam** — [309](./309-particle-beam/index.html) ★ (共2版)
- **particle-constellation** — [283](./283-particle-constellation/index.html)
- **particle-physics** — [234](./234-particle-physics/index.html)
- **particle-sandbox** — [271](./271-particle-sandbox/index.html)
- **particle-sandglider** — [331](./331-particle-sandglider/index.html) ★ (共2版)
- **particle-sandpile** — [343](./343-particle-sandpile/index.html) ★ (共2版)
- **particle-sandstorm** — [313](./313-particle-sandstorm/index.html) ★ (共2版)
- **particle-settling** — [354](./354-particle-settling/index.html)
- **particle-sph** — [279](./279-particle-sph/index.html)
- **particle-storm** — [260](./260-particle-storm/index.html)
- **particle-texture** — [158](./158-particle-texture/index.html)
- **particle-trails** — [194](./194-particle-trails/index.html)
- **particle-vortex** — [2741](./2741-particle-vortex/index.html) ★ (共10版)
- **particles** — [23](./23-particles/index.html)
- **path-recorder** — [107](./107-path-recorder/index.html)
- **peppers-ghost** — [98](./98-peppers-ghost/index.html)
- **performance-gpu-batching** — [257](./257-performance-gpu-batching/index.html)
- **perlin-flowmap** — [222](./222-perlin-flowmap/index.html)
- **physics** — [45](./45-physics/index.html)
- **physics-pendulum** — [164](./164-physics-pendulum/index.html)
- **physics-rigid-stack** — [253](./253-physics-rigid-stack/index.html)
- **pinball-machine** — [144](./144-pinball-machine/index.html)
- **ping-pong-physics** — [207](./207-ping-pong-physics/index.html)
- **planck-scale-universe** — [215](./215-planck-scale-universe/index.html)
- **plasma-ball** — [341](./341-plasma-ball/index.html) ★ (共2版)
- **plasma-physics** — [219](./219-plasma-physics/index.html)
- **portal-door** — [125](./125-portal-door/index.html)
- **portal-portal** — [177](./177-portal-portal/index.html)
- **portal-sphere** — [267](./267-portal-sphere/index.html)
- **portal-wormhole** — [64](./64-portal-wormhole/index.html)
- **procedural-architecture** — [337](./337-procedural-architecture/index.html) ★ (共2版)
- **procedural-bonsai** — [292](./292-procedural-bonsai/index.html)
- **procedural-canyon** — [235](./235-procedural-canyon/index.html)
- **procedural-city** — [183](./183-procedural-city/index.html) ★ (共2版)
- **procedural-clouds** — [166](./166-procedural-clouds/index.html)
- **procedural-clouds-volumetric** — [281](./281-procedural-clouds-volumetric/index.html)
- **procedural-coral** — [220](./220-procedural-coral/index.html)
- **procedural-crystal** — [208](./208-procedural-crystal/index.html)
- **procedural-fire** — [197](./197-procedural-fire/index.html)
- **procedural-lava** — [289](./289-procedural-lava/index.html)
- **procedural-planet** — [190](./190-procedural-planet/index.html)
- **procedural-planet-erosion** — [244](./244-procedural-planet-erosion/index.html)
- **procedural-terrain-biomes** — [349](./349-procedural-terrain-biomes/index.html) ★ (共2版)
- **procedural-terrain-erosion** — [285](./285-procedural-terrain-erosion/index.html)
- **procedural-terrain-lod** — [2737](./2737-procedural-terrain-lod/index.html) ★ (共10版)
- **procedural-tree** — [110](./110-procedural-tree/index.html)
- **puzzle-3d-slab** — [204](./204-puzzle-3d-slab/index.html)
- **puzzle-swap** — [136](./136-puzzle-swap/index.html)
- **qr-code-3d** — [116](./116-qr-code-3d/index.html)
- **quantum-circuit** — [240](./240-quantum-circuit/index.html)
- **quantum-entanglement** — [218](./218-quantum-entanglement/index.html)
- **quantum-viz** — [185](./185-quantum-viz/index.html)
- **quantum-wave-function** — [295](./295-quantum-wave-function/index.html)
- **qubit-viz** — [168](./168-qubit-viz/index.html)
- **rain-system** — [89](./89-rain-system/index.html)
- **ray-marching** — [59](./59-ray-marching/index.html)
- **raycaster** — [8](./08-raycaster/index.html)
- **reaction-diffusion** — [231](./231-reaction-diffusion/index.html)
- **reaction-diffusion-turing** — [357](./357-reaction-diffusion-turing/index.html)
- **render-target** — [32](./32-render-target/index.html)
- **rgb-shift-postfx** — [94](./94-rgb-shift-postfx/index.html)
- **rope-bridge** — [149](./149-rope-bridge/index.html)
- **rorschach-inkblot** — [347](./347-rorschach-inkblot/index.html) ★ (共2版)
- **rubiks-cube** — [113](./113-rubiks-cube/index.html)
- **sand-simulation** — [199](./199-sand-simulation/index.html)
- **sdf-boolean** — [287](./287-sdf-boolean/index.html)
- **sdf-garden** — [227](./227-sdf-garden/index.html)
- **sdf-raymarcher** — [174](./174-sdf-raymarcher/index.html)
- **sdf-raymarcher-advanced** — [284](./284-sdf-raymarcher-advanced/index.html)
- **sdf-raymarching-scene** — [351](./351-sdf-raymarching-scene/index.html) ★ (共2版)
- **sdf-sculptor** — [131](./131-sdf-sculptor/index.html)
- **sdf-spheres** — [2742](./2742-sdf-spheres/index.html) ★ (共10版)
- **shader-confetti** — [346](./346-shader-confetti/index.html) ★ (共2版)
- **shader-graph-visualizer** — [212](./212-shader-graph-visualizer/index.html)
- **shader-kaleidoscope** — [2740](./2740-shader-kaleidoscope/index.html) ★ (共10版)
- **shader-playground** — [111](./111-shader-playground/index.html)
- **shader-water-caustic** — [282](./282-shader-water-caustic/index.html)
- **shadow-mapping** — [55](./55-shadow-mapping/index.html)
- **shooting-gallery** — [114](./114-shooting-gallery/index.html)
- **simplify-modifier** — [103](./103-simplify-modifier/index.html)
- **skeletal-animation-blend** — [237](./237-skeletal-animation-blend/index.html)
- **skeletal-rig** — [293](./293-skeletal-rig/index.html)
- **sky-water** — [22](./22-sky-water/index.html)
- **skybox-procedural** — [243](./243-skybox-procedural/index.html)
- **smoke-fire** — [63](./63-smoke-fire/index.html)
- **snow-accumulation** — [66](./66-snow-accumulation/index.html)
- **snow-globe** — [151](./151-snow-globe/index.html)
- **snowflake-crystal-generator** — [247](./247-snowflake-crystal-generator/index.html)
- **snowflake-generator** — [334](./334-snowflake-generator/index.html) ★ (共2版)
- **soap-bubble** — [342](./342-soap-bubble/index.html) ★ (共2版)
- **soft-body** — [84](./84-soft-body/index.html)
- **soft-body-cloth** — [352](./352-soft-body-cloth/index.html) ★ (共2版)
- **soft-body-cloth-sim** — [2739](./2739-soft-body-cloth-sim/index.html) ★ (共10版)
- **soft-body-cube** — [263](./263-soft-body-cube/index.html)
- **soft-body-physics** — [338](./338-soft-body-physics/index.html)
- **soft-body-water** — [262](./262-soft-body-water/index.html)
- **solar-system** — [77](./77-solar-system/index.html) ★ (共2版)
- **solar-system-3d** — [205](./205-solar-system-3d/index.html)
- **solar-system-orbits** — [115](./115-solar-system-orbits/index.html)
- **sound-reactive-particles** — [258](./258-sound-reactive-particles/index.html)
- **sound-visualizer** — [88](./88-sound-visualizer/index.html)
- **space-debris** — [153](./153-space-debris/index.html)
- **spatial-hash** — [240](./240-spatial-hash/index.html)
- **spatial-hash-grid** — [240](./240-spatial-hash-grid/index.html)
- **spherical-harmonics** — [273](./273-spherical-harmonics/index.html)
- **spherical-harmonics-lighting** — [329](./329-spherical-harmonics-lighting/index.html)
- **spherical-mesh-deformation** — [246](./246-spherical-mesh-deformation/index.html)
- **spiral-galaxy** — [159](./159-spiral-galaxy/index.html)
- **splat-paint** — [145](./145-splat-paint/index.html)
- **spline-editor** — [206](./206-spline-editor/index.html)
- **spline-interp** — [240](./240-spline-interp/index.html)
- **spline-interpolation** — [240](./240-spline-interpolation/index.html)
- **spline-railroad** — [332](./332-spline-railroad/index.html) ★ (共2版)
- **spline-road** — [124](./124-spline-road/index.html)
- **splines-animation** — [83](./83-splines-animation/index.html)
- **spring-lattice** — [278](./278-spring-lattice/index.html)
- **sprite-animation** — [61](./61-sprite-animation/index.html)
- **sprites-billboards** — [37](./37-sprites-billboards/index.html)
- **ssao-postfx** — [52](./52-ssao-postfx/index.html)
- **sss-skin** — [186](./186-sss-skin/index.html)
- **stellar-collision** — [133](./133-stellar-collision/index.html)
- **string-theory** — [224](./224-string-theory/index.html)
- **subsurface-scatter** — [182](./182-subsurface-scatter/index.html)
- **surface-tension-fluid** — [245](./245-surface-tension-fluid/index.html)
- **sushi-plate** — [161](./161-sushi-plate/index.html)
- **terrain-blend** — [81](./81-terrain-blend/index.html)
- **terrain-carver** — [127](./127-terrain-carver/index.html)
- **terrain-erosion** — [176](./176-terrain-erosion/index.html) ★ (共2版)
- **terrain-flythrough** — [56](./56-terrain-flythrough/index.html)
- **terrain-hydraulic-erosion** — [268](./268-terrain-hydraulic-erosion/index.html)
- **terrain-lod** — [259](./259-terrain-lod/index.html)
- **terrain-perlin** — [25](./25-terrain-perlin/index.html)
- **tesseract-hypercube** — [210](./210-tesseract-hypercube/index.html)
- **text-geometry** — [13](./13-text-geometry/index.html)
- **textures** — [4](./04-textures/index.html)
- **time-dilation** — [169](./169-time-dilation/index.html)
- **toon-shading** — [47](./47-toon-shading/index.html)
- **topological-data-analysis** — [217](./217-topological-data-analysis/index.html)
- **topological-mesh** — [240](./240-topological-mesh/index.html)
- **transform-controls** — [39](./39-transform-controls/index.html)
- **vector-field-3d** — [277](./277-vector-field-3d/index.html)
- **vertex-animation** — [15](./15-vertex-animation/index.html)
- **video-texture** — [6](./06-video-texture/index.html)
- **virtual-joystick** — [106](./106-virtual-joystick/index.html)
- **volumetric-cloud** — [163](./163-volumetric-cloud/index.html)
- **volumetric-fog** — [179](./179-volumetric-fog/index.html)
- **volumetric-light** — [60](./60-volumetric-light/index.html)
- **volumetric-smoke** — [238](./238-volumetric-smoke/index.html)
- **voronoi-diagram** — [201](./201-voronoi-diagram/index.html)
- **voronoi-shatter** — [126](./126-voronoi-shatter/index.html)
- **voronoi-shattering** — [261](./261-voronoi-shattering/index.html)
- **voxel-carving-terrain** — [259](./259-voxel-carving-terrain/index.html)
- **voxel-character** — [87](./87-voxel-character/index.html)
- **voxel-city-builder** — [2735](./2735-voxel-city-builder/index.html) ★ (共10版)
- **voxel-editor** — [109](./109-voxel-editor/index.html)
- **voxel-extrusion-font** — [360](./360-voxel-extrusion-font/index.html)
- **voxel-fracture** — [172](./172-voxel-fracture/index.html)
- **voxel-maze-generator** — [333](./333-voxel-maze-generator/index.html) ★ (共2版)
- **voxel-painter** — [270](./270-voxel-painter/index.html)
- **voxel-terrain** — [62](./62-voxel-terrain/index.html)
- **water-caustics** — [181](./181-water-caustics/index.html)
- **water-ripple** — [65](./65-water-ripple/index.html)
- **water-surface-raymarching** — [330](./330-water-surface-raymarching/index.html)
- **wave-collapse** — [162](./162-wave-collapse/index.html)
- **wave-function-collapse-3d** — [209](./209-wave-function-collapse-3d/index.html)
- **wave-interference** — [117](./117-wave-interference/index.html)
- **wave-particle** — [272](./272-wave-particle/index.html)
- **wave-pendulum** — [345](./345-wave-pendulum/index.html) ★ (共2版)
- **wave-surface** — [269](./269-wave-surface/index.html)
- **weather-system** — [229](./229-weather-system/index.html)
- **webgpu-renderer** — [336](./336-webgpu-renderer/index.html)
- **webxr-grab** — [280](./280-webxr-grab/index.html)
- **webxr-hand-tracking** — [304](./304-webxr-hand-tracking/index.html)
- **webxr-vr** — [226](./226-webxr-vr/index.html)
- **wind-erosion-terrain** — [353](./353-wind-erosion-terrain/index.html)
- **wireframe-world** — [82](./82-wireframe-world/index.html)
- **world-painter** — [294](./294-world-painter/index.html)

- **chaos-attractor** — [3317](./3317-chaos-attractor/index.html)
- **em-wave-propagation** — [3318](./3318-em-wave-propagation/index.html)
- **julia-fractal** — [3321](./3321-julia-fractal/index.html)
- **polarized-light** — [3322](./3322-polarized-light/index.html)
- **double-helix** — [3323](./3323-double-helix/index.html)
- **topology** — [3324](./3324-topology/index.html)
- **rossler-attractor** — [3325](./3325-rossler-attractor/index.html)

## 三十三、自动生成示例（3419~3425）

| # | 章节 | 技术点 |
|---|------|-------|
| [3419](./3419-agent-based-schelling-segregation/index.html) | **Schelling隔离模型 ★** | 元胞自动机种族隔离、阈值驱动的空间分离、lil-gui参数调节 |
| [3420](./3420-interactive-physics-lab/index.html) | **交互物理实验室 ★** | 抛体运动/单摆/弹簧振子、实时轨迹图、lil-gui参数调节 |
| [3421](./3421-abstract-expressionism-pollock/index.html) | **波洛克抽象表现主义 ★** | Verlet滴落物理、颜料飞溅画布、点击交互绘制 |
| [3422](./3422-lattice-gas-automaton-fhp/index.html) | **格子气自动机 FHP ★** | 六角网格流体、碰撞传播规则、障碍物流场可视化 |
| [3423](./3423-boolean-logic-propagation/index.html) | **布尔逻辑电路 ★** | 交互逻辑门、信号传播延迟、真值表显示 |
| [3424](./3424-procedural-calligraphy/index.html) | **程序化书法 ★** | 弹簧毛笔物理、墨水晕染、康熙永字八法 |
| [3425](./3425-pcr-gel-electrophoresis/index.html) | **PCR凝胶电泳 ★** | DNA片段电场驱动、凝胶条带、紫外线荧光可视化 |

## 三十四、RTS与游戏系统（3121~3122）

| # | 章节 | 技术点 |
|---|------|-------|
| [3117](./3117-finite-state-machine-npc/index.html) | **FSM NPC AI ★** | 有限状态机、巡逻/追击/攻击/逃跑状态切换、发光指示环 |
| [3118](./3118-astar-pathfinding-3d/index.html) | **A* 寻路 3D ★** | A*算法可视化、最小堆优先队列、对角移动、启发式高度惩罚 |
| [3119](./3119-match3-puzzle-game/index.html) | **Match-3 益智 ★** | 宝石交换、连锁消除、级联combo、爆炸粒子特效 |
| [3120](./3120-dungeon-procedural-generator/index.html) | **程序化地下城 ★** | BSP空间分割、房间生成、走廊连接、程序化火把 |
| [3121](./3121-rts-unit-selection-prototype/index.html) | **RTS单位选择原型 ★** | 拖拽框选、单位分组、移动指令、攻击指令、右键菜单 |
| [3122](./3122-tetris-3d/index.html) | **3D 俄罗斯方块 ★** | 3D版俄罗斯方块、三维旋转、整行消除、幽灵块预览 |

## 附录：新增示例索引

- **finite-state-machine-npc** — [3117](./3117-finite-state-machine-npc/index.html)
- **astar-pathfinding-3d** — [3118](./3118-astar-pathfinding-3d/index.html)
- **match3-puzzle-game** — [3119](./3119-match3-puzzle-game/index.html)
- **dungeon-procedural-generator** — [3120](./3120-dungeon-procedural-generator/index.html)
- **rts-unit-selection-prototype** — [3121](./3121-rts-unit-selection-prototype/index.html)
- **tetris-3d** — [3122](./3122-tetris-3d/index.html)

- **holographic-interferometry-wavefront** — [3792](./3792-holographic-interferometry-wavefront/index.html)
- **lattice-gauge-theory-qcd** — [3793](./3793-lattice-gauge-theory-qcd/index.html)
- **vascular-network-morphogenesis** — [3794](./3794-vascular-network-morphogenesis/index.html)
- **magnus-effect-ballistics** — [3795](./3795-magnus-effect-ballistics/index.html)
- **bose-einstein-condensate-matter-wave** — [3796](./3796-bose-einstein-condensate-matter-wave/index.html)
- **coanda-effect-fluid-attachment** — [3797](./3797-coanda-effect-fluid-attachment/index.html)
