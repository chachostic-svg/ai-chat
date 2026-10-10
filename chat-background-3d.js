import * as THREE from 'three';

function isDarkTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

/**
 * @param {HTMLElement} container
 * @returns {{ start: () => void; stop: () => void; dispose: () => void }}
 */
export function createChatBackground3d(container) {
  const noop = { start: () => {}, stop: () => {}, dispose: () => {} };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return noop;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  camera.position.set(0, 0, 9);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'jivo-messages-bg__canvas';
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  const keyLight = new THREE.DirectionalLight(0x6ee7b7, 1.1);
  keyLight.position.set(4, 6, 8);
  const fillLight = new THREE.PointLight(0x34d399, 0.85, 20);
  fillLight.position.set(-5, -2, 4);
  scene.add(ambient, keyLight, fillLight);

  const group = new THREE.Group();
  scene.add(group);

  const dark = isDarkTheme();
  const palette = dark
    ? [0x34d399, 0x2dd4bf, 0x6ee7b7, 0x10b981]
    : [0x6ee7b7, 0x34d399, 0xa7f3d0, 0x14b8a6];

  const specs = [
    { geo: new THREE.IcosahedronGeometry(0.85, 0), pos: [-2.4, 1.1, -1], speed: 0.012 },
    { geo: new THREE.TorusGeometry(0.65, 0.22, 12, 28), pos: [2.5, -0.6, -0.5], speed: -0.018 },
    { geo: new THREE.OctahedronGeometry(0.75, 0), pos: [0.3, 1.8, -1.5], speed: 0.015 },
    { geo: new THREE.SphereGeometry(0.55, 24, 24), pos: [-1.2, -1.6, 0], speed: 0.01 },
    { geo: new THREE.TorusKnotGeometry(0.45, 0.14, 64, 12), pos: [1.8, 1.4, -1.2], speed: 0.009 },
  ];

  const meshes = specs.map((spec, i) => {
    const material = new THREE.MeshPhysicalMaterial({
      color: palette[i % palette.length],
      metalness: 0.35,
      roughness: 0.25,
      transmission: 0.35,
      thickness: 0.8,
      transparent: true,
      opacity: dark ? 0.72 : 0.58,
    });
    const mesh = new THREE.Mesh(spec.geo, material);
    mesh.position.set(...spec.pos);
    mesh.userData.speed = spec.speed;
    mesh.userData.phase = i * 1.7;
    group.add(mesh);
    return mesh;
  });

  const particles = createParticles(dark);
  scene.add(particles);

  const clock = new THREE.Clock();
  let running = false;
  let rafId = 0;

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w < 1 || h < 1) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  function animate() {
    if (!running) return;
    rafId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    group.rotation.y = t * 0.12;
    group.rotation.x = Math.sin(t * 0.25) * 0.08;

    meshes.forEach((mesh) => {
      const p = mesh.userData.phase;
      mesh.rotation.x += mesh.userData.speed;
      mesh.rotation.z += mesh.userData.speed * 0.6;
      mesh.position.y += Math.sin(t * 0.9 + p) * 0.004;
    });

    particles.rotation.y = -t * 0.04;
    particles.rotation.x = Math.sin(t * 0.15) * 0.05;

    renderer.render(scene, camera);
  }

  return {
    start() {
      if (running) return;
      running = true;
      clock.start();
      animate();
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    dispose() {
      running = false;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      specs.forEach((s) => s.geo.dispose());
      meshes.forEach((m) => m.material.dispose());
      particles.geometry.dispose();
      particles.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function createParticles(dark) {
  const count = 48;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: dark ? 0x6ee7b7 : 0x10b981,
    size: 0.06,
    transparent: true,
    opacity: dark ? 0.45 : 0.35,
    depthWrite: false,
  });
  return new THREE.Points(geometry, material);
}
