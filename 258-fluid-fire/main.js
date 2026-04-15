import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

        // ============================================================
        // 场景初始化
        // ============================================================
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050505); // 深黑背景突出火焰
        scene.fog = new THREE.FogExp2(0x050505, 0.04); // 远处轻微雾化增加深度感

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 3, 8);
        camera.lookAt(0, 2, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.appendChild(renderer.domElement);

        // 轨道控制器：鼠标拖拽旋转、滚轮缩放、右键平移
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 3;
        controls.maxDistance = 20;
        controls.target.set(0, 1.5, 0);

        // ============================================================
        // GUI 参数控制面板
        // ============================================================
        const params = {
            particleCount: 3000,  // 粒子总数
            intensity: 1.0,       // 火焰强度（影响高度、扩散、亮度）
            spread: 1.0,          // 水平扩散范围
            turbulence: 1.0,      // 湍流强度
            baseSpeed: 1.0,       // 火焰上升速度倍率
            pointSize: 1.0,      // 粒子基础大小倍率
        };

        const gui = new GUI({ title: '🔥 火焰参数控制' });
        gui.add(params, 'particleCount', 500, 8000, 100).name('粒子数量').onChange(rebuildFire);
        gui.add(params, 'intensity', 0.2, 2.0, 0.1).name('火焰强度');
        gui.add(params, 'spread', 0.2, 2.0, 0.1).name('扩散范围');
        gui.add(params, 'turbulence', 0.0, 2.0, 0.1).name('湍流强度');
        gui.add(params, 'baseSpeed', 0.2, 3.0, 0.1).name('上升速度');
        gui.add(params, 'pointSize', 0.3, 2.0, 0.1).name('粒子大小');

        // ============================================================
        // 火焰粒子系统
        // ============================================================
        let fireGeometry, fireMaterial, firePoints;
        let clock = new THREE.Clock();

        // 火焰爆发数据（鼠标点击产生）
        const bursts = [];

        function createFire() {
            const count = params.particleCount;

            // 几何体：粒子初始分布在地面小圆范围内
            const positions = new Float32Array(count * 3);
            const scales = new Float32Array(count);
            const seeds = new Float32Array(count);
            const lifetimes = new Float32Array(count);
            const speeds = new Float32Array(count);

            for (let i = 0; i < count; i++) {
                // 初始位置：在地面 xz 平面的小圆内随机分布
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 0.3;
                positions[i * 3 + 0] = Math.cos(angle) * radius;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = Math.sin(angle) * radius;

                scales[i] = 0.5 + Math.random() * 1.5;          // 粒子大小差异
                seeds[i] = Math.random();                        // 噪声采样种子
                lifetimes[i] = Math.random();                    // 错开生命周期相位
                speeds[i] = 0.7 + Math.random() * 0.6;          // 上升速度差异
            }

            fireGeometry = new THREE.BufferGeometry();
            fireGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            fireGeometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
            fireGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
            fireGeometry.setAttribute('aLifetime', new THREE.BufferAttribute(lifetimes, 1));
            fireGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

            // 材质：自定义着色器 + 加法混合产生发光叠加效果
            fireMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: { value: 0 },
                    uIntensity: { value: params.intensity },
                    uPixelRatio: { value: renderer.getPixelRatio() },
                },
                vertexShader: document.getElementById('vertexShader').textContent,
                fragmentShader: document.getElementById('fragmentShader').textContent,
                transparent: true,
                blending: THREE.AdditiveBlending,   // 加法混合：火焰叠加更亮
                depthWrite: false,                   // 不写入深度缓冲
                depthTest: true,
            });

            firePoints = new THREE.Points(fireGeometry, fireMaterial);
            scene.add(firePoints);
        }

        function rebuildFire() {
            scene.remove(firePoints);
            fireGeometry.dispose();
            fireMaterial.dispose();
            createFire();
        }

        createFire();

        // ============================================================
        // 鼠标点击生成火焰爆发效果
        // ============================================================
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // 虚拟地面平面，用于射线检测落点
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        renderer.domElement.addEventListener('click', (event) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersectPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(groundPlane, intersectPoint);

            // 在点击位置生成一个火焰爆发事件
            bursts.push({
                position: intersectPoint.clone(),
                time: 0,
                duration: 1.5,  // 爆发持续时间（秒）
                strength: 1.0,
            });
        });

        // ============================================================
        // 地面网格（辅助参考，非必需）
        // ============================================================
        const gridHelper = new THREE.GridHelper(20, 20, 0x222222, 0x111111);
        gridHelper.position.y = -0.01;
        scene.add(gridHelper);

        // 微弱的点光源，防止场景全黑（仅辅助可视化，火焰本身是自发光）
        const ambientLight = new THREE.AmbientLight(0x111111);
        scene.add(ambientLight);

        // ============================================================
        // 动画循环
        // ============================================================
        function animate() {
            requestAnimationFrame(animate);

            const elapsed = clock.getElapsedTime();
            const delta = clock.getDelta();

            // 更新着色器时间uniform
            if (fireMaterial) {
                fireMaterial.uniforms.uTime.value = elapsed * params.baseSpeed;
                fireMaterial.uniforms.uIntensity.value = params.intensity;
            }

            // 更新爆发效果（为简单起见，通过额外几何体实现）
            // 这里我们可以动态调整 fireGeometry 中部分粒子的位置
            // 简化处理：爆发时整体强度提升
            let burstIntensity = 0;
            for (let i = bursts.length - 1; i >= 0; i--) {
                bursts[i].time += 0.016; // 约 60fps
                if (bursts[i].time > bursts[i].duration) {
                    bursts.splice(i, 1);
                } else {
                    const t = bursts[i].time / bursts[i].duration;
                    burstIntensity += Math.sin(t * Math.PI) * bursts[i].strength;
                }
            }

            // 临时增强强度模拟爆发感
            if (burstIntensity > 0 && fireMaterial) {
                fireMaterial.uniforms.uIntensity.value = params.intensity * (1.0 + burstIntensity * 2.0);
            }

            controls.update();
            renderer.render(scene, camera);
        }

        animate();

        // ============================================================
        // 响应窗口大小变化
        // ============================================================
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            if (fireMaterial) {
                fireMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
            }
        });