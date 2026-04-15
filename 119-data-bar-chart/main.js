import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
        import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

        // ─── Data ───────────────────────────────────────────────────────────────
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const FULL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

        let chartData = MONTHS.map((m, i) => ({
            month: m,
            fullMonth: FULL_MONTHS[i],
            value: Math.floor(Math.random() * 80) + 20 + Math.sin(i * 0.8) * 15 + 30,
            index: i
        }));

        const maxDataValue = Math.max(...chartData.map(d => d.value));
        const totalValue = chartData.reduce((s, d) => s + d.value, 0);

        // ─── Config ─────────────────────────────────────────────────────────────
        const config = {
            barCount: 12,
            colorScheme: 'heat',
            animationMode: 'pulse',
            showLabels: true,
            animationSpeed: 1.0,
            pulseAmount: 0.04,
            cameraHeight: 2.0,
            barGap: 0.15
        };

        // ─── Color Schemes ──────────────────────────────────────────────────────
        const colorSchemes = {
            heat: (t) => {
                if (t < 0.5) return new THREE.Color().lerpColors(new THREE.Color(0x1e3a5f), new THREE.Color(0xe63946), t * 2);
                return new THREE.Color().lerpColors(new THREE.Color(0xe63946), new THREE.Color(0xffd166), (t - 0.5) * 2);
            },
            ocean: (t) => {
                return new THREE.Color().lerpColors(new THREE.Color(0x023e8a), new THREE.Color(0x00b4d8), t);
            },
            rainbow: (t) => {
                const c = new THREE.Color();
                c.setHSL(t * 0.8, 0.85, 0.55);
                return c;
            },
            forest: (t) => {
                return new THREE.Color().lerpColors(new THREE.Color(0x2d6a4f), new THREE.Color(0x95d5b2), t);
            },
            purple: (t) => {
                return new THREE.Color().lerpColors(new THREE.Color(0x3c096c), new THREE.Color(0xe0aaff), t);
            }
        };

        // ─── Scene Setup ────────────────────────────────────────────────────────
        const container = document.getElementById('canvas-container');
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0d1117);
        scene.fog = new THREE.FogExp2(0x0d1117, 0.018);

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(6, config.cameraHeight * 3, 8);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        container.appendChild(renderer.domElement);

        const labelRenderer = new CSS2DRenderer();
        labelRenderer.setSize(window.innerWidth, window.innerHeight);
        labelRenderer.dom.style.position = 'absolute';
        labelRenderer.dom.style.top = '0';
        labelRenderer.dom.style.pointerEvents = 'none';
        labelRenderer.dom.style.fontFamily = 'Inter, sans-serif';
        container.appendChild(labelRenderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.minDistance = 4;
        controls.maxDistance = 25;
        controls.maxPolarAngle = Math.PI / 2.1;
        controls.target.set(0, 0.5, 0);

        // ─── Lighting ──────────────────────────────────────────────────────────
        const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -15;
        dirLight.shadow.camera.right = 15;
        dirLight.shadow.camera.top = 15;
        dirLight.shadow.camera.bottom = -15;
        dirLight.shadow.bias = -0.001;
        scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
        fillLight.position.set(-5, 3, -5);
        scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xff8844, 0.2);
        rimLight.position.set(0, 5, -8);
        scene.add(rimLight);

        // ─── Floor & Grid ───────────────────────────────────────────────────────
        const floorGeo = new THREE.PlaneGeometry(30, 30);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x161b22,
            roughness: 0.9,
            metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.01;
        floor.receiveShadow = true;
        scene.add(floor);

        const gridHelper = new THREE.GridHelper(20, 20, 0x21262d, 0x21262d);
        gridHelper.position.y = 0;
        scene.add(gridHelper);

        // subtle glow plane
        const glowGeo = new THREE.PlaneGeometry(16, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x0a1628,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
        });
        const glowPlane = new THREE.Mesh(glowGeo, glowMat);
        glowPlane.rotation.x = -Math.PI / 2;
        glowPlane.position.y = 0.005;
        scene.add(glowPlane);

        // ─── Bar Group ─────────────────────────────────────────────────────────
        const barGroup = new THREE.Group();
        scene.add(barGroup);

        const labelGroup = new THREE.Group();
        scene.add(labelGroup);

        let bars = [];
        let barAnimStates = [];

        function buildBars() {
            // clear existing
            while (barGroup.children.length > 0) {
                const child = barGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
                barGroup.remove(child);
            }
            while (labelGroup.children.length > 0) {
                labelGroup.remove(labelGroup.children[0]);
            }
            bars = [];
            barAnimStates = [];

            const count = config.barCount;
            const visibleData = chartData.slice(0, count);
            const maxVal = Math.max(...visibleData.map(d => d.value));

            const totalWidth = 10;
            const barWidth = (totalWidth / count) * (1 - config.barGap);
            const spacing = totalWidth / count;

            visibleData.forEach((data, i) => {
                const normalizedValue = data.value / maxVal;
                const t = normalizedValue;

                // bar geometry
                const geo = new THREE.BoxGeometry(barWidth * 0.85, 1, barWidth * 0.85);
                const colorFn = colorSchemes[config.colorScheme] || colorSchemes.heat;
                const color = colorFn(t);

                const mat = new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: 0.3,
                    metalness: 0.4,
                    envMapIntensity: 0.8
                });

                const bar = new THREE.Mesh(geo, mat);
                bar.castShadow = true;
                bar.receiveShadow = true;
                bar.userData = {
                    data: data,
                    normalizedValue: normalizedValue,
                    targetHeight: normalizedValue * 4 + 0.1,
                    baseColor: color.clone(),
                    index: i,
                    selected: false,
                    phase: i * 0.3
                };

                const xPos = (i - (count - 1) / 2) * spacing;
                bar.position.set(xPos, 0.05, 0);
                bar.scale.y = 0.001;

                barGroup.add(bar);
                bars.push(bar);

                barAnimStates.push({
                    currentHeight: 0,
                    targetHeight: bar.userData.targetHeight,
                    velocity: 0,
                    enterDelay: i * 0.06,
                    entered: false
                });

                // bar label (CSS2D)
                if (config.showLabels) {
                    const labelDiv = document.createElement('div');
                    labelDiv.style.cssText = `
                        font-size: 11px; color: #8b949e; font-weight: 500;
                        font-family: Inter, sans-serif; pointer-events: none;
                        text-align: center; white-space: nowrap;
                        text-shadow: 0 1px 4px rgba(0,0,0,0.8);
                    `;
                    labelDiv.textContent = data.month;
                    const label = new CSS2DObject(labelDiv);
                    label.position.set(xPos, -0.3, 0);
                    labelGroup.add(label);
                }

                // value label above bar
                const valueDiv = document.createElement('div');
                valueDiv.style.cssText = `
                    font-size: 12px; color: #e6edf3; font-weight: 600;
                    font-family: Inter, sans-serif; pointer-events: none;
                    text-align: center; white-space: nowrap;
                    text-shadow: 0 1px 6px rgba(0,0,0,0.9);
                `;
                valueDiv.textContent = data.value;
                valueDiv.style.display = 'none';
                const valueLabel = new CSS2DObject(valueDiv);
                valueLabel.position.set(xPos, 0.5, 0);
                valueLabel.name = 'valueLabel';
                labelGroup.add(valueLabel);
            });

            updateLegend(maxVal);
            updateStats();
        }

        buildBars();

        // ─── Legend ─────────────────────────────────────────────────────────────
        function updateLegend(maxVal) {
            const canvas = document.getElementById('legend-canvas');
            const ctx = canvas.getContext('2d');
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            const steps = 20;

            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const colorFn = colorSchemes[config.colorScheme] || colorSchemes.heat;
                const c = colorFn(t);
                const r = Math.round(c.r * 255);
                const g = Math.round(c.g * 255);
                const b = Math.round(c.b * 255);
                gradient.addColorStop(t, `rgb(${r},${g},${b})`);
            }

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            document.getElementById('legend-min').textContent = '0';
            document.getElementById('legend-max').textContent = Math.round(maxVal);
        }

        // ─── Stats ──────────────────────────────────────────────────────────────
        function updateStats() {
            const visibleData = chartData.slice(0, config.barCount);
            const total = visibleData.reduce((s, d) => s + d.value, 0);
            const avg = Math.round(total / visibleData.length);
            const peak = Math.max(...visibleData.map(d => d.value));
            document.getElementById('stat-total').textContent = total.toLocaleString();
            document.getElementById('stat-avg').textContent = avg.toLocaleString();
            document.getElementById('stat-peak').textContent = peak.toLocaleString();
        }

        // ─── Raycasting ─────────────────────────────────────────────────────────
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredBar = null;
        let selectedBar = null;

        function onMouseMove(event) {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(bars);

            if (hoveredBar && hoveredBar !== selectedBar) {
                if (!hoveredBar.userData.selected) {
                    hoveredBar.material.emissive.setHex(0x111122);
                }
            }

            if (intersects.length > 0) {
                const bar = intersects[0].object;
                if (!bar.userData.selected) {
                    bar.material.emissive.setHex(0x222244);
                }
                hoveredBar = bar;
                document.body.style.cursor = 'pointer';

                // tooltip
                const tt = document.getElementById('tooltip');
                const d = bar.userData.data;
                document.getElementById('tt-month').textContent = d.fullMonth;
                document.getElementById('tt-value').textContent = d.value.toLocaleString();
                const pct = ((d.value / maxDataValue) * 100).toFixed(0);
                document.getElementById('tt-detail').innerHTML =
                    `<span class="tt-color" style="background:#${bar.userData.baseColor.getHexString()}"></span>` +
                    `${pct}% of peak · Rank #${d.index + 1}`;
                tt.style.display = 'block';
                tt.style.left = (event.clientX + 16) + 'px';
                tt.style.top = (event.clientY - 10) + 'px';
            } else {
                hoveredBar = null;
                document.body.style.cursor = 'default';
                document.getElementById('tooltip').style.display = 'none';
            }
        }

        function onClick(event) {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(bars);

            if (intersects.length > 0) {
                const bar = intersects[0].object;
                selectBar(bar, event);
            } else {
                deselectAll();
            }
        }

        function selectBar(bar, event) {
            deselectAll(false);

            selectedBar = bar;
            bar.userData.selected = true;
            bar.material.emissive.setHex(0x334466);

            const d = bar.userData.data;
            const sbi = document.getElementById('selected-bar-info');
            document.getElementById('sbi-month').textContent = d.fullMonth;
            document.getElementById('sbi-value').textContent = d.value.toLocaleString();
            const pct = ((d.value / totalValue) * 100).toFixed(1);
            document.getElementById('sbi-percent').textContent = `${pct}% of annual total`;
            sbi.classList.add('visible');
        }

        function deselectAll(closeInfo = true) {
            if (selectedBar) {
                selectedBar.userData.selected = false;
                selectedBar.material.emissive.setHex(0x000000);
                selectedBar = null;
            }
            if (closeInfo) {
                document.getElementById('selected-bar-info').classList.remove('visible');
            }
        }

        window.hideSelectedInfo = function() {
            document.getElementById('selected-bar-info').classList.remove('visible');
            deselectAll(false);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('click', onClick);

        // ─── GUI ────────────────────────────────────────────────────────────────
        const gui = new GUI({ title: 'Chart Controls', width: 220 });
        gui.domElement.style.fontFamily = 'Inter, sans-serif';

        const style = document.createElement('style');
        style.textContent = `
            .lil-gui { --background-color: rgba(22,27,34,0.95) !important; --text-color: #e6edf3 !important;
                --title-background-color: rgba(88,166,255,0.15) !important; --title-text-color: #58a6ff !important;
                --widget-color: #21262d !important; --hover-color: #30363d !important;
                --focus-color: #388bfd !important; --number-color: #58a6ff !important;
                --string-color: #a5d6ff !important; border: 1px solid rgba(48,54,61,0.8) !important;
                border-radius: 10px !important; backdrop-filter: blur(12px) !important; }
            .lil-gui .title { font-weight: 600 !important; letter-spacing: 0.3px !important; }
        `;
        document.head.appendChild(style);

        gui.add(config, 'animationMode', { 'None': 'none', 'Pulse': 'pulse', 'Wave': 'wave', 'Random': 'random' })
            .name('Animation').onChange(v => {
                document.getElementById('stat-mode').textContent = v.charAt(0).toUpperCase() + v.slice(1);
            });

        gui.add(config, 'colorScheme', { 'Heat': 'heat', 'Ocean': 'ocean', 'Rainbow': 'rainbow', 'Forest': 'forest', 'Purple': 'purple' })
            .name('Color Scheme').onChange(v => {
                document.getElementById('stat-scheme').textContent = v.charAt(0).toUpperCase() + v.slice(1);
                rebuildBarColors();
            });

        gui.add(config, 'barCount', { '6': 6, '8': 8, '12': 12 }).name('Bar Count')
            .onChange(v => {
                document.getElementById('stat-bars').textContent = v;
                buildBars();
            });

        gui.add(config, 'showLabels').name('Show Labels')
            .onChange(v => {
                document.getElementById('stat-labels').textContent = v ? 'On' : 'Off';
                buildBars();
            });

        gui.add(config, 'animationSpeed', 0.1, 3.0, 0.1).name('Anim Speed');

        gui.add(config, 'pulseAmount', 0.01, 0.15, 0.01).name('Pulse Amount');

        // randomize data button
        gui.add({
            randomize: () => {
                chartData = MONTHS.map((m, i) => ({
                    month: m,
                    fullMonth: FULL_MONTHS[i],
                    value: Math.floor(Math.random() * 80) + 20 + Math.sin(i * 0.8) * 15 + 30,
                    index: i
                }));
                buildBars();
            }
        }, 'randomize').name('Randomize Data');

        // ─── Helpers ────────────────────────────────────────────────────────────
        function rebuildBarColors() {
            bars.forEach(bar => {
                const t = bar.userData.normalizedValue;
                const colorFn = colorSchemes[config.colorScheme] || colorSchemes.heat;
                const c = colorFn(t);
                bar.userData.baseColor = c.clone();
                bar.material.color.copy(c);
            });
            const visibleData = chartData.slice(0, config.barCount);
            const maxVal = Math.max(...visibleData.map(d => d.value));
            updateLegend(maxVal);
        }

        // ─── Animation Loop ─────────────────────────────────────────────────────
        const clock = new THREE.Clock();

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function easeOutElastic(t) {
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        }

        function animate() {
            requestAnimationFrame(animate);

            const delta = clock.getDelta();
            const elapsed = clock.getElapsedTime();

            // entrance animation
            bars.forEach((bar, i) => {
                const state = barAnimStates[i];
                if (!state) return;

                if (elapsed < state.enterDelay) return;
                state.entered = true;

                const progress = Math.min((elapsed - state.enterDelay) / 1.2, 1);
                const easedProgress = easeOutElastic(progress);
                const currentScaleY = easedProgress * state.targetHeight;

                bar.scale.y = Math.max(currentScaleY, 0.001);
                bar.position.y = (currentScaleY / 2) + 0.05;

                // update value label position
                labelGroup.children.forEach(child => {
                    if (child.name === 'valueLabel') {
                        child.position.y = currentScaleY + 0.3;
                    }
                });
            });

            // pulse/wave/random animation
            if (config.animationMode !== 'none') {
                bars.forEach((bar, i) => {
                    if (!barAnimStates[i]?.entered) return;

                    let pulseOffset = 0;
                    const phase = bar.userData.phase;

                    if (config.animationMode === 'pulse') {
                        pulseOffset = Math.sin(elapsed * 2 * config.animationSpeed + phase) * config.pulseAmount;
                    } else if (config.animationMode === 'wave') {
                        pulseOffset = Math.sin(elapsed * 1.5 * config.animationSpeed + i * 0.4) * config.pulseAmount;
                    } else if (config.animationMode === 'random') {
                        pulseOffset = Math.sin(elapsed * 3 * config.animationSpeed + phase * 7) * config.pulseAmount * 0.5;
                    }

                    const baseScale = barAnimStates[i].targetHeight;
                    const scale = baseScale * (1 + pulseOffset);
                    bar.scale.y = Math.max(scale, 0.001);
                    bar.position.y = (scale / 2) + 0.05;

                    // color shimmer
                    const colorFn = colorSchemes[config.colorScheme] || colorSchemes.heat;
                    const t = bar.userData.normalizedValue;
                    const c = colorFn(t);
                    const shimmer = Math.sin(elapsed * 3 + phase) * 0.05;
                    c.r = Math.min(1, c.r + shimmer);
                    c.g = Math.min(1, c.g + shimmer);
                    c.b = Math.min(1, c.b + shimmer);
                    bar.material.color.copy(c);

                    // update value label position
                    labelGroup.children.forEach(child => {
                        if (child.name === 'valueLabel') {
                            child.position.y = scale + 0.3;
                            child.visible = config.showLabels && scale > 0.5;
                        }
                    });
                });
            }

            controls.update();
            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);
        }

        // ─── Resize ─────────────────────────────────────────────────────────────
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            labelRenderer.setSize(window.innerWidth, window.innerHeight);
        });

        // ─── Start ──────────────────────────────────────────────────────────────
        document.getElementById('loading').style.display = 'none';
        animate();

        // ─── Expose to window ───────────────────────────────────────────────────
        window.THREE = THREE;
        window.scene = scene;
        window.camera = camera;
        window.renderer = renderer;
        window.bars = bars;
        window.barGroup = barGroup;
        window.labelGroup = labelGroup;
        window.controls = controls;
        window.config = config;
        window.chartData = chartData;

        console.log('3D Bar Chart loaded. window.scene, window.camera, window.bars, window.config available.');