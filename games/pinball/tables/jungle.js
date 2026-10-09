// Jungle Temple: placeholder layout (Phase 2 builds the full table). See ../README.md.
import { stubTable } from './stub.js';
const SAMPLES = { nebula: 1024000, pirate: 983040, jungle: 886154, neon: 714419 }['jungle'];
export default stubTable({
  id: 'jungle', name: "Jungle Temple", short: 'JUNGLE', desc: "Ramps and ruins deep in the jungle.", color: '#f59e0b', diff: 2,
  music: { url: '../sounds/pinball/jungle.mp3', samples: SAMPLES, rate: 32000 },
  theme: { pf0: '#0e1e10', pf1: '#284a20', accent: '#f59e0b', pop: '#f59e0b', env: ['#ffd9a8', '#f59e0b', '#9ab0ff'] }
});
