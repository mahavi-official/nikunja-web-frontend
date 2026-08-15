"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Theme } from "@/lib/theme";

/**
 * The hero's three-dimensional mandala.
 *
 * A mandala is concentric by definition, so the scene is built the same way,
 * outside in:
 *
 *   1. a mala of gold beads on the outermost circle
 *   2. an aureole of thirty-two flames, pointing out
 *   3. two gilded rings tilted off-axis, which is where the depth comes from
 *   4. sixteen saffron lotus petals, alternating in tone — the outer whorl
 *   5. eight gold petals, offset to sit between them — the inner whorl
 *   6. a small throne of deep blue
 *   7. the bindu at the centre: an emissive core that breathes
 *   8. embers drifting upward through all of it, as at an evening aarati
 *
 * Everything is generated in code — no models, no textures, no loaders — so the
 * whole thing costs one dependency and renders identically everywhere.
 *
 * Deliberately restrained: one slow rotation, one breath, one drift. The point
 * is that it feels still, not that it performs.
 */

/** Palette, matching the CSS tokens so the canvas and the page agree. */
const SAFFRON = 0xf77d12;
const SAFFRON_DEEP = 0xe26108;
const GOLD = 0xe0b155;
const NILA = 0x1b2a5c;
const NILA_LIGHT = 0x3a5cb0;

const OUTER_PETALS = 16;
const INNER_PETALS = 8;
const EMBER_COUNT = 260;

/**
 * Everything that differs between the two grounds, in one table.
 *
 * The two are not the same scene with the lights turned down. A white page and
 * a nila page fail an ornament in opposite directions, and the fixes are
 * opposite too:
 *
 *   on white  the danger is washing out. Every value in the object competes
 *             with a background already at maximum brightness, so the palette
 *             is pushed *down* and toward saturation — deeper saffron, a real
 *             horizon in the environment so the metal has darks to reflect,
 *             low ambient so the shadowed side of a petal actually goes dark.
 *             That contrast is the whole reason the thing reads at all.
 *
 *   on nila   the danger is disappearing. The palette is pushed *up*, the rim
 *             light does the work of drawing the silhouette off the page, and
 *             the exposure is held back so the warm metal does not blow out.
 *
 * The additive glows are the sharpest case. Additive blending against white is
 * a no-op — white is already the maximum, so nothing can be added to it — which
 * is why the halo and the embers were invisible on the light ground and lit up
 * on the dark one. On white they blend normally instead, so they are drawn as
 * warm marks *on* the page rather than as light added to it.
 */
interface Ground {
  /** Equirectangular sky, top to bottom, as canvas gradient stops. */
  sky: [number, string][];
  exposure: number;
  ambient: number;
  keyIntensity: number;
  rimColor: number;
  rimIntensity: number;
  /** Mirror-finish metal: rings, mala, throne rim. */
  gold: number;
  goldRoughness: number;
  /** The broad flat petals, kept diffuse — see the whorl materials below. */
  goldPetal: number;
  saffron: number;
  saffronLight: number;
  nila: number;
  core: number;
  /** The soft bloom around the bindu. */
  halo: { color: number; opacity: number; scale: number; additive: boolean };
  ember: { color: number; opacity: number; size: number; additive: boolean };
}

const GROUNDS: Record<Theme, Ground> = {
  light: {
    // A true horizon, not a white room. The old sky was near-white through its
    // whole upper half, so the gold reflected white on top and white below and
    // came out as beige card. Warm above, deep nila below, and the same metal
    // now has a bright edge and a dark belly — which is what gold looks like.
    sky: [
      [0, "#fff4de"],
      [0.3, "#ffdca1"],
      [0.5, "#c8d2ec"],
      [0.72, "#3a5cb0"],
      [1, "#101a3d"],
    ],
    // Under 1, so colour survives the tone map instead of being pushed to the
    // top of the curve where everything turns pale.
    exposure: 0.94,
    // Low, deliberately. Ambient fill is what flattens an object against a
    // bright page; without it the petals keep a shadowed side and a silhouette.
    ambient: 0.2,
    keyIntensity: 2.7,
    rimColor: NILA_LIGHT,
    rimIntensity: 1.5,
    gold: 0xd9a33c,
    goldRoughness: 0.18,
    goldPetal: 0xe6b757,
    // Flame-600 and 500 rather than 500 and 400: on white the brighter pair
    // read as pastel, and saffron that reads as pastel is not saffron.
    saffron: SAFFRON_DEEP,
    saffronLight: SAFFRON,
    nila: NILA,
    core: 0xffcf8a,
    // Tighter and lighter than the additive version: warm ink laid over the
    // page reaches full strength immediately, where added light never does.
    halo: { color: 0xf98c1d, opacity: 0.42, scale: 0.8, additive: false },
    ember: { color: 0xd97a12, opacity: 0.55, size: 0.05, additive: false },
  },
  dark: {
    // A lamp above, not a sky. Reusing the white sky here would make the
    // mandala glow like a lightbox cut out of the page; dropping the sky to
    // match the page would kill the gold outright.
    sky: [
      [0, "#f4dcae"],
      [0.36, "#8d7549"],
      [0.62, "#22305a"],
      [1, "#080f24"],
    ],
    exposure: 0.92,
    ambient: 0.16,
    keyIntensity: 2.1,
    rimColor: 0x6f92da,
    rimIntensity: 1.7,
    gold: GOLD,
    goldRoughness: 0.24,
    goldPetal: 0xf0cd85,
    saffron: SAFFRON,
    saffronLight: 0xfa9938,
    // The throne is the darkest thing in the scene; on the dark ground it has
    // to step up a rung or it merges with the page behind the flower.
    nila: 0x33509b,
    core: 0xffd9a0,
    halo: { color: SAFFRON, opacity: 0.75, scale: 1.15, additive: true },
    ember: { color: 0xf6e3b4, opacity: 0.85, size: 0.045, additive: true },
  },
};

/**
 * The world the metal reflects.
 *
 * A metallic surface with no environment reflects nothing and renders as dark
 * grey — gold in particular dies without one. Rather than ship an HDR, this
 * paints an equirectangular gradient from the ground's `sky` stops, which are
 * the palette the page is built from. The gold then picks up warm light on its
 * upper curve and deep blue underneath, and that split is what makes it read as
 * metal rather than as paint.
 */
function paletteEnvironment(
  renderer: THREE.WebGLRenderer,
  ground: Ground
): THREE.Texture | null {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 128;

  const context = canvas.getContext("2d");
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, 0, 128);
  for (const [offset, colour] of ground.sky) gradient.addColorStop(offset, colour);
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(texture);
  texture.dispose();
  pmrem.dispose();

  return target.texture;
}

/**
 * A soft round falloff, used for the bindu's halo and for every ember.
 *
 * Points without a map render as hard squares, and a sphere without one renders
 * as a disc with an edge. Both want the same thing — bright at the centre,
 * nothing at the rim — so one texture serves both, drawn white and tinted per
 * use by the material's colour.
 */
function glowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (context) {
    const half = size / 2;
    const gradient = context.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.22, "rgba(255,255,255,0.72)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.2)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A lotus petal in the XY plane: base at the origin, tip at +Y. */
function petalShape(width: number, height: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width, height * 0.12, width * 0.74, height * 0.7, 0, height);
  shape.bezierCurveTo(-width * 0.74, height * 0.7, -width, height * 0.12, 0, 0);
  return shape;
}

/**
 * Extrudes a petal and pushes it out to `radius`, so a whorl can be built by
 * cloning one geometry and rotating each copy about Z.
 */
function petalGeometry(
  width: number,
  height: number,
  radius: number,
  depth: number
): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(petalShape(width, height), {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.9,
    bevelSize: width * 0.08,
    bevelSegments: 3,
    curveSegments: 14,
  });
  geometry.translate(0, radius, -depth / 2);
  return geometry;
}

/** One ring of petals, each tilted out of plane so the whorl has volume. */
function whorl(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  count: number,
  tilt: number,
  offset = 0
): THREE.Group {
  const group = new THREE.Group();

  for (let index = 0; index < count; index += 1) {
    const pivot = new THREE.Object3D();
    pivot.rotation.z = offset + (index / count) * Math.PI * 2;

    const petal = new THREE.Mesh(geometry, material);
    petal.rotation.x = tilt;
    pivot.add(petal);
    group.add(pivot);
  }

  return group;
}

export default function Mandala3D({
  className,
  onReady,
  theme = "light",
}: {
  className?: string;
  /** Fires once the first frame is on screen, so the flat fallback can retire. */
  onReady?: () => void;
  /**
   * The ground the canvas is sitting on. Changing it rebuilds the scene — the
   * environment map is baked through PMREM and the exposure is set at build
   * time, so a switch is cheaper to express as a teardown than as a dozen live
   * mutations that would have to be kept in step by hand.
   */
  theme?: Theme;
}) {
  const host = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ground = GROUNDS[theme];

    // ── renderer ──────────────────────────────────────────────
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      // No WebGL. The SVG fallback underneath stays visible; nothing to do.
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = ground.exposure;

    const scene = new THREE.Scene();
    const environment = paletteEnvironment(renderer, ground);
    if (environment) scene.environment = environment;

    const camera = new THREE.PerspectiveCamera(
      38,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      100
    );
    camera.position.set(0, 0, 9.3);

    /** Everything hangs off this, so pointer parallax moves one object. */
    const world = new THREE.Group();
    scene.add(world);

    // ── materials ─────────────────────────────────────────────
    const disposables: { dispose(): void }[] = [];
    const track = <T extends { dispose(): void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    const goldMaterial = track(
      new THREE.MeshStandardMaterial({
        color: ground.gold,
        metalness: 0.94,
        roughness: ground.goldRoughness,
        emissive: new THREE.Color(0x2a1a04),
      })
    );

    const goldPetalMaterial = track(
      new THREE.MeshStandardMaterial({
        color: ground.goldPetal,
        // Kept well below the rings': a petal presents a broad flat face to the
        // camera, and at mirror metalness that face reflects the blue band of
        // the environment and reads olive. Diffuse gold survives every angle.
        metalness: 0.48,
        roughness: 0.34,
        emissive: new THREE.Color(0x3a2408),
      })
    );

    const saffronMaterial = track(
      new THREE.MeshStandardMaterial({
        color: ground.saffron,
        metalness: 0.32,
        roughness: 0.38,
        emissive: new THREE.Color(SAFFRON_DEEP).multiplyScalar(0.16),
      })
    );

    const nilaMaterial = track(
      new THREE.MeshStandardMaterial({
        color: ground.nila,
        metalness: 0.68,
        roughness: 0.32,
        emissive: new THREE.Color(0x060b1c),
      })
    );

    const saffronLightMaterial = track(
      new THREE.MeshStandardMaterial({
        color: ground.saffronLight,
        metalness: 0.3,
        roughness: 0.42,
        emissive: new THREE.Color(SAFFRON_DEEP).multiplyScalar(0.12),
      })
    );

    // ── 1. the mala: the outermost circle, counted in beads ───
    const outerRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(3.05, 0.03, 14, 180)),
      goldMaterial
    );
    world.add(outerRing);

    const beadGeometry = track(new THREE.SphereGeometry(0.058, 14, 14));
    const beads = new THREE.InstancedMesh(beadGeometry, goldMaterial, 54);
    const beadMatrix = new THREE.Matrix4();
    for (let index = 0; index < 54; index += 1) {
      const angle = (index / 54) * Math.PI * 2;
      beadMatrix.setPosition(Math.cos(angle) * 3.05, Math.sin(angle) * 3.05, 0);
      beads.setMatrixAt(index, beadMatrix);
    }
    beads.instanceMatrix.needsUpdate = true;
    world.add(beads);

    // ── 2. the aureole: a ring of outward flames ──────────────
    // The prabhamandala behind a shrine figure. It fills the gap between the
    // mala and the flower, which otherwise reads as a hole in the composition.
    const flameGeometry = track(petalGeometry(0.15, 0.58, 2.38, 0.045));
    const aureole = whorl(flameGeometry, goldPetalMaterial, 32, 0);
    world.add(aureole);

    const aureoleRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(2.34, 0.022, 12, 150)),
      goldMaterial
    );
    world.add(aureoleRing);

    // ── 3. two tilted rings, for depth ────────────────────────
    // Concentric rather than crossed at the centre — crossed ellipses of equal
    // radius read as an atom, which is the one association to avoid here.
    const crossRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(2.92, 0.024, 12, 150)),
      goldMaterial
    );
    crossRing.rotation.x = Math.PI / 2.6;
    world.add(crossRing);

    const tiltRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(2.74, 0.02, 12, 150)),
      goldMaterial
    );
    tiltRing.rotation.y = Math.PI / 2.9;
    tiltRing.rotation.z = 0.4;
    world.add(tiltRing);

    // ── 4. outer whorl: sixteen saffron petals, alternating tone ─
    const outerPetalGeometry = track(petalGeometry(0.4, 1.42, 0.86, 0.07));
    const outerWhorl = new THREE.Group();
    for (let index = 0; index < OUTER_PETALS; index += 1) {
      const pivot = new THREE.Object3D();
      pivot.rotation.z = (index / OUTER_PETALS) * Math.PI * 2;
      const petal = new THREE.Mesh(
        outerPetalGeometry,
        index % 2 === 0 ? saffronMaterial : saffronLightMaterial
      );
      petal.rotation.x = -0.26;
      pivot.add(petal);
      outerWhorl.add(pivot);
    }
    world.add(outerWhorl);

    // ── 5. inner whorl: eight gold petals, offset between them ─
    const innerPetalGeometry = track(petalGeometry(0.26, 0.8, 0.42, 0.055));
    const innerWhorl = whorl(
      innerPetalGeometry,
      goldPetalMaterial,
      INNER_PETALS,
      -0.5,
      Math.PI / INNER_PETALS
    );
    // Forward of the throne, or the throne disc swallows it.
    innerWhorl.position.z = 0.14;
    world.add(innerWhorl);

    // ── 6. the throne: a small blue disc the bindu sits on ────
    const throne = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.5, 0.56, 0.1, 64)),
      nilaMaterial
    );
    throne.rotation.x = Math.PI / 2;
    throne.position.z = -0.1;
    world.add(throne);

    const throneRim = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.53, 0.02, 12, 80)),
      goldMaterial
    );
    throneRim.position.z = -0.06;
    world.add(throneRim);

    // ── 5. the bindu ──────────────────────────────────────────
    const coreMaterial = track(
      new THREE.MeshStandardMaterial({
        color: ground.core,
        emissive: new THREE.Color(SAFFRON),
        emissiveIntensity: 1.5,
        metalness: 0.1,
        roughness: 0.45,
      })
    );
    const core = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.3, 3)), coreMaterial);
    world.add(core);

    // The flame around the bindu, as a camera-facing sprite with a soft radial
    // falloff. It was a hard-edged sphere with additive blending, which meant
    // it contributed nothing at all on the white ground; drawn from a falloff
    // texture it works under either blend mode, so each ground can pick the one
    // that actually shows — added light on nila, warm ink on white.
    const glow = track(glowTexture());
    const haloMaterial = track(
      new THREE.SpriteMaterial({
        map: glow,
        color: ground.halo.color,
        transparent: true,
        opacity: ground.halo.opacity,
        blending: ground.halo.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
        // A flat quad through the middle of a flower intersects its petals; the
        // depth test would slice the glow along those seams. Drawn last and
        // untested, it lies over the centre the way a bloom does.
        depthTest: false,
      })
    );
    const haloScale = 2.6 * ground.halo.scale;
    const halo = new THREE.Sprite(haloMaterial);
    halo.scale.setScalar(haloScale);
    halo.renderOrder = 10;
    world.add(halo);

    // ── 6. embers ─────────────────────────────────────────────
    const emberPositions = new Float32Array(EMBER_COUNT * 3);
    /** Per-ember rise speed, so the drift never looks like one sheet moving. */
    const emberSpeeds = new Float32Array(EMBER_COUNT);

    for (let index = 0; index < EMBER_COUNT; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.6 + Math.random() * 3.6;
      emberPositions[index * 3] = Math.cos(angle) * radius;
      emberPositions[index * 3 + 1] = -3.2 + Math.random() * 7;
      emberPositions[index * 3 + 2] = (Math.random() - 0.5) * 3.4;
      emberSpeeds[index] = 0.09 + Math.random() * 0.2;
    }

    const emberGeometry = track(new THREE.BufferGeometry());
    emberGeometry.setAttribute("position", new THREE.BufferAttribute(emberPositions, 3));

    // Same story as the halo: additive embers were invisible over white. They
    // also carry the falloff texture now, so each one is a soft mote instead of
    // the hard square an unmapped point renders as.
    const embers = new THREE.Points(
      emberGeometry,
      track(
        new THREE.PointsMaterial({
          map: glow,
          color: ground.ember.color,
          size: ground.ember.size,
          transparent: true,
          opacity: ground.ember.opacity,
          blending: ground.ember.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
          depthWrite: false,
          sizeAttenuation: true,
        })
      )
    );
    scene.add(embers);

    // ── light ─────────────────────────────────────────────────
    // Ambient fill is what flattens an object against its page, so both grounds
    // keep it low and let the key carry the form.
    scene.add(new THREE.AmbientLight(0xffffff, ground.ambient));

    const key = new THREE.DirectionalLight(0xfff2dd, ground.keyIntensity);
    key.position.set(3.4, 4.2, 5.5);
    scene.add(key);

    // Cool rim from behind, drawing a blue edge down one side of the gold. On
    // white that edge is the darkest thing on the silhouette and is what lifts
    // it off the page; on nila it is the brightest, and does the same job in
    // reverse.
    const rim = new THREE.DirectionalLight(ground.rimColor, ground.rimIntensity);
    rim.position.set(-4.5, -2, -3.5);
    scene.add(rim);

    // The bindu lights its own petals.
    const coreLight = new THREE.PointLight(SAFFRON, 3.2, 7, 2);
    world.add(coreLight);

    // ── motion ────────────────────────────────────────────────
    const pointer = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      pointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    };
    if (!reducedMotion) window.addEventListener("pointermove", onPointerMove, { passive: true });

    const clock = new THREE.Clock();
    let frame = 0;
    let visible = true;
    let announced = false;

    /** Called after the first successful draw, once. */
    const announce = () => {
      if (announced) return;
      announced = true;
      ready.current?.();
    };

    const renderFrame = () => {
      const elapsed = clock.getElapsedTime();
      const delta = Math.min(clock.getDelta(), 0.05);

      // Counter-rotation: the whorls turn one way, the rings the other, so the
      // eye reads depth without anything moving fast enough to distract.
      outerWhorl.rotation.z = elapsed * 0.055;
      innerWhorl.rotation.z = -elapsed * 0.09;
      aureole.rotation.z = -elapsed * 0.022;
      outerRing.rotation.z = -elapsed * 0.03;
      beads.rotation.z = -elapsed * 0.03;
      crossRing.rotation.z = elapsed * 0.11;
      tiltRing.rotation.z = 0.4 - elapsed * 0.13;
      core.rotation.y = elapsed * 0.22;
      core.rotation.x = elapsed * 0.14;

      // The breath: a slow pulse on the core and its glow. The halo pulses
      // about its own base size, which the ground sets, not about 1.
      const breath = 1 + Math.sin(elapsed * 0.9) * 0.055;
      core.scale.setScalar(breath);
      halo.scale.setScalar(haloScale * (1 + Math.sin(elapsed * 0.9) * 0.09));
      coreMaterial.emissiveIntensity = 1.35 + Math.sin(elapsed * 0.9) * 0.3;
      coreLight.intensity = 3 + Math.sin(elapsed * 0.9) * 0.7;

      // Embers rise and wrap.
      const positions = emberGeometry.attributes.position as THREE.BufferAttribute;
      for (let index = 0; index < EMBER_COUNT; index += 1) {
        const y = positions.getY(index) + emberSpeeds[index] * delta;
        positions.setY(index, y > 3.8 ? -3.4 : y);
      }
      positions.needsUpdate = true;

      // Parallax, eased so it lags the cursor rather than tracking it.
      eased.x += (pointer.x - eased.x) * 0.045;
      eased.y += (pointer.y - eased.y) * 0.045;
      world.rotation.y = eased.x * 0.26;
      world.rotation.x = eased.y * 0.2;
      world.position.y = Math.sin(elapsed * 0.5) * 0.07;

      renderer.render(scene, camera);
      announce();
    };

    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (visible) renderFrame();
    };

    if (reducedMotion) {
      // One frame, held. Everything is still in its rest pose.
      renderer.render(scene, camera);
      announce();
    } else {
      loop();
    }

    // ── responsiveness & lifecycle ────────────────────────────
    const resize = new ResizeObserver(() => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      if (reducedMotion) renderer.render(scene, camera);
    });
    resize.observe(mount);

    // Scrolled past: stop rendering entirely rather than burning a GPU
    // on something nobody is looking at.
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    observer.observe(mount);

    const onVisibility = () => {
      visible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      environment?.dispose();
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [theme]);

  return <div ref={host} className={className} aria-hidden />;
}
