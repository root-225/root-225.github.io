import { useState } from 'react'
import { motion } from 'motion/react'
import profile from '../data/profile.json'
import skills from '../data/skills.json'
import timeline from '../data/timeline.json'
import Icon from './Icon.jsx'

// Reduced-motion visitors get content in its final state immediately, with no fade-in.
const REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const reveal = {
  initial: REDUCED ? false : { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: [0.2, 0.7, 0.2, 1] },
}

export function Section({ id, n, eyebrow, title, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <motion.header {...reveal} className="mb-10 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-baseline sm:gap-6">
        <p className="text-xs tracking-[0.25em] text-orange uppercase">
          §{n} · {eyebrow}
        </p>
        <h2 id={`${id}-title`} className="font-display text-3xl font-bold text-ink sm:text-4xl">
          {title}
        </h2>
      </motion.header>
      {children}
    </section>
  )
}

export function About() {
  return (
    <Section id="resume" n={1} eyebrow="Résumé" title="Qui est derrière l'alias">
      <motion.div {...reveal} className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5 text-lg leading-relaxed">
          <p>
            Je m'appelle <strong className="text-cyan">{profile.name}</strong>, alias <span className="text-orange">{profile.alias}</span>.
            Développeur logiciel basé à Abidjan, je me suis spécialisé dans la cybersécurité.
          </p>
          {profile.bio.map((p) => (
            <p key={p} className="text-ink/85">
              {p}
            </p>
          ))}
        </div>
        <ul className="panel space-y-4 p-6 text-sm">
          <li>
            <span className="block text-xs tracking-widest text-muted uppercase">Aujourd'hui</span>
            J'enseigne la cybersécurité chez GOMYCODE et je prépare un Master en cybersécurité.
          </li>
          <li>
            <span className="block text-xs tracking-widest text-muted uppercase">Je construis</span>
            Des outils en Rust et en Python, des agents IA et des jeux mobiles.
          </li>
          <li>
            <span className="block text-xs tracking-widest text-muted uppercase">Je protège</span>
            Audit, tests d'intrusion et durcissement des systèmes pour les entreprises.
          </li>
        </ul>
      </motion.div>
    </Section>
  )
}

export function Skills() {
  return (
    <Section id="competences" n={2} eyebrow="Résultats du scan" title="Compétences">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {skills.map((m, i) => {
          const core = m.id === 'cyber'
          return (
            <motion.article
              key={m.id}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.06 }}
              className={`panel p-6 ${core ? 'border-orange/40 md:order-first md:col-span-2' : ''}`}
            >
              <p className="mb-3 flex items-center justify-between text-xs text-muted">
                <span>
                  {m.port}/tcp · <span className="text-ok">ouvert</span>
                </span>
                {core && <span className="tracking-widest text-orange uppercase">Module principal</span>}
              </p>
              <h3 className={`mb-5 font-display font-bold text-ink ${core ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>{m.title}</h3>
              <ul className={`grid gap-x-6 gap-y-2 text-sm ${core ? 'sm:grid-cols-2' : 'grid-cols-2'}`}>
                {m.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span aria-hidden="true" className={core ? 'text-orange' : 'text-cyan'}>
                      ›
                    </span>
                    {it}
                  </li>
                ))}
              </ul>
            </motion.article>
          )
        })}
      </div>
    </Section>
  )
}

const fmt = (d) => d?.replace('-', '.') ?? "auj."

export function Timeline() {
  return (
    <Section id="parcours" n={4} eyebrow="Journal" title="Parcours">
      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <ol className="border-l border-line">
          {timeline.entries.map((e, i) => (
            <motion.li
              key={`${e.org}-${e.title}`}
              {...reveal}
              transition={{ ...reveal.transition, delay: i * 0.04 }}
              className="relative grid gap-1 pb-8 pl-6 sm:grid-cols-[8.5rem_1fr] sm:gap-4"
            >
              <span aria-hidden="true" className={`absolute top-2 -left-[5px] size-2.5 ${e.to === null ? 'bg-ok' : 'bg-line'}`} />
              <p className="text-xs text-muted tabular-nums sm:pt-1">
                {fmt(e.from)}
                {e.to !== e.from && <> → {fmt(e.to)}</>}
                <span className={`ml-2 ${e.type === 'edu' ? 'text-cyan' : 'text-orange'}`}>[{e.type === 'edu' ? 'EDU' : 'EXP'}]</span>
              </p>
              <div>
                <h3 className="font-display text-lg font-bold text-ink">{e.title}</h3>
                <p className="text-sm text-cyan">{e.org}</p>
                {e.detail && <p className="mt-1 text-sm text-muted">{e.detail}</p>}
              </div>
            </motion.li>
          ))}
        </ol>
        <motion.aside {...reveal} className="panel h-fit p-6">
          <h3 className="mb-4 font-display text-xl font-bold">Certifications</h3>
          <ul className="space-y-2 text-sm">
            {timeline.certifications.map((c) => (
              <li key={c} className="flex gap-2">
                <span aria-hidden="true" className="text-ok">
                  ✓
                </span>
                {c}
              </li>
            ))}
          </ul>
        </motion.aside>
      </div>
    </Section>
  )
}

export function SocialLinks({ withLabels = false }) {
  return (
    <ul className={withLabels ? 'grid gap-3 sm:grid-cols-2' : 'flex gap-2'}>
      {profile.socials.map((s) => {
        const body = (
          <>
            <Icon name={s.id} />
            {withLabels ? <span>{s.label}</span> : <span className="sr-only">{s.label}</span>}
            {withLabels && !s.url && <span className="ml-auto text-xs text-muted">lien à venir</span>}
          </>
        )
        const cls = `flex items-center gap-3 border border-line p-3 transition ${withLabels ? '' : 'justify-center'}`
        return (
          <li key={s.id}>
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer" className={`${cls} hover:border-cyan hover:text-cyan`}>
                {body}
              </a>
            ) : (
              <span aria-disabled="true" title={`${s.label} : lien à venir`} className={`${cls} opacity-45`}>
                {body}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export function Contact() {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.location.href = `mailto:${profile.email}`
    }
  }

  return (
    <Section id="contact" n={5} eyebrow="Ouvrir un canal" title="Me contacter">
      <motion.div {...reveal} className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="mb-6 max-w-lg text-lg text-ink/85">
            Un audit de sécurité, une application à construire, une formation à organiser ? Écris-moi.
          </p>
          <a
            href={`mailto:${profile.email}`}
            className="block font-display text-[clamp(1.3rem,5vw,2.6rem)] font-bold break-all text-cyan underline decoration-cyan/30 underline-offset-8 hover:decoration-cyan"
          >
            {profile.email}
          </a>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 bg-orange px-5 py-3 font-semibold text-bg hover:bg-orange/85">
              <Icon name="mail" className="size-4" /> Envoyer un email
            </a>
            <button type="button" onClick={copy} className="inline-flex items-center gap-2 border border-line px-5 py-3 hover:border-cyan hover:text-cyan">
              <Icon name="copy" className="size-4" /> {copied ? 'Adresse copiée' : "Copier l'adresse"}
            </button>
            <a href={profile.cv.pdf} download className="inline-flex items-center gap-2 border border-cyan/50 px-5 py-3 text-cyan hover:bg-cyan/10">
              <Icon name="download" className="size-4" /> Télécharger mon CV
            </a>
          </div>
          <p role="status" className="sr-only">
            {copied ? 'Adresse email copiée' : ''}
          </p>
        </div>
        <div>
          <h3 className="mb-4 text-xs tracking-widest text-muted uppercase">Réseaux</h3>
          <SocialLinks withLabels />
        </div>
      </motion.div>
    </Section>
  )
}
