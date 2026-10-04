// casino.js — shared bankroll across all casino games
// Bankroll stored in localStorage under 'casino_bank'
// Usage: Casino.balance(), Casino.bet(n), Casino.win(n), Casino.reset()

const Casino = (function(){
  const KEY = 'casino_bank';
  const DEFAULT = 1000;

  // A missing bankroll starts at $1,000; a real $0 stays $0 (not reset).
  function balance(){
    try{ var v = localStorage.getItem(KEY); if(v === null || v === '') return DEFAULT; var n = parseInt(v, 10); return isNaN(n) ? DEFAULT : Math.max(0, n); }
    catch(e){ return DEFAULT; }
  }
  function save(n){
    try{
      localStorage.setItem(KEY, Math.max(0, Math.round(n)));
      if(typeof FGHSync !== 'undefined') FGHSync.noteWrite('casino_bank');
    } catch(e){}
  }
  function bet(n){
    const b = balance();
    if(n > b) return false;
    save(b - n);
    return true;
  }
  function win(n){ save(balance() + Math.round(n)); }
  function reset(){ save(DEFAULT); }

  return { balance, bet, win, reset };
})();
