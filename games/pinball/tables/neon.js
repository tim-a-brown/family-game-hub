// Neon Nights: placeholder layout (Phase 2 builds the full table). See ../README.md.
import { stubTable } from './stub.js';
const SAMPLES = { nebula: 1024000, pirate: 983040, jungle: 886154, neon: 714419 }['neon'];
export default stubTable({
  id: 'neon', name: "Neon Nights", short: 'NEON', desc: "Synthwave lights after dark.", color: '#f472b6', diff: 2,
  music: { url: '../sounds/pinball/neon.mp3', samples: SAMPLES, rate: 32000 },
  theme: { pf0: '#120820', pf1: '#2a1040', accent: '#f472b6', pop: '#f472b6', env: ['#ffd9a8', '#f472b6', '#9ab0ff'] }
});
