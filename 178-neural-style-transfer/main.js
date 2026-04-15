import * as THREE from 'three';
    import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
    import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
    import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';
    import { GUI }             from 'three/addons/libs/lil-gui.module.min.js';

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 4);

    // ── Lights ─────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const dirLight = new THREE.DirectionalLight(0xffd4a6, 1.8);
    dirLight.position.set(3, 4, 3);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x7c3aed, 3.0, 12);
    pointLight.position.set(-3, -2, 2);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x06b6d4, 2.5, 12);
    pointLight2.position.set(3, -1, -2);
    scene.add(pointLight2);

    // ── Abstract Shape: Icosahedron + wireframe overlay ───────────────────────
    const geo = new THREE.IcosahedronGeometry(1.3, 4);

    // Solid metallic inner mesh
    const mat = new THREE.MeshStandardMaterial({
      color:       0x2d1b69,
      metalness:   0.85,
      roughness:   0.15,
      emissive:    new THREE.Color(0x1a0a40),
      emissiveIntensity: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // Wireframe glow layer
    const wireMat = new THREE.MeshBasicMaterial({
      color:       0xc084fc,
      wireframe:   true,
      transparent: true,
      opacity:     0.25,
    });
    const wireMesh = new THREE.Mesh(geo, wireMat);
    scene.add(wireMesh);

    // Small orbiting torus knots
    const orbitsGroup = new THREE.Group();
    scene.add(orbitsGroup);
    for (let i = 0; i < 3; i++) {
      const tGeo = new THREE.TorusKnotGeometry(0.12, 0.04, 80, 12, 2, 3);
      const tMat = new THREE.MeshStandardMaterial({
        color:       new THREE.Color().setHSL(i / 3, 0.8, 0.6),
        metalness:   0.9,
        roughness:   0.1,
        emissive:    new THREE.Color().setHSL(i / 3, 1.0, 0.3),
        emissiveIntensity: 0.6,
      });
      const torus = new THREE.Mesh(tGeo, tMat);
      const angle = (i / 3) * Math.PI * 2;
      torus.position.set(
        Math.cos(angle) * 2.2,
        Math.sin(angle * 1.7) * 0.8,
        Math.sin(angle) * 2.2
      );
      orbitsGroup.add(torus);
    }

    // ── Neural Style Transfer Shader ──────────────────────────────────────────
    const NSTShader = {
      uniforms: {
        tDiffuse:     { value: null },
        uResolution:  { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uTime:        { value: 0.0 },
        uEdgeStrength:{ value: 1.2 },
        uQuantizeLevels: { value: 6.0 },
        uStyleIntensity: { value: 0.85 },
        uColorShift:  { value: 0.08 },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;

        uniform sampler2D tDiffuse;
        uniform vec2      uResolution;
        uniform float     uTime;
        uniform float     uEdgeStrength;
        uniform float     uQuantizeLevels;
        uniform float     uStyleIntensity;
        uniform float     uColorShift;

        varying vec2 vUv;

        // Luminance helper
        float luma(vec3 c) {
          return dot(c, vec3(0.2126, 0.7152, 0.0722));
        }

        // Sobel edge detection on a single channel
        float sobelChannel(sampler2D tex, vec2 uv, vec2 texel, float channel) {
          // 3x3 kernel
          float tl = texture2D(tex, uv + texel * vec2(-1.0,  1.0))[channel];
          float tm = texture2D(tex, uv + texel * vec2( 0.0,  1.0))[channel];
          float tr = texture2D(tex, uv + texel * vec2( 1.0,  1.0))[channel];
          float ml = texture2D(tex, uv + texel * vec2(-1.0,  0.0))[channel];
          float mr = texture2D(tex, uv + texel * vec2( 1.0,  0.0))[channel];
          float bl = texture2D(tex, uv + texel * vec2(-1.0, -1.0))[channel];
          float bm = texture2D(tex, uv + texel * vec2( 0.0, -1.0))[channel];
          float br = texture2D(tex, uv + texel * vec2( 1.0, -1.0))[channel];

          float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
          float gy =  tl + 2.0*tm + tr - bl - 2.0*bm - br;
          return sqrt(gx*gx + gy*gy);
        }

        // Full Sobel (luminance-based)
        float sobelEdge(sampler2D tex, vec2 uv, vec2 texel) {
          float tl = luma(texture2D(tex, uv + texel * vec2(-1.0,  1.0)).rgb);
          float tm = luma(texture2D(tex, uv + texel * vec2( 0.0,  1.0)).rgb);
          float tr = luma(texture2D(tex, uv + texel * vec2( 1.0,  1.0)).rgb);
          float ml = luma(texture2D(tex, uv + texel * vec2(-1.0,  0.0)).rgb);
          float mr = luma(texture2D(tex, uv + texel * vec2( 1.0,  0.0)).rgb);
          float bl = luma(texture2D(tex, uv + texel * vec2(-1.0, -1.0)).rgb);
          float bm = luma(texture2D(tex, uv + texel * vec2( 0.0, -1.0)).rgb);
          float br = luma(texture2D(tex, uv + texel * vec2( 1.0, -1.0)).rgb);

          float gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
          float gy =  tl + 2.0*tm + tr - bl - 2.0*bm - br;
          return clamp(sqrt(gx*gx + gy*gy) * uEdgeStrength, 0.0, 1.0);
        }

        // Color quantization — reduces palette to N levels per channel
        vec3 quantize(vec3 color, float levels) {
          return floor(color * levels + 0.5) / levels;
        }

        // Brush-stroke texture simulation (direction-based noise)
        float brushNoise(vec2 uv) {
          vec2 p = uv * 18.0;
          float n = sin(p.x + sin(p.y * 1.3 + uTime * 0.15))
                  * cos(p.y - sin(p.x * 1.7 - uTime * 0.12));
          return n * 0.5 + 0.5;
        }

        // Slight chromatic aberration
        vec3 chromaticAberration(sampler2D tex, vec2 uv, vec2 dir, float strength) {
          float r = texture2D(tex, uv + dir * strength).r;
          float g = texture2D(tex, uv).g;
          float b = texture2D(tex, uv - dir * strength).b;
          return vec3(r, g, b);
        }

        void main() {
          vec2 uv      = vUv;
          vec2 texel   = 1.0 / uResolution;
          vec2 caDir   = (uv - 0.5) * 2.0;

          // Chromatic aberration offset
          vec3 color = chromaticAberration(tDiffuse, uv, caDir, 0.003 * uStyleIntensity);

          // Sobel edge factor
          float edge = sobelEdge(tDiffuse, uv, texel);

          // Per-channel sobel for colored edge halo
          float edgeR = sobelChannel(tDiffuse, uv, texel, 0);
          float edgeG = sobelChannel(tDiffuse, uv, texel, 1);
          float edgeB = sobelChannel(tDiffuse, uv, texel, 2);
          vec3  edgeColor = vec3(edgeR, edgeG, edgeB) * uEdgeStrength * 0.9;

          // Color quantization
          vec3 quantized = quantize(color, uQuantizeLevels);

          // Blend original + quantized based on style intensity
          vec3 stylized = mix(color, quantized, uStyleIntensity);

          // Kuwahura-style region averaging — split UV into 4 sub-regions and average
          vec2 regions = vec2(2.0, 2.0);
          vec2 regionUV = fract(uv * regions);
          vec2 regionId = floor(uv * regions);
          float regionHash = fract(sin(dot(regionId, vec2(127.1, 311.7))) * 43758.5453);
          float regionAngle = regionHash * 6.2831;
          vec2 regionDir = vec2(cos(regionAngle), sin(regionAngle));
          vec2 offset = regionDir * texel * 4.0;

          vec3 avg = texture2D(tDiffuse, uv + offset).rgb * 0.25
                   + texture2D(tDiffuse, uv - offset).rgb * 0.25
                   + texture2D(tDiffuse, uv + offset.yx).rgb * 0.25
                   + texture2D(tDiffuse, uv - offset.yx).rgb * 0.25;
          vec3 regionAveraged = quantize(avg, uQuantizeLevels * 0.5);
          stylized = mix(stylized, regionAveraged, uStyleIntensity * 0.4);

          // Brush noise modulation
          float brush = brushNoise(uv);
          stylized = mix(stylized, stylized * (0.85 + 0.3 * brush), uStyleIntensity * 0.25);

          // Overlay edge lines
          vec3 edgeOverlay = mix(vec3(0.05, 0.02, 0.15), vec3(1.0, 0.9, 0.6), brush);
          stylized = mix(stylized, edgeOverlay, edge * uStyleIntensity * 0.75);

          // Subtle color shift across screen for painted feel
          float shiftMask = (uv.x + uv.y) * 0.5;
          stylized.r += uColorShift * sin(shiftMask * 3.14159 + uTime * 0.3);
          stylized.g += uColorShift * cos(shiftMask * 2.71828 - uTime * 0.25);
          stylized.b += uColorShift * sin(shiftMask * 4.669 - uTime * 0.18);

          // Vignette
          float vignette = 1.0 - smoothstep(0.45, 0.95, length(uv - 0.5) * 1.6);
          stylized *= mix(0.6, 1.0, vignette);

          gl_FragColor = vec4(clamp(stylized, 0.0, 1.0), 1.0);
        }
      `,
    };

    // ── Post-processing composer ───────────────────────────────────────────────
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const nstPass = new ShaderPass(NSTShader);
    nstPass.renderToScreen = true;
    composer.addPass(nstPass);

    // ── GUI ────────────────────────────────────────────────────────────────────
    const params = {
      edgeStrength:   NSTShader.uniforms.uEdgeStrength.value,
      quantizeLevels: NSTShader.uniforms.uQuantizeLevels.value,
      styleIntensity: NSTShader.uniforms.uStyleIntensity.value,
      colorShift:     NSTShader.uniforms.uColorShift.value,
    };

    const gui = new GUI({ title: '🎨 Style Controls' });
    gui.add(params, 'edgeStrength',   0.0, 4.0, 0.05).name('Edge Strength').onChange(v => {
      NSTShader.uniforms.uEdgeStrength.value = v;
    });
    gui.add(params, 'quantizeLevels', 2.0, 12.0, 1.0).name('Color Levels').onChange(v => {
      NSTShader.uniforms.uQuantizeLevels.value = v;
    });
    gui.add(params, 'styleIntensity', 0.0, 1.0, 0.01).name('Style Intensity').onChange(v => {
      NSTShader.uniforms.uStyleIntensity.value = v;
    });
    gui.add(params, 'colorShift',     0.0, 0.3, 0.005).name('Color Shift').onChange(v => {
      NSTShader.uniforms.uColorShift.value = v;
    });

    // ── Resize ─────────────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      NSTShader.uniforms.uResolution.value.set(w, h);
    });

    // ── Animation loop ─────────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Rotate main shape
      mesh.rotation.x     = t * 0.18;
      mesh.rotation.y     = t * 0.25;
      wireMesh.rotation.x = t * 0.18;
      wireMesh.rotation.y = t * 0.25;

      // Orbit small torus knots
      orbitsGroup.rotation.y = t * 0.4;
      orbitsGroup.rotation.x = t * 0.15;

      // Animate point lights
      pointLight.position.x  = Math.sin(t * 0.7)  * 3.5;
      pointLight.position.z  = Math.cos(t * 0.5)  * 3.5;
      pointLight2.position.x = Math.cos(t * 0.6)  * 3.5;
      pointLight2.position.z  = Math.sin(t * 0.8)  * 3.5;

      // Pulse emissive
      mat.emissiveIntensity = 0.3 + 0.2 * Math.sin(t * 1.5);

      // Update shader time
      NSTShader.uniforms.uTime.value = t;

      composer.render();
    }

    animate();