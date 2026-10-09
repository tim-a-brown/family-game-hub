// Nebula Run: placeholder layout (Phase 2 builds the full table). See ../README.md.
import { stubTable } from './stub.js';
const SAMPLES = { nebula: 1024000, pirate: 983040, jungle: 886154, neon: 714419 }['nebula'];
export default stubTable({
  id: 'nebula', name: "Nebula Run", short: 'NEBULA', desc: "A deep-space run through the stars.", color: '#22d3ee', diff: 2,
  music: { url: '../sounds/pinball/nebula.mp3', samples: SAMPLES, rate: 32000 },
  theme: { pf0: '#0a1030', pf1: '#1a2a60', accent: '#22d3ee', pop: '#22d3ee', env: ['#ffd9a8', '#22d3ee', '#9ab0ff'] }
});
