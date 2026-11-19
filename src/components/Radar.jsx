import { useEffect, useRef } from 'react'

const GAP = 30
const REACH = 180

// Ambient dot grid: cyan dots light up near the pointer, an orange scan line sweeps down.
export default function Radar() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const pointer = { x: -1e4, y: -1e4 }
    let w = 0, h = 0, raf = 0, last = 0

    const dot = (x, y, s) => ctx.fillRect(x - s / 2, y - s / 2, s, s)

    const draw = (t) => {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(43,228,240,0.07)'
      for (let x = 0; x <= w; x += GAP) for (let y = 0; y <= h; y += GAP) dot(x, y, 1)

      if (!reduce) {
        const sweepY = ((t / 9000) % 1) * (h + 200) - 100
        const row0 = Math.max(0, Math.floor((sweepY - 60) / GAP))
        for (let y = row0 * GAP; y <= sweepY + 60 && y <= h; y += GAP) {
          ctx.fillStyle = `rgba(255,138,31,${0.35 * (1 - Math.abs(y - sweepY) / 60)})`
          for (let x = 0; x <= w; x += GAP) dot(x, y, 1.4)
        }
      }

      const x0 = Math.max(0, Math.floor((pointer.x - REACH) / GAP)) * GAP
      const y0 = Math.max(0, Math.floor((pointer.y - REACH) / GAP)) * GAP
      for (let x = x0; x <= pointer.x + REACH && x <= w; x += GAP)
        for (let y = y0; y <= pointer.y + REACH && y <= h; y += GAP) {
          const near = 1 - Math.hypot(x - pointer.x, y - pointer.y) / REACH
          if (near <= 0) continue
          ctx.fillStyle = `rgba(43,228,240,${near * 0.6})`
          dot(x, y, 1 + near * 1.4)
        }
    }

    const loop = (t) => {
      raf = requestAnimationFrame(loop)
      if (t - last < 33) return // ~30 fps is plenty for ambience
      last = t
      draw(t)
    }

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(performance.now())
    }

    const move = (e) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      if (reduce) draw(0)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', move, { passive: true })
    if (!reduce) raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', move)
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
}
