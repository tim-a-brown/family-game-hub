// Midway Mayhem: placeholder layout (Phase 2 builds the full table). See ../README.md.
import { stubTable } from './stub.js';
const SAMPLES = { nebula: 1024000, pirate: 983040, jungle: 886154, neon: 714419 }['midway'];
export default stubTable({
  id: 'midway', name: "Midway Mayhem", short: 'MIDWAY', desc: "Step right up to the carnival.", color: '#ef4444', diff: 2,
  
  theme: { pf0: '#2a0e10', pf1: '#4a1a20', accent: '#ef4444', pop: '#ef4444', env: ['#ffd9a8', '#ef4444', '#9ab0ff'] }
});
