import { useEffect, useRef, useState } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  LineBasicMaterial,
  LineDashedMaterial,
  LineLoop,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from 'three'

// Shapes are modelled in Blender (blender/build_hologram.py) and shipped as an int16 point cloud.
export const SHAPES = [
  { name: 'Cauri', note: 'artefact ivoirien' },
  { name: 'Bouclier', note: 'cybersécurité' },
  { name: 'Manette', note: 'jeux mobiles' },
  { name: 'Hélice', note: 'parcours' },
  { name: '225', note: 'signature' },
]
// Section that brings each shape on screen, in scroll order.
const ANCHORS = ['top', 'competences', 'projets', 'parcours', 'contact']
// Where the hologram sits for each shape. x is a fraction of the visible half-width
// (so it adapts to any screen ratio), y in view units, then scale and opacity.
const DESKTOP = [
  { x: 0.5, y: 0.05, s: 1.15, o: 1 },
  { x: -0.72, y: 0, s: 1.1, o: 0.65 }, // side gutters, alternating
  { x: 0.72, y: 0.05, s: 1.05, o: 0.65 },
  { x: -0.72, y: 0, s: 1.15, o: 0.6 },
  { x: 0.7, y: 0, s: 1.0, o: 0.8 },
]
const HALF_HEIGHT = Math.tan((35 / 2) * (Math.PI / 180)) * 6 // camera fov 35, distance 6
const MOBILE = [
  { x: 0, y: 0.6, s: 0.72, o: 0.4 },
  { x: 0, y: 0.2, s: 0.7, o: 0.3 },
  { x: 0, y: 0.2, s: 0.7, o: 0.3 },
  { x: 0, y: 0.2, s: 0.75, o: 0.3 },
  { x: 0, y: 0.45, s: 0.75, o: 0.45 },
]

const vertex = /* glsl */ `
  attribute vec3 aS1;
  attribute vec3 aS2;
  attribute vec3 aS3;
  attribute vec3 aS4;
  attribute vec4 aRand;
  uniform float uTime, uMorph, uIntro, uSize, uScan, uGlitch, uOpacity, uPixelRatio, uAspect;
  uniform vec2 uPointer;
  varying float vAlpha;
  varying float vHot;
  varying float vNear;

  vec3 shapeAt(float i) {
    if (i < 0.5) return position;
    if (i < 1.5) return aS1;
    if (i < 2.5) return aS2;
    if (i < 3.5) return aS3;
    return aS4;
  }

  void main() {
    float m = clamp(uMorph, 0.0, 4.0);
    float i0 = min(floor(m), 3.0);
    float f = m - i0;
    float st = smoothstep(aRand.x * 0.45, aRand.x * 0.45 + 0.55, f); // staggered per point
    vec3 p = mix(shapeAt(i0), shapeAt(i0 + 1.0), st);

    // Turbulence peaks mid-morph, plus a faint breathing at rest.
    float turb = sin(3.14159 * st);
    vec3 n = vec3(
      sin(p.y * 7.0 + uTime * 1.3 + aRand.y * 6.283),
      cos(p.x * 6.0 + uTime * 1.1 + aRand.z * 6.283),
      sin(p.z * 8.0 + uTime * 0.9 + aRand.w * 6.283)
    );
    p += n * (0.2 * turb + 0.008);

    // Intro: points converge from a scattered shell.
    vec3 scatter = normalize(aRand.yzw - 0.5 + 0.001) * (2.4 + aRand.x * 2.2);
    p = mix(scatter, p, smoothstep(aRand.x * 0.4, aRand.x * 0.4 + 0.6, uIntro));

    // Glitch: random horizontal slices jump sideways.
    float slice = floor(p.y * 14.0);
    float hit = step(0.82, fract(sin(slice * 91.7 + floor(uTime * 14.0)) * 43758.5));
    p.x += hit * uGlitch * 0.3 * (fract(sin(slice * 12.9) * 437.5) - 0.5);

    vHot = smoothstep(0.045, 0.0, abs(p.y - uScan)); // orange scan plane

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    vec2 d = clip.xy / clip.w - uPointer;
    float dist = length(d * vec2(uAspect, 1.0));
    vNear = smoothstep(0.32, 0.0, dist);
    clip.xy += normalize(d + 1e-5) * vNear * 0.09 * clip.w; // pointer pushes points away
    gl_Position = clip;

    float size = uSize * (0.55 + aRand.y * 0.9) * (1.0 + vHot * 1.8 + vNear);
    gl_PointSize = size * uPixelRatio * (4.0 / -mv.z);
    vAlpha = uOpacity * (0.5 + 0.5 * aRand.z) * (0.5 + 0.5 * smoothstep(-1.2, 1.0, p.z));
  }
`

const fragment = /* glsl */ `
  uniform vec3 uCyan;
  uniform vec3 uOrange;
  varying float vAlpha;
  varying float vHot;
  varying float vNear;

  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float core = 1.0 - r * 2.0;
    vec3 col = mix(uCyan, uOrange, vHot);
    col = mix(col, vec3(1.0), vNear * 0.35);
    gl_FragColor = vec4(col * (1.0 + vHot * 0.8), core * core * vAlpha * (1.0 + vHot * 1.4));
  }
`

function ring(radius, material, segments = 160) {
  const pos = new Float32Array(segments * 3)
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pos[i * 3] = Math.cos(a) * radius
    pos[i * 3 + 2] = Math.sin(a) * radius
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  const line = new LineLoop(g, material)
  if (material.isLineDashedMaterial) line.computeLineDistances()
  return line
}

function dust(count) {
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16
    pos[i * 3 + 1] = (Math.random() - 0.5) * 10
    pos[i * 3 + 2] = -Math.random() * 8 + 1.5
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  return g
}

const lerp = (a, b, t) => a + (b - a) * t
const smooth = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

async function start(canvas, onShape) {
  let renderer
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: new URLSearchParams(location.search).has('holo'), // debug captures
    })
  } catch {
    return null
  }
  const res = await fetch('/models/hologram.bin')
  if (!res.ok) {
    renderer.dispose()
    return null
  }
  const buf = await res.arrayBuffer()
  const [count, n] = new Uint32Array(buf, 0, 2)
  const raw = new Int16Array(buf, 8, count * n * 3)
  const shape = (i) => {
    const out = new Float32Array(n * 3)
    for (let k = 0; k < n * 3; k++) out[k] = (raw[i * n * 3 + k] / 32767) * 1.05
    return out
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const debug = new URLSearchParams(location.search).get('holo')

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(shape(0), 3))
  for (let i = 1; i < count; i++) geo.setAttribute(`aS${i}`, new BufferAttribute(shape(i), 3))
  const rand = new Float32Array(n * 4)
  for (let k = 0; k < rand.length; k++) rand[k] = Math.random()
  geo.setAttribute('aRand', new BufferAttribute(rand, 4))

  const uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uIntro: { value: reduce ? 1 : 0 },
    uSize: { value: 2.2 },
    uScan: { value: reduce ? 9 : 0 },
    uGlitch: { value: 0 },
    uOpacity: { value: 1 },
    uPixelRatio: { value: 1 },
    uAspect: { value: 1 },
    uPointer: { value: new Vector2(9, 9) },
    uCyan: { value: new Color('#2be4f0') },
    uOrange: { value: new Color('#ff8a1f') },
  }
  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })

  const scene = new Scene()
  const camera = new PerspectiveCamera(35, 1, 0.1, 50)
  camera.position.set(0, 0, 6)

  const rig = new Group()
  const holo = new Points(geo, material)
  holo.frustumCulled = false
  const ringA = ring(1.38, new LineDashedMaterial({ color: '#ff8a1f', transparent: true, opacity: 0.45, dashSize: 0.05, gapSize: 0.08 }))
  const ringB = ring(1.55, new LineBasicMaterial({ color: '#2be4f0', transparent: true, opacity: 0.18 }))
  ringA.rotation.x = 0.35
  ringB.rotation.x = -0.25
  rig.add(holo, ringA, ringB)
  scene.add(rig)

  const field = new Points(
    dust(1400),
    new ShaderMaterial({
      uniforms: { uPixelRatio: uniforms.uPixelRatio, uTime: uniforms.uTime },
      vertexShader: /* glsl */ `
        uniform float uPixelRatio, uTime;
        varying float vA;
        void main() {
          vec3 p = position;
          p.y += mod(uTime * 0.05 + p.x * 0.1, 0.6) - 0.3;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uPixelRatio * 6.0 / -mv.z;
          vA = smoothstep(-9.0, -2.0, mv.z) * 0.35;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          if (length(gl_PointCoord - 0.5) > 0.5) discard;
          gl_FragColor = vec4(0.17, 0.89, 0.94, vA);
        }`,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  )
  scene.add(field)

  // ---------------------------------------------------------------- state
  const pointer = { x: 9, y: 9, tx: 9, ty: 9, rx: 0, ry: 0 }
  let mobile = false
  let anchors = []
  let morph = debug ? Number(debug) : 0
  let target = morph
  let lastShape = -1
  let raf = 0
  let t0 = performance.now()
  let burst = 0
  let nextBurst = 4

  const measure = () => {
    anchors = ANCHORS.map((id) => {
      const el = document.getElementById(id)
      return el ? el.getBoundingClientRect().top + window.scrollY : 0
    })
  }
  const scrollTarget = () => {
    if (debug) return Number(debug)
    const y = window.scrollY + window.innerHeight * 0.45
    for (let i = 0; i < anchors.length - 1; i++) {
      if (y < anchors[i + 1]) return i + smooth(0.55, 0.95, (y - anchors[i]) / (anchors[i + 1] - anchors[i]))
    }
    return anchors.length - 1
  }

  const resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    mobile = w < 768
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    uniforms.uPixelRatio.value = dpr
    uniforms.uAspect.value = w / h
    uniforms.uSize.value = mobile ? 2.6 : 3.2
    measure()
    target = scrollTarget()
    if (reduce) frame(performance.now()) // setSize clears the canvas
  }

  const onScroll = () => {
    target = scrollTarget()
    if (reduce) frame(performance.now())
  }
  const onMove = (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1
    pointer.ty = -(e.clientY / window.innerHeight) * 2 + 1
  }
  const onLeave = () => {
    pointer.tx = 9
    pointer.ty = 9
  }

  const place = (m) => {
    const table = mobile ? MOBILE : DESKTOP
    if (debug) m = 0 // ?holo=N: inspect any shape in the hero slot
    const i = Math.min(Math.floor(m), table.length - 2)
    const f = smooth(0, 1, m - i)
    const a = table[i]
    const b = table[i + 1]
    rig.position.x = lerp(a.x, b.x, f) * HALF_HEIGHT * camera.aspect
    rig.position.y = lerp(a.y, b.y, f)
    rig.scale.setScalar(lerp(a.s, b.s, f))
    uniforms.uOpacity.value = lerp(a.o, b.o, f)
  }

  function frame(now) {
    const t = (now - t0) / 1000
    const dt = Math.min(0.05, t - uniforms.uTime.value)
    uniforms.uTime.value = t

    if (reduce) {
      morph = Math.round(target)
    } else {
      const prev = morph
      morph = lerp(morph, target, 1 - Math.pow(0.001, dt))
      const speed = Math.abs(morph - prev) / Math.max(dt, 1e-3)
      if (t > nextBurst) {
        burst = 0.18
        nextBurst = t + 5 + Math.random() * 6
      }
      burst = Math.max(0, burst - dt)
      uniforms.uGlitch.value = Math.min(1, speed * 1.2 + (burst > 0 ? 1 : 0))
      uniforms.uIntro.value = Math.min(1, t / 2.6)
      uniforms.uScan.value = Math.sin(t * 0.7) * 1.05
    }
    uniforms.uMorph.value = morph
    place(morph)

    pointer.x = lerp(pointer.x === 9 ? pointer.tx : pointer.x, pointer.tx, 0.12)
    pointer.y = lerp(pointer.y === 9 ? pointer.ty : pointer.y, pointer.ty, 0.12)
    uniforms.uPointer.value.set(pointer.x, pointer.y)
    const px = Math.abs(pointer.tx) > 2 ? 0 : pointer.tx
    const py = Math.abs(pointer.ty) > 2 ? 0 : pointer.ty
    pointer.rx = lerp(pointer.rx, py * 0.25, 0.05)
    pointer.ry = lerp(pointer.ry, px * 0.5, 0.05)

    // One full turn per transition, so every shape settles facing the camera; gentle swing at rest.
    holo.rotation.y = morph * Math.PI * 2 + (reduce ? 0.35 : Math.sin(t * 0.35) * 0.6) + pointer.ry
    holo.rotation.x = pointer.rx
    ringA.rotation.y = reduce ? 0 : t * 0.4
    ringB.rotation.y = reduce ? 0 : -t * 0.25
    camera.position.x = lerp(camera.position.x, px * 0.25, 0.04)
    camera.position.y = lerp(camera.position.y, py * 0.15, 0.04)
    camera.lookAt(0, 0, 0)

    const shapeNow = Math.round(morph)
    if (shapeNow !== lastShape) {
      lastShape = shapeNow
      onShape(shapeNow)
    }
    renderer.render(scene, camera)
  }

  const loop = (now) => {
    raf = requestAnimationFrame(loop)
    frame(now)
  }

  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('pointermove', onMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)
  const ro = new ResizeObserver(measure) // section heights change as fonts and images load
  ro.observe(document.body)
  t0 = performance.now()
  if (reduce) frame(t0)
  else raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    window.removeEventListener('resize', resize)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('pointermove', onMove)
    document.documentElement.removeEventListener('pointerleave', onLeave)
    scene.traverse((o) => {
      o.geometry?.dispose()
      o.material?.dispose()
    })
    renderer.dispose()
  }
}

export default function Hologram() {
  const ref = useRef(null)
  const [shape, setShape] = useState(0)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let stop = () => {}
    let cancelled = false
    start(ref.current, setShape).then((fn) => {
      if (!fn) return // no WebGL: the 2D radar stays alone
      if (cancelled) fn()
      else {
        stop = fn
        setReady(true)
      }
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [])

  const s = SHAPES[shape]
  return (
    <>
      <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
      {ready && (
        <p
          aria-hidden="true"
          className="pointer-events-none fixed right-4 bottom-4 z-40 hidden border border-line bg-bg/70 px-3 py-2 text-[11px] tracking-widest text-muted uppercase backdrop-blur-sm sm:block"
        >
          <span className="text-orange">holo</span> 0{shape + 1}/0{SHAPES.length} · <span className="text-cyan">{s.name}</span> · {s.note}
        </p>
      )}
    </>
  )
}
