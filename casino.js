// casino.js — shared bankroll across all casino games
// Bankroll stored in localStorage under 'casino_bank'
// Usage: Casino.balance(), Casino.bet(n), Casino.win(n), Casino.reset()

const Casino = (function(){
  const KEY = 'casino_bank';
  const DEFAULT = 1000;

  function balance(){ try{ return parseInt(localStorage.getItem(KEY)) || DEFAULT; } catch(e){ return DEFAULT; } }
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
