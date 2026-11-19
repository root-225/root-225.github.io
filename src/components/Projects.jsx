import { motion } from 'motion/react'
import projects from '../data/projects.json'
import { Section, reveal } from './Sections.jsx'
import Icon from './Icon.jsx'

const STATUS = {
  live: { label: 'Live', cls: 'border-ok/50 text-ok', dot: 'bg-ok pulse-dot' },
  wip: { label: 'Work in progress', cls: 'border-orange/50 text-orange', dot: 'bg-orange' },
  prod: { label: 'In Production', cls: 'border-cyan/50 text-cyan', dot: 'bg-cyan' },
}

const initials = (t) =>
  t
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()

function ProjectLink({ link }) {
  const store = link.kind === 'playstore'
  const icon = { playstore: 'play', github: 'github', doc: 'doc' }[link.kind] ?? 'arrow'
  const base = 'inline-flex items-center gap-2 px-4 py-2.5 text-sm transition'
  const look = store ? 'bg-ok font-semibold text-bg hover:bg-ok/85' : 'border border-line hover:border-cyan hover:text-cyan'

  if (!link.url)
    return (
      <span aria-disabled="true" className={`${base} ${look} cursor-not-allowed opacity-50`}>
        <Icon name={icon} className="size-4" /> {link.label} · bientôt
      </span>
    )

  const external = link.url.startsWith('http')
  return (
    <a href={link.url} {...(external && { target: '_blank', rel: 'noopener noreferrer' })} className={`${base} ${look}`}>
      <Icon name={icon} className="size-4" /> {link.label}
    </a>
  )
}

function Card({ p, i }) {
  const st = STATUS[p.status]
  return (
    <motion.article
      {...reveal}
      transition={{ ...reveal.transition, delay: (i % 2) * 0.08 }}
      className={`panel group flex flex-col transition duration-300 hover:-translate-y-1 hover:border-cyan/40 hover:shadow-[0_0_40px_-12px_rgb(43_228_240/0.35)] ${
        p.status === 'live' ? 'md:col-span-2 md:grid md:grid-cols-[1.2fr_1fr]' : ''
      }`}
    >
      <div className="sweep relative aspect-[16/9] border-b border-line md:border-b-0">
        {p.image ? (
          <img src={p.image} alt={`Capture d'écran de ${p.title}`} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="hatch flex h-full w-full flex-col items-center justify-center gap-2" role="img" aria-label={`Capture de ${p.title} à venir`}>
            <span className="font-display text-6xl font-bold text-line transition group-hover:text-cyan/40">{initials(p.title)}</span>
            <span className="text-xs tracking-widest text-muted uppercase">capture à venir</span>
          </div>
        )}
        <span className="absolute top-3 left-3 bg-bg/80 px-2 py-1 text-[11px] text-muted">{p.ref}</span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
          <span className={`inline-flex items-center gap-2 border px-2 py-1 tracking-wider uppercase ${st.cls}`}>
            <span className={`size-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </span>
          <span className="text-muted">{p.category}</span>
        </div>
        <h3 className="font-display text-2xl font-bold text-ink">{p.title}</h3>
        <p className="mt-2 text-sm text-ink/80">{p.summary}</p>
        <ul className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
          {p.stack.map((s) => (
            <li key={s} className="border border-line px-2 py-0.5">
              {s}
            </li>
          ))}
        </ul>
        {p.links.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            {p.links.map((l) => (
              <ProjectLink key={l.label} link={l} />
            ))}
          </div>
        )}
      </div>
    </motion.article>
  )
}

export default function Projects() {
  return (
    <Section id="projets" n={3} eyebrow="Findings" title="Projets">
      <div className="grid gap-6 md:grid-cols-2">
        {projects.map((p, i) => (
          <Card key={p.id} p={p} i={i} />
        ))}
      </div>
    </Section>
  )
}
