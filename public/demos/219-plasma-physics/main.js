import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
        import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
        import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
        import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

        // ─── Scene Setup ────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000510, 0.015);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
        camera.position.set(0, 0, 35);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        document.body.appendChild(renderer.domElement);

        // ─── Controls ───────────────────────────────────────────────────────────
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxDistance = 100;
        controls.minDistance = 5;

        // ─── Post-Processing ────────────────────────────────────────────────────
        const composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.8,   // strength
            0.5,   // radius
            0.2    // threshold — lower = more glow
        );
        composer.addPass(bloomPass);

        // ─── Parameters ────────────────────────────────────────────────────────
        const params = {
            density: 2.5,
            turbulence: 1.8,
            colorTemperature: 6500,  // Kelvin: 3000=warm red, 6500=daylight, 12000=blue
            animationSpeed: 1.0,
            particleCount: 3500,
            bloomStrength: 1.8,
            bloomRadius: 0.5,
            bloomThreshold: 0.2,
        };

        // ─── Shader: Plasma Sphere ──────────────────────────────────────────────
        const plasmaVertexShader = /* glsl */`
            uniform float uTime;
            uniform float uTurbulence;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying float vDisplacement;

            // Hash function for noise
            vec3 hash3(vec3 p) {
                p = vec3(
                    dot(p, vec3(127.1, 311.7, 74.7)),
                    dot(p, vec3(269.5, 183.3, 246.1)),
                    dot(p, vec3(113.5, 271.9, 124.6))
                );
                return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
            }

            // Perlin-style 3D noise
            float noise3(vec3 p) {
                vec3 i = floor(p);
                vec3 f = fract(p);
                vec3 u = f * f * (3.0 - 2.0 * f);

                return mix(
                    mix(
                        mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
                            dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                        mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
                            dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
                    mix(
                        mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
                            dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                        mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
                            dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y),
                    u.z
                );
            }

            // FBM — Fractional Brownian Motion
            // Each octave doubles the frequency, creating self-similar fractal detail
            // This mimics real plasma turbulence which is scale-invariant
            float fbm(vec3 p, int octaves) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                float maxValue = 0.0;

                for (int i = 0; i < 8; i++) {
                    if (i >= octaves) break;
                    value += amplitude * noise3(p * frequency);
                    maxValue += amplitude;
                    amplitude *= 0.5;
                    frequency *= 2.0;
                }
                return value / maxValue;
            }

            void main() {
                vUv = uv;
                vNormal = normal;

                // Time-varying displacement using FBM
                // Domain warping: feed fbm output back as input coordinate offset
                // This creates the swirling, non-repeating plasma tendrils
                float t = uTime * 0.3;
                vec3 q = vec3(
                    fbm(position * 0.5 + t, 5),
                    fbm(position * 0.5 + vec3(5.2, 1.3, 2.8) + t, 5),
                    fbm(position * 0.5 + vec3(1.7, 9.2, 3.1) + t, 5)
                );

                // Second layer of warping for complex flow patterns
                vec3 r = vec3(
                    fbm(position + q * uTurbulence + t * 0.5, 6),
                    fbm(position + q * uTurbulence + vec3(1.7, 2.3, 4.1) + t * 0.5, 6),
                    fbm(position + q * uTurbulence + vec3(5.3, 3.7, 1.9) + t * 0.5, 6)
                );

                float displacement = fbm(position + r * uTurbulence * 1.5 + t, 7);
                vDisplacement = displacement;

                // Displace outward along normal, with pulsation
                float pulse = sin(uTime * 2.0 + displacement * 6.0) * 0.1;
                vec3 newPosition = position + normal * (displacement * 2.5 + pulse);

                vPosition = newPosition;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
        `;

        const plasmaFragmentShader = /* glsl */`
            uniform float uTime;
            uniform float uDensity;
            uniform float uTurbulence;
            uniform float uColorTemperature; // in Kelvin
            uniform float uAnimationSpeed;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vPosition;
            varying float vDisplacement;

            // Hash
            vec3 hash3(vec3 p) {
                p = vec3(
                    dot(p, vec3(127.1, 311.7, 74.7)),
                    dot(p, vec3(269.5, 183.3, 246.1)),
                    dot(p, vec3(113.5, 271.9, 124.6))
                );
                return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
            }

            float noise3(vec3 p) {
                vec3 i = floor(p);
                vec3 f = fract(p);
                vec3 u = f * f * (3.0 - 2.0 * f);

                return mix(
                    mix(
                        mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
                            dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                        mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
                            dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
                    mix(
                        mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
                            dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                        mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
                            dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y),
                    u.z
                );
            }

            float fbm(vec3 p, int octaves) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 1.0;
                float maxValue = 0.0;
                for (int i = 0; i < 8; i++) {
                    if (i >= octaves) break;
                    value += amplitude * noise3(p * frequency);
                    maxValue += amplitude;
                    amplitude *= 0.5;
                    frequency *= 2.0;
                }
                return value / maxValue;
            }

            // HSV to RGB conversion — enables smooth color gradients
            vec3 hsv2rgb(vec3 c) {
                vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }

            // Convert color temperature (Kelvin) to RGB
            // Based on Tanner Helland's algorithm — used in astrophysics & photography
            vec3 kelvinToRGB(float kelvin) {
                float temp = kelvin / 100.0;
                vec3 color;

                if (temp <= 66.0) {
                    color.r = 255.0;
                    color.g = 99.4708025861 * log(temp) - 161.1195681661;
                    color.b = (temp <= 19.0) ? 0.0 : 138.5177312231 * log(temp - 10.0) - 305.0447927307;
                } else {
                    color.r = 329.698727446 * pow(temp - 60.0, -0.1332047592);
                    color.g = 288.1221695283 * pow(temp - 60.0, -0.0755148492);
                    color.b = 255.0;
                }

                return clamp(color / 255.0, 0.0, 1.0);
            }

            void main() {
                float t = uTime * uAnimationSpeed;

                // ── Layer 1: Core FBM turbulence ─────────────────────────────
                vec3 p = vPosition * uDensity * 0.15;
                float f1 = fbm(p + t * 0.2, 6);
                float f2 = fbm(p * 1.8 - t * 0.15 + f1, 5);
                float f3 = fbm(p * 3.2 + t * 0.1 + f2 * uTurbulence, 4);

                // ── Layer 2: Swirling domain warp ────────────────────────────
                vec3 warp = vec3(
                    fbm(p + vec3(1.7, 9.2, 3.1) + t, 4),
                    fbm(p + vec3(8.3, 2.8, 1.4) - t, 4),
                    fbm(p + vec3(2.1, 4.7, 8.6) + t * 0.7, 4)
                );
                float finalNoise = fbm(p + warp * uTurbulence * 0.8 + t * 0.3, 7);

                // ── Color mapping ───────────────────────────────────────────
                // Shift hue based on noise value for multi-colored plasma
                float hue = finalNoise * 0.6 + f1 * 0.3 + t * 0.05;
                hue = fract(hue + 0.55); // shift into visible range

                // Saturation varies with density — denser = more saturated
                float sat = 0.7 + f3 * 0.3;
                float val = 0.8 + f1 * 0.2;

                // Temperature tint: cool (blue) to warm (orange/yellow)
                // Use two temperatures and lerp based on noise
                vec3 coolColor = kelvinToRGB(uColorTemperature + 4000.0);  // ~10500K blue-white
                vec3 warmColor = kelvinToRGB(uColorTemperature - 2000.0);   // ~4500K warm orange
                vec3 baseColor = mix(warmColor, coolColor, f2 * 0.5 + 0.5);

                // Add neon energy colors overlaid
                vec3 neonHue = hsv2rgb(vec3(hue, sat * 0.9, val));
                vec3 finalColor = mix(neonHue, baseColor, 0.35);

                // ── Corona / Sun-edge brightening ─────────────────────────
                // Atoms at the edge of a plasma (like the solar corona) emit
                // more light due to lower density recombination — this simulates
                // that sheath effect using fresnel-like normal dot product
                float fresnel = 1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
                fresnel = pow(fresnel, 1.5);
                finalColor += fresnel * mix(warmColor, coolColor, 0.3) * 2.0;

                // ── Energy pulse (plasma frequency) ─────────────────────────
                // Real plasma oscillates at its plasma frequency ωp = sqrt(ne²/ε₀m)
                // Visualized here as rhythmic intensity variations
                float pulse = sin(t * 3.0 + vDisplacement * 8.0) * 0.5 + 0.5;
                float pulse2 = sin(t * 5.0 - vDisplacement * 12.0) * 0.5 + 0.5;
                finalColor *= 0.7 + (pulse * 0.2 + pulse2 * 0.1);

                // ── Emissive boost for bloom ────────────────────────────────
                finalColor *= 1.4;

                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        // ─── Plasma Mesh ────────────────────────────────────────────────────────
        const plasmaGeometry = new THREE.IcosahedronGeometry(10, 64);
        const plasmaMaterial = new THREE.ShaderMaterial({
            vertexShader: plasmaVertexShader,
            fragmentShader: plasmaFragmentShader,
            uniforms: {
                uTime:           { value: 0.0 },
                uDensity:        { value: params.density },
                uTurbulence:     { value: params.turbulence },
                uColorTemperature: { value: params.colorTemperature },
                uAnimationSpeed: { value: params.animationSpeed },
            },
            side: THREE.DoubleSide,
        });

        const plasmaMesh = new THREE.Mesh(plasmaGeometry, plasmaMaterial);
        scene.add(plasmaMesh);

        // ─── Particle System ────────────────────────────────────────────────────
        // Particles represent individual charged particles spiraling along field lines
        const particleCount = params.particleCount;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const lifetimes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            resetParticle(i);
        }

        function resetParticle(i) {
            // Spawn particles on the plasma surface / corona
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 10 + Math.random() * 6;

            positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            velocities[i * 3]     = (Math.random() - 0.5) * 0.05;
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.05;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;

            sizes[i] = Math.random() * 2.0 + 0.5;
            lifetimes[i] = Math.random();
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const particleVertexShader = /* glsl */`
            attribute float size;
            varying float vAlpha;
            uniform float uTime;

            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;

                // Fade based on distance from center (corona edge)
                float dist = length(position);
                vAlpha = smoothstep(16.0, 10.0, dist) * 0.9;
            }
        `;

        const particleFragmentShader = /* glsl */`
            varying float vAlpha;
            uniform float uColorTemperature;
            uniform float uTime;

            vec3 kelvinToRGB(float kelvin) {
                float temp = kelvin / 100.0;
                vec3 color;
                if (temp <= 66.0) {
                    color.r = 255.0;
                    color.g = 99.4708025861 * log(temp) - 161.1195681661;
                    color.b = (temp <= 19.0) ? 0.0 : 138.5177312231 * log(temp - 10.0) - 305.0447927307;
                } else {
                    color.r = 329.698727446 * pow(temp - 60.0, -0.1332047592);
                    color.g = 288.1221695283 * pow(temp - 60.0, -0.0755148492);
                    color.b = 255.0;
                }
                return clamp(color / 255.0, 0.0, 1.0);
            }

            void main() {
                // Soft circular particle with glow
                vec2 center = gl_PointCoord - 0.5;
                float dist = length(center);
                if (dist > 0.5) discard;

                float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
                vec3 color = kelvinToRGB(uColorTemperature + 3000.0);
                gl_FragColor = vec4(color * 1.5, alpha);
            }
        `;

        const particleMaterial = new THREE.ShaderMaterial({
            vertexShader: particleVertexShader,
            fragmentShader: particleFragmentShader,
            uniforms: {
                uTime: { value: 0.0 },
                uColorTemperature: { value: params.colorTemperature },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particleSystem);

        // ─── Background Stars ───────────────────────────────────────────────────
        const starCount = 2000;
        const starGeo = new THREE.BufferGeometry();
        const starPos = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount * 3; i++) {
            starPos[i] = (Math.random() - 0.5) * 400;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.3, transparent: true, opacity: 0.6 });
        scene.add(new THREE.Points(starGeo, starMat));

        // ─── GUI ────────────────────────────────────────────────────────────────
        const gui = new GUI({ title: '⚛ Plasma Controls' });

        gui.add(params, 'density', 0.5, 6.0, 0.1).name('Plasma Density').onChange(v => {
            plasmaMaterial.uniforms.uDensity.value = v;
        });

        gui.add(params, 'turbulence', 0.2, 4.0, 0.1).name('Turbulence').onChange(v => {
            plasmaMaterial.uniforms.uTurbulence.value = v;
        });

        gui.add(params, 'colorTemperature', 2000, 15000, 100).name('Color Temp (K)').onChange(v => {
            plasmaMaterial.uniforms.uColorTemperature.value = v;
            particleMaterial.uniforms.uColorTemperature.value = v;
        });

        gui.add(params, 'animationSpeed', 0.1, 3.0, 0.1).name('Anim Speed').onChange(v => {
            plasmaMaterial.uniforms.uAnimationSpeed.value = v;
        });

        gui.add(params, 'particleCount', 500, 10000, 100).name('Particle Count');

        const bloomFolder = gui.addFolder('Bloom');
        bloomFolder.add(params, 'bloomStrength', 0.0, 3.0, 0.1).name('Strength').onChange(v => {
            bloomPass.strength = v;
        });
        bloomFolder.add(params, 'bloomRadius', 0.0, 1.0, 0.05).name('Radius').onChange(v => {
            bloomPass.radius = v;
        });
        bloomFolder.add(params, 'bloomThreshold', 0.0, 1.0, 0.05).name('Threshold').onChange(v => {
            bloomPass.threshold = v;
        });
        bloomFolder.close();

        // ─── Animation Loop ─────────────────────────────────────────────────────
        const clock = new THREE.Clock();

        function animate() {
            requestAnimationFrame(animate);

            const elapsed = clock.getElapsedTime();

            // Update plasma uniforms
            plasmaMaterial.uniforms.uTime.value = elapsed;
            particleMaterial.uniforms.uTime.value = elapsed;

            // Animate plasma mesh rotation (slow drift)
            plasmaMesh.rotation.y = elapsed * 0.05;
            plasmaMesh.rotation.x = Math.sin(elapsed * 0.03) * 0.1;

            // Particle animation — spiraling motion along field lines
            const posArr = particleGeometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                lifetimes[i] += 0.003 * params.animationSpeed;
                if (lifetimes[i] > 1.0) {
                    resetParticle(i);
                    lifetimes[i] = 0.0;
                }

                // Lorentz-force-like spiral: perpendicular velocity to position
                const px = posArr[i * 3];
                const py = posArr[i * 3 + 1];
                const pz = posArr[i * 3 + 2];

                // Gyration around field direction (z-axis simplified)
                const gyroSpeed = 0.02 * params.animationSpeed;
                const newVx = velocities[i * 3]     + (-py * gyroSpeed * 0.1);
                const newVy = velocities[i * 3 + 1] + (px * gyroSpeed * 0.1);
                const newVz = velocities[i * 3 + 2];

                // Add noise-based perturbation (turbulence)
                const turbScale = 0.005 * params.turbulence;
                posArr[i * 3]     += newVx + (Math.random() - 0.5) * turbScale;
                posArr[i * 3 + 1] += newVy + (Math.random() - 0.5) * turbScale;
                posArr[i * 3 + 2] += newVz + (Math.random() - 0.5) * turbScale;

                // Keep particles roughly in the plasma region
                const dist = Math.sqrt(
                    posArr[i * 3] ** 2 +
                    posArr[i * 3 + 1] ** 2 +
                    posArr[i * 3 + 2] ** 2
                );
                if (dist > 18 || dist < 8) {
                    resetParticle(i);
                    lifetimes[i] = 0.0;
                }
            }
            particleGeometry.attributes.position.needsUpdate = true;

            controls.update();
            composer.render();
        }

        // ─── Resize Handler ────────────────────────────────────────────────────
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        });

        animate();