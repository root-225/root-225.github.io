import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import profile from '../data/profile.json'
import skills from '../data/skills.json'
import Icon from './Icon.jsx'

const CMD = `scan --target ${profile.alias} --profile full`
const ROWS = [
  { tone: 'ok', text: `[+] hôte actif · ${profile.location} · +225` },
  { tone: 'ok', text: `[+] ${skills.length} services exposés` },
  ...skills.map((s) => ({ tone: 'row', text: `    ${`${s.port}/tcp`.padEnd(10)}ouvert  ${s.title.toLowerCase()}` })),
  { tone: 'warn', text: '[!] identité confirmée :' },
]
const TONE = { ok: 'text-ok', row: 'text-muted', warn: 'text-orange' }
const GLYPHS = '01<>/\\[]{}#$%&*+=?!_'

function Scramble({ text, run, delay = 0 }) {
  const reduce = useReducedMotion()
  const [out, setOut] = useState(text)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!run || reduce) return
    let raf = 0
    let t0 = null
    const step = (t) => {
      t0 ??= t
      const elapsed = t - t0 - delay
      let s = ''
      let done = true
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ' || elapsed >= i * 45 + 220) s += text[i]
        else {
          done = false
          s += elapsed < 0 ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0]
        }
      }
      setOut(s)
      setShown(true)
      if (!done) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    // Safety net: if rAF is throttled (background tab, headless renderer), still land on the real text.
    const fallback = setTimeout(() => {
      cancelAnimationFrame(raf)
      setOut(text)
      setShown(true)
    }, delay + text.length * 45 + 900)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(fallback)
    }
  }, [run, reduce, text, delay])

  if (reduce) return <span>{text}</span>
  return <span className={shown ? undefined : 'invisible'}>{out}</span>
}

export default function Hero() {
  const reduce = useReducedMotion()
  const [typedState, setTyped] = useState(0)
  const [rowsState, setRows] = useState(0)
  const [doneState, setDone] = useState(false)
  const typed = reduce ? CMD.length : typedState
  const rows = reduce ? ROWS.length : rowsState
  const done = reduce || doneState
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, -80])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  useEffect(() => {
    if (reduce) return
    const timers = []
    let t = 350
    for (let i = 1; i <= CMD.length; i++, t += 22) timers.push(setTimeout(() => setTyped(i), t))
    t += 200
    for (let r = 1; r <= ROWS.length; r++, t += 90) timers.push(setTimeout(() => setRows(r), t))
    timers.push(setTimeout(() => setDone(true), t))
    return () => timers.forEach(clearTimeout)
  }, [reduce])

  return (
    <section ref={ref} id="top" className="relative mx-auto flex min-h-svh max-w-6xl flex-col justify-center px-4 pt-28 pb-16 sm:px-6">
      <div className="grid items-end gap-10 lg:grid-cols-[1.7fr_1fr]">
        <motion.div style={reduce ? undefined : { y, opacity: fade }}>
          <pre aria-hidden="true" className="mb-8 overflow-hidden text-[11.5px] leading-relaxed whitespace-pre-wrap sm:text-[13px]">
            <span className="text-cyan">root@225</span>
            <span className="text-muted">:~$ </span>
            <span className={typed < CMD.length ? 'caret' : undefined}>{CMD.slice(0, typed)}</span>
            {ROWS.slice(0, rows).map((r) => (
              <span key={r.text} className={`block ${TONE[r.tone]}`}>
                {r.text}
              </span>
            ))}
          </pre>

          <p className="mb-2 text-sm tracking-[0.3em] text-orange uppercase">{profile.alias}</p>
          <h1 aria-label={profile.name} className="font-display text-ink uppercase">
            <span aria-hidden="true" className="block text-[clamp(1.4rem,4.2vw,2.9rem)] leading-tight font-medium tracking-[0.12em]">
              <Scramble text={profile.firstNames} run={done} />
            </span>
            <span aria-hidden="true" className="block whitespace-nowrap text-[clamp(3.2rem,13vw,8.6rem)] leading-[0.86] font-bold tracking-tight">
              <Scramble text={profile.lastName} run={done} delay={300} />
              <span className={done ? 'caret' : 'invisible'} />
            </span>
          </h1>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={done ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <p className="mt-6 max-w-xl text-base text-ink/90">
              {profile.role}. Rust, intelligence artificielle et sécurité informatique : des outils utiles, sécurisés et accessibles.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#projets" className="inline-flex items-center gap-2 bg-orange px-5 py-3 font-semibold text-bg transition hover:bg-orange/85">
                Voir les projets <Icon name="arrow" className="size-4" />
              </a>
              <a
                href={profile.cv.pdf}
                download
                className="inline-flex items-center gap-2 border border-cyan/50 px-5 py-3 text-cyan transition hover:border-cyan hover:bg-cyan/10"
              >
                <Icon name="download" className="size-4" /> Télécharger mon CV
              </a>
            </div>
          </motion.div>
        </motion.div>

        <motion.aside
          aria-label="Fiche d'identité"
          className="panel p-5 text-sm"
          initial={reduce ? false : { opacity: 0, x: 20 }}
          animate={done ? { opacity: 1, x: 0 } : undefined}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <p className="mb-4 flex items-center justify-between text-xs tracking-widest text-muted uppercase">
            <span>Fiche cible</span>
            <span className="text-cyan">ID 225-R01</span>
          </p>
          <dl className="space-y-3">
            {profile.facts.map((f) => (
              <div key={f.k} className="grid grid-cols-[6.5rem_1fr] gap-2 border-b border-line pb-3 last:border-0">
                <dt className="text-muted">{f.k}</dt>
                <dd>{f.v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 flex items-center gap-2 text-ok">
            <span className="pulse-dot inline-block size-2 rounded-full bg-ok" />
            Ouvert aux missions et collaborations
          </p>
        </motion.aside>
      </div>
    </section>
  )
}
