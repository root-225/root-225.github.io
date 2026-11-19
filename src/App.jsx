import { useState } from 'react'
import { MotionConfig } from 'motion/react'
import profile from './data/profile.json'
import Radar from './components/Radar.jsx'
import Hero from './components/Hero.jsx'
import Projects from './components/Projects.jsx'
import { About, Contact, Skills, SocialLinks, Timeline } from './components/Sections.jsx'
import Icon from './components/Icon.jsx'

const YEAR = new Date().getFullYear()

const NAV = [
  ['#resume', 'Résumé'],
  ['#competences', 'Compétences'],
  ['#projets', 'Projets'],
  ['#parcours', 'Parcours'],
  ['#contact', 'Contact'],
]

function Header() {
  const [open, setOpen] = useState(false)
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/70 bg-bg/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#top" className="font-display text-lg font-bold tracking-wide">
          <span className="text-cyan">&gt;_</span> {profile.alias}
        </a>
        <nav aria-label="Navigation principale" className="hidden md:block">
          <ul className="flex gap-6 text-sm">
            {NAV.map(([href, label]) => (
              <li key={href}>
                <a href={href} className="text-muted transition hover:text-cyan">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <a href={profile.cv.pdf} download className="hidden items-center gap-2 border border-orange/60 px-3 py-1.5 text-sm text-orange hover:bg-orange/10 sm:inline-flex">
            <Icon name="download" className="size-4" /> CV
          </a>
          <button
            type="button"
            className="border border-line px-3 py-1.5 text-sm md:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Fermer' : 'Menu'}
          </button>
        </div>
      </div>
      {open && (
        <nav id="menu-mobile" aria-label="Navigation mobile" className="border-t border-line bg-bg md:hidden">
          <ul className="px-4 py-2">
            {NAV.map(([href, label]) => (
              <li key={href}>
                <a href={href} onClick={() => setOpen(false)} className="block py-3 text-ink">
                  {label}
                </a>
              </li>
            ))}
            <li>
              <a href={profile.cv.pdf} download className="block py-3 text-orange">
                Télécharger mon CV
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p>
            © {YEAR} {profile.name} · <span className="text-orange">{profile.alias}</span>
          </p>
          <p className="mt-1 text-xs">
            Construit à Abidjan · <a href="/lettreking/confidentialite.html" className="underline hover:text-cyan">Confidentialité LettreKing</a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`mailto:${profile.email}`} className="flex items-center justify-center border border-line p-3 hover:border-cyan hover:text-cyan">
            <Icon name="mail" />
            <span className="sr-only">Email</span>
          </a>
          <SocialLinks />
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="grain">
        <a href="#resume" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:bg-orange focus:px-3 focus:py-2 focus:text-bg">
          Aller au contenu
        </a>
        <Radar />
        <Header />
        <main>
          <Hero />
          <About />
          <Skills />
          <Projects />
          <Timeline />
          <Contact />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  )
}
