import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/jost/400.css';
import '@fontsource/jost/500.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/hero.css';
import './styles/sections.css';
import './styles/interactive.css';
import './styles/art.css';
import './styles/studio.css';
import './styles/team.css';
import './styles/extras.css';
import { App } from './App.tsx';
import { applyOverrides, loadOverrides } from './lib/content.ts';
import { startTracking } from './lib/track.ts';

/** Edits published in the panel are applied before the first paint; a slow API never holds the page long. */
async function boot() {
  const overrides = await loadOverrides();
  if (overrides) applyOverrides(overrides);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  requestAnimationFrame(startTracking);
}

void boot();
