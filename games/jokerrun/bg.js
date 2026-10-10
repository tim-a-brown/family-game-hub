// ═══════════════════════════════════════════════════════════════════════════
// Balatro (Joker Run) background: a slow paint swirl, drawn tiny in WebGL
// (about 1/6 of the screen) at ~24 fps and scaled up with crisp pixels.
// Paused while the page is hidden; "Background motion" off draws one still frame.
//   JRBg.set([c1, c2, c3])  ease to a new palette (round, boss, shop...)
//   JRBg.kick(n)            spin faster for a moment (big scores)
//   JRBg.motion(bool)       turn the motion on or off
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var cv = document.createElement('canvas');
  cv.id = 'jr-bg'; cv.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(cv, document.body.firstChild);
  var gl = null;
  try { gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: true }); } catch (e) {}
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; }
  var cur = [hex('#a8202e'), hex('#1f5a8a'), hex('#160a1e')], want = cur.map(function (c) { return c.slice(); });
  var on = true, running = false, last = 0, T = 20 + Math.random() * 60, speed = 1, raf = 0;
  var api = { set: function () {}, kick: function () {}, motion: function () {} };
  window.JRBg = api;
  if (!gl) { cv.className = 'static'; api.set = function (p) { cv.style.background = 'radial-gradient(120% 90% at 30% 20%,' + p[0] + ',transparent 70%),radial-gradient(100% 80% at 80% 90%,' + p[1] + ',transparent 70%),' + p[2]; }; return; }

  var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs = [
    'precision mediump float;uniform float t;uniform vec2 r;uniform vec3 c1;uniform vec3 c2;uniform vec3 c3;',
    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*r)/max(r.x,r.y);',
    ' float d0=length(uv);',
    ' vec2 p=uv*3.4;',
    ' float a=atan(p.y,p.x);float d=length(p);',
    ' a+=1.5*d-t*.06;',
    ' p=vec2(cos(a),sin(a))*d;',
    ' for(int i=0;i<4;i++){float f=float(i);p+=.42*vec2(sin(p.y*1.7+t*.21+f),cos(p.x*1.9-t*.17-f*1.3));}',
    ' float v=.5+.5*sin(p.x*1.25+p.y*1.05);',
    ' float w=.5+.5*sin(length(p)*2.1-t*.28);',
    ' vec3 col=mix(c3,c1,smoothstep(.08,.8,v));',
    ' col=mix(col,c2,smoothstep(.45,.98,w)*.75);',
    ' col=floor(col*14.)/14.;',
    ' col*=1.-.75*d0*d0;',
    ' gl_FragColor=vec4(col,1.);',
    '}'].join('\n');
  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.className = 'static'; return; }
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uT = gl.getUniformLocation(pr, 't'), uR = gl.getUniformLocation(pr, 'r');
  var uC = [gl.getUniformLocation(pr, 'c1'), gl.getUniformLocation(pr, 'c2'), gl.getUniformLocation(pr, 'c3')];
  var SC = 1 / 6;
  function size() {
    cv.width = Math.max(8, Math.round(innerWidth * SC)); cv.height = Math.max(8, Math.round(innerHeight * SC));
    gl.viewport(0, 0, cv.width, cv.height);
  }
  function draw() {
    gl.uniform1f(uT, T); gl.uniform2f(uR, cv.width, cv.height);
    for (var i = 0; i < 3; i++) gl.uniform3f(uC[i], cur[i][0], cur[i][1], cur[i][2]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function easeCols(k) {
    var moving = false;
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) { var dlt = want[i][j] - cur[i][j]; if (Math.abs(dlt) > 0.002) { cur[i][j] += dlt * k; moving = true; } else cur[i][j] = want[i][j]; }
    return moving;
  }
  // ~24 fps: the swirl is slow, so this looks smooth and costs little
  function frame(now) {
    raf = 0;
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (now - last < 40) return;
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0.04; last = now;
    T += dt * speed; speed = 1 + (speed - 1) * 0.95;
    easeCols(0.08);
    draw();
  }
  function start() { if (!on || running || document.hidden) return; running = true; last = 0; if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  // with motion off, palette changes still ease in over a few frames, then it sleeps
  var still = 0;
  function settle() { if (on) return; cancelAnimationFrame(still); (function step() { var m = easeCols(0.2); draw(); if (m) still = requestAnimationFrame(step); })(); }
  api.set = function (p) { want = p.map(hex); if (!running) settle(); };
  api.kick = function (n) { speed = Math.max(speed, n || 4); };
  api.motion = function (v) { on = !!v; if (on) start(); else { stop(); settle(); } };
  size(); draw();
  window.addEventListener('resize', function () { size(); draw(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  window.addEventListener('pagehide', stop);
  start();
})();
