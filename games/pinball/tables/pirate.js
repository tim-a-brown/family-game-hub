// Pirate's Cove: placeholder layout (Phase 2 builds the full table). See ../README.md.
import { stubTable } from './stub.js';
const SAMPLES = { nebula: 1024000, pirate: 983040, jungle: 886154, neon: 714419 }['pirate'];
export default stubTable({
  id: 'pirate', name: "Pirate's Cove", short: 'PIRATE', desc: "Sail for gold on the high seas.", color: '#fbbf24', diff: 2,
  music: { url: '../sounds/pinball/pirate.mp3', samples: SAMPLES, rate: 32000 },
  theme: { pf0: '#10202a', pf1: '#1e4050', accent: '#fbbf24', pop: '#fbbf24', env: ['#ffd9a8', '#fbbf24', '#9ab0ff'] }
});
