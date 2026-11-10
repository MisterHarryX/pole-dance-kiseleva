import { contacts, marquee } from './config/site.ts';
import { Announcement, ClickSparkles, CursorRing, Intro } from './components/layout/Extras.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { Header } from './components/layout/Header.tsx';
import { MobileBar, PoleProgress } from './components/layout/PoleProgress.tsx';
import { Directions } from './components/sections/Directions.tsx';
import { Gallery } from './components/sections/Gallery.tsx';
import { Hero, Marquee } from './components/sections/Hero.tsx';
import { Care, Promos, Team } from './components/sections/People.tsx';
import { Prices } from './components/sections/Prices.tsx';
import { Studio } from './components/sections/Studio.tsx';
import { Contacts } from './components/sections/Contacts.tsx';
import { Faq, FirstVisit, Reviews } from './components/sections/Visit.tsx';
import { GoldDefs } from './components/ui/Art.tsx';
import { LightboxProvider } from './components/ui/Lightbox.tsx';
import { useReveal } from './hooks/useReveal.ts';

export function App() {
  useReveal();
  return (
    <LightboxProvider>
      <GoldDefs />
      <Intro />
      <a className="skip-link" href="#main">
        Перейти к содержанию
      </a>
      <Header />
      <PoleProgress />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Marquee items={marquee} />
        <Studio />
        <Directions />
        <Gallery />
        <Prices />
        <Promos />
        <Team />
        <Care />
        <FirstVisit />
        <Reviews />
        <Faq />
        <Contacts />
      </main>
      <Footer />
      <MobileBar phoneHref={contacts.phoneHref} booking={contacts.booking} />
      <Announcement />
      <ClickSparkles />
      <CursorRing />
    </LightboxProvider>
  );
}
