import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0f);

        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, -15, 30);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Lighting for solid cloth mode
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 20, 15);
        scene.add(directionalLight);
        const pointLight = new THREE.PointLight(0x4fc3f7, 0.8, 100);
        pointLight.position.set(-10, 10, 10);
        scene.add(pointLight);

        // Parameters
        const params = {
            gravity: 9.8,
            windStrength: 3.0,
            damping: 0.97,
            stiffness: 1.0,
            clothSize: 20,
            subdivisions: 25,
            wireframe: false,
            reset: () => initCloth()
        };

        // Particle class for Verlet integration
        class Particle {
            constructor(x, y, z, mass, pinned = false) {
                this.position = new THREE.Vector3(x, y, z);
                this.previous = new THREE.Vector3(x, y, z);
                this.original = new THREE.Vector3(x, y, z);
                this.acceleration = new THREE.Vector3();
                this.mass = mass;
                this.invMass = pinned ? 0 : 1 / mass;
                this.pinned = pinned;
            }

            applyForce(force) {
                if (this.pinned) return;
                this.acceleration.addScaledVector(force, this.invMass);
            }

            update(dt, damping) {
                if (this.pinned) return;

                const velocity = new THREE.Vector3().subVectors(this.position, this.previous);
                velocity.multiplyScalar(damping);

                const newPos = new THREE.Vector3()
                    .addVectors(this.position, velocity)
                    .addScaledVector(this.acceleration, dt * dt);

                this.previous.copy(this.position);
                this.position.copy(newPos);
                this.acceleration.set(0, 0, 0);
            }
        }

        // Constraint class for spring connections
        class Constraint {
            constructor(p1, p2, restLength, stiffness) {
                this.p1 = p1;
                this.p2 = p2;
                this.restLength = restLength;
                this.stiffness = stiffness;
            }

            solve() {
                const diff = new THREE.Vector3().subVectors(this.p2.position, this.p1.position);
                const currentLength = diff.length();
                if (currentLength === 0) return;

                const correction = (currentLength - this.restLength) * this.stiffness;
                diff.normalize().multiplyScalar(correction * 0.5);

                if (!this.p1.pinned) this.p1.position.add(diff);
                if (!this.p2.pinned) this.p2.position.sub(diff);
            }
        }

        // Cloth system
        let particles = [];
        let constraints = [];
        let clothGeometry;
        let clothMesh;
        let constraintLines;

        function initCloth() {
            // Clear previous
            if (clothMesh) scene.remove(clothMesh);
            if (constraintLines) scene.remove(constraintLines);

            particles = [];
            constraints = [];

            const size = params.clothSize;
            const subs = params.subdivisions;
            const spacing = size / subs;
            const startX = -size / 2;
            const startY = size / 2 + 5;

            // Create particles
            for (let j = 0; j <= subs; j++) {
                for (let i = 0; i <= subs; i++) {
                    const x = startX + i * spacing;
                    const y = startY - j * spacing;
                    const z = 0;
                    const pinned = j === 0 && (i === 0 || i === subs);
                    particles.push(new Particle(x, y, z, 1, pinned));
                }
            }

            // Create constraints (structural, shear, and bending)
            const cols = subs + 1;
            for (let j = 0; j <= subs; j++) {
                for (let i = 0; i <= subs; i++) {
                    const idx = j * cols + i;

                    // Structural horizontal
                    if (i < subs) {
                        constraints.push(new Constraint(
                            particles[idx],
                            particles[idx + 1],
                            spacing,
                            params.stiffness
                        ));
                    }

                    // Structural vertical
                    if (j < subs) {
                        constraints.push(new Constraint(
                            particles[idx],
                            particles[idx + cols],
                            spacing,
                            params.stiffness
                        ));
                    }

                    // Shear diagonal
                    if (i < subs && j < subs) {
                        constraints.push(new Constraint(
                            particles[idx],
                            particles[idx + cols + 1],
                            spacing * Math.SQRT2,
                            params.stiffness * 0.5
                        ));
                        constraints.push(new Constraint(
                            particles[idx + 1],
                            particles[idx + cols],
                            spacing * Math.SQRT2,
                            params.stiffness * 0.5
                        ));
                    }

                    // Bending horizontal
                    if (i < subs - 1) {
                        constraints.push(new Constraint(
                            particles[idx],
                            particles[idx + 2],
                            spacing * 2,
                            params.stiffness * 0.3
                        ));
                    }

                    // Bending vertical
                    if (j < subs - 1) {
                        constraints.push(new Constraint(
                            particles[idx],
                            particles[idx + cols * 2],
                            spacing * 2,
                            params.stiffness * 0.3
                        ));
                    }
                }
            }

            // Create cloth mesh geometry
            clothGeometry = new THREE.PlaneGeometry(size, size, subs, subs);
            clothGeometry.rotateX(-Math.PI / 2);

            if (params.wireframe) {
                clothMesh = new THREE.Mesh(
                    clothGeometry,
                    new THREE.MeshBasicMaterial({ color: 0x4fc3f7, wireframe: true, side: THREE.DoubleSide })
                );
            } else {
                clothMesh = new THREE.Mesh(
                    clothGeometry,
                    new THREE.MeshStandardMaterial({
                        color: 0x2196f3,
                        side: THREE.DoubleSide,
                        roughness: 0.8,
                        metalness: 0.1
                    })
                );
            }
            scene.add(clothMesh);

            // Constraint lines for visualization
            const linePositions = [];
            for (const c of constraints) {
                linePositions.push(c.p1.position.x, c.p1.position.y, c.p1.position.z);
                linePositions.push(c.p2.position.x, c.p2.position.y, c.p2.position.z);
            }
            const lineGeometry = new THREE.BufferGeometry();
            lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            constraintLines = new THREE.LineSegments(
                lineGeometry,
                new THREE.LineBasicMaterial({ color: 0x4fc3f7, opacity: 0.15, transparent: true })
            );
            scene.add(constraintLines);
        }

        initCloth();

        // Gravity force
        const gravityForce = new THREE.Vector3(0, 0, 0);

        // Mouse interaction
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let draggedParticle = null;
        let dragPlane = new THREE.Plane();
        let dragOffset = new THREE.Vector3();
        let intersection = new THREE.Vector3();

        function onMouseMove(event) {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            if (draggedParticle) {
                raycaster.setFromCamera(mouse, camera);
                raycaster.ray.intersectPlane(dragPlane, intersection);
                draggedParticle.position.copy(intersection.sub(dragOffset));
                draggedParticle.previous.copy(draggedParticle.position);
            }
        }

        function onMouseDown(event) {
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(clothMesh);

            if (intersects.length > 0) {
                const point = intersects[0].point;
                let closest = null;
                let minDist = Infinity;

                for (const p of particles) {
                    if (p.pinned) continue;
                    const d = point.distanceTo(p.position);
                    if (d < minDist) {
                        minDist = d;
                        closest = p;
                    }
                }

                if (closest && minDist < 2) {
                    draggedParticle = closest;
                    const normal = intersects[0].face.normal.clone();
                    normal.transformDirection(clothMesh.matrixWorld);
                    dragPlane.setFromNormalAndCoplanarPoint(normal, point);
                    raycaster.ray.intersectPlane(dragPlane, intersection);
                    dragOffset.subVectors(intersection, closest.position);
                    controls.enabled = false;
                }
            }
        }

        function onMouseUp() {
            draggedParticle = null;
            controls.enabled = true;
        }

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);

        // Touch support
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
                onMouseMove(e);
            }
        }, { passive: true });

        window.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
                mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
                onMouseDown({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
            }
        }, { passive: true });

        window.addEventListener('touchend', onMouseUp);

        // GUI
        const gui = new GUI();
        gui.add(params, 'gravity', 0, 30, 0.1).name('Gravity');
        gui.add(params, 'windStrength', 0, 15, 0.1).name('Wind Strength');
        gui.add(params, 'damping', 0.9, 1.0, 0.01).name('Damping');
        gui.add(params, 'stiffness', 0.1, 2.0, 0.1).name('Stiffness');
        gui.add(params, 'clothSize', 10, 40, 1).name('Cloth Size').onFinishChange(initCloth);
        gui.add(params, 'subdivisions', 5, 40, 1).name('Subdivisions').onFinishChange(initCloth);
        gui.add(params, 'wireframe').name('Wireframe Mode').onChange(() => {
            if (clothMesh) {
                clothMesh.material.dispose();
                if (params.wireframe) {
                    clothMesh.material = new THREE.MeshBasicMaterial({ color: 0x4fc3f7, wireframe: true, side: THREE.DoubleSide });
                } else {
                    clothMesh.material = new THREE.MeshStandardMaterial({
                        color: 0x2196f3,
                        side: THREE.DoubleSide,
                        roughness: 0.8,
                        metalness: 0.1
                    });
                }
            }
        });
        gui.add(params, 'reset').name('Reset Cloth');

        // Floor
        const floorGeo = new THREE.PlaneGeometry(100, 100);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.9 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -20;
        scene.add(floor);

        // Animation
        const clock = new THREE.Clock();
        let time = 0;

        function animate() {
            requestAnimationFrame(animate);

            const dt = Math.min(clock.getDelta(), 0.033);
            time += dt;

            // Update stiffness on constraints
            for (const c of constraints) {
                c.stiffness = params.stiffness;
            }

            // Apply forces
            gravityForce.set(0, -params.gravity, 0);
            const windDir = new THREE.Vector3(
                Math.sin(time * 0.7) * params.windStrength,
                Math.sin(time * 1.3) * 0.5,
                Math.cos(time * 0.5) * params.windStrength
            );

            for (const p of particles) {
                p.applyForce(gravityForce);
                p.applyForce(windDir);
            }

            // Verlet integration
            for (const p of particles) {
                p.update(dt, params.damping);
            }

            // Solve constraints multiple times for stability
            for (let iter = 0; iter < 5; iter++) {
                for (const c of constraints) {
                    c.solve();
                }
            }

            // Pin top corners back (soft constraint)
            for (const p of particles) {
                if (p.pinned) {
                    p.position.copy(p.original);
                }
            }

            // Update cloth geometry
            const positions = clothGeometry.attributes.position;
            for (let i = 0; i < particles.length; i++) {
                positions.setXYZ(i, particles[i].position.x, particles[i].position.y, particles[i].position.z);
            }
            positions.needsUpdate = true;
            clothGeometry.computeVertexNormals();

            // Update constraint lines
            if (constraintLines) {
                const linePos = constraintLines.geometry.attributes.position;
                let idx = 0;
                for (const c of constraints) {
                    linePos.setXYZ(idx++, c.p1.position.x, c.p1.position.y, c.p1.position.z);
                    linePos.setXYZ(idx++, c.p2.position.x, c.p2.position.y, c.p2.position.z);
                }
                linePos.needsUpdate = true;
            }

            controls.update();
            renderer.render(scene, camera);
        }

        animate();

        // Resize handler
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });