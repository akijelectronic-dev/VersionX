/* Sadia AI – dotted 3D globe. API: AV.init(el), AV.set(mode), AV.mood(name), AV.say(), AV.hook */
window.AV = (() => {
  const N = 5200, NR = 600, TOT = N + NR;
  const X = new Float32Array(TOT), Y = new Float32Array(TOT), Z = new Float32Array(TOT), S = new Float32Array(TOT);
  for (let i = 0; i < N; i++) { const k = (i + 0.5) / N, ph = Math.acos(1 - 2 * k), th = Math.PI * (1 + Math.sqrt(5)) * i; X[i] = Math.sin(ph) * Math.cos(th); Y[i] = Math.cos(ph); Z[i] = Math.sin(ph) * Math.sin(th); S[i] = Math.random() * 6.28; }
  for (let j = 0; j < NR; j++) { const i = N + j, a = (j / NR) * 6.2832 * 3, w = 1.28 + (Math.random() - 0.5) * 0.14; X[i] = Math.cos(a) * w; Z[i] = Math.sin(a) * w; Y[i] = (Math.random() - 0.5) * 0.05; S[i] = Math.random() * 6.28; }
  const sx = new Float32Array(TOT), sy = new Float32Array(TOT), ss = new Float32Array(TOT), bk = new Uint8Array(TOT);
  let cv, cx, W = 0, D = 1, mode = 'idle', t = 0, amp = 0, rot = 0, run = false, spin = 0.07, shrink = 1;
  let col = [255, 190, 150], col2 = [140, 90, 255], tc = [255, 190, 150], tc2 = [140, 90, 255];
  const MOODS = { calm: [[255, 190, 150], [140, 90, 255]], happy: [[255, 215, 120], [255, 120, 170]], sad: [[130, 170, 255], [80, 60, 180]], curious: [[80, 255, 200], [120, 160, 255]], angry: [[255, 100, 90], [255, 160, 60]], shy: [[255, 170, 210], [190, 110, 255]] };
  const lerp = (a, b, k) => a + (b - a) * k;
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const rgba = (c, a) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')';
  function size() {
    const r = cv.parentElement.getBoundingClientRect(); D = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(120, Math.min(r.width || 300, r.height || 300)); cv.width = cv.height = Math.round(W * D); cv.style.width = cv.style.height = W + 'px'; cx.setTransform(D, 0, 0, D, 0, 0);
  }
  function frame() {
    t += 0.01;
    const h = typeof api.hook === 'function' ? api.hook() : 0;
    const goal = mode === 'talk' ? Math.max(0.1, h) : mode === 'listen' ? 0.22 + 0.08 * Math.sin(t * 3) : mode === 'think' ? 0.12 : 0.05 + 0.02 * Math.sin(t * 1.4);
    amp = lerp(amp, goal, 0.18); spin = lerp(spin, mode === 'think' ? 0.5 : mode === 'talk' ? 0.16 : 0.07, 0.04); shrink = lerp(shrink, mode === 'think' ? 0.86 : 1, 0.05);
    for (let i = 0; i < 3; i++) { col[i] = lerp(col[i], tc[i], 0.05); col2[i] = lerp(col2[i], tc2[i], 0.05); }
    rot += 0.016 * spin;
    const c = W / 2, R = W * 0.345 * shrink, cy = Math.cos(rot), sy_ = Math.sin(rot), tilt = 0.35 + 0.08 * Math.sin(t * 0.5), ct = Math.cos(tilt), st = Math.sin(tilt);
    cx.globalCompositeOperation = 'source-over'; cx.clearRect(0, 0, W, W);
    cx.globalCompositeOperation = 'lighter';
    const g = cx.createRadialGradient(c, c, R * 0.1, c, c, W * 0.5); g.addColorStop(0, rgba(col, 0.22 + amp * 0.3)); g.addColorStop(0.55, rgba(col2, 0.07)); g.addColorStop(1, rgba(col2, 0)); cx.fillStyle = g; cx.fillRect(0, 0, W, W);
    for (let i = 0; i < TOT; i++) {
      const x = X[i], y = Y[i], z = Z[i], s = S[i], ring = i >= N;
      let n = Math.sin(x * 3 + t * 1.3 + s * 0.2) * Math.sin(y * 3 - t * 1.1) + Math.sin(z * 4 + t * 0.9);
      let d = 0.012 * n + amp * 0.12 * Math.sin(x * 7 + y * 5 + z * 6 + t * (mode === 'talk' ? 9 : 4) + s);
      if (mode === 'listen') d += 0.04 * Math.sin(y * 7 - t * 5);
      if (mode === 'think') d += 0.03 * Math.sin(Math.atan2(z, x) * 5 + t * 6);
      const r = R * (ring ? 1 + d * 0.5 : 1 + d);
      const xr = (x * cy + z * sy_) * r, zr = (-x * sy_ + z * cy) * r, yr0 = y * r;
      const yr = yr0 * ct - zr * st, zz = yr0 * st + zr * ct;
      const p = 1 / (1 - zz / (W * 1.6)), dep = (zz / (R * 1.4) + 1) / 2;
      sx[i] = c + xr * p; sy[i] = c + yr * p;
      ss[i] = (0.28 + 0.62 * Math.max(0, Math.min(1, dep))) * p * (ring ? 0.8 : 1) * (W / 340);
      const ci = Math.max(0, Math.min(5, Math.floor(((ring ? 0.5 : (y + 1) / 2) + 0.16 * Math.sin(t * 0.9 + y * 3 + x * 2)) * 6)));
      const hi = !ring && (Math.abs(y - Math.sin(t * 0.9) * 0.85) < 0.06 || Math.sin(t * 1.3 + s * 5) > 0.975); if (hi) ss[i] *= 1.6; bk[i] = ci * 3 + (hi ? 2 : dep < 0.3 ? 0 : dep < 0.62 ? 1 : 2);
    }
    for (let b = 0; b < 18; b++) {
      const ci = (b / 3) | 0, di = b % 3; let cc = mix(col, col2, ci / 5); if (di === 2) cc = mix(cc, [255, 255, 255], 0.28);
      cx.fillStyle = rgba(cc, [0.16, 0.5, 1][di]); cx.beginPath();
      for (let i = 0; i < TOT; i++) if (bk[i] === b) { cx.moveTo(sx[i] + ss[i], sy[i]); cx.arc(sx[i], sy[i], ss[i], 0, 6.2832); }
      cx.fill();
    }
    cx.fillStyle = rgba(mix(col, col2, 0.4), 0.06); cx.beginPath();
    for (let i = 0; i < N; i += 3) if (bk[i] % 3 === 2) { cx.moveTo(sx[i] + ss[i] * 4, sy[i]); cx.arc(sx[i], sy[i], ss[i] * 4, 0, 6.2832); }
    cx.fill();
    requestAnimationFrame(frame);
  }
  const api = {
    hook: null,
    init(el) {
      el.innerHTML = ''; cv = document.createElement('canvas'); cv.style.display = 'block'; cv.style.margin = 'auto'; el.append(cv); cx = cv.getContext('2d');
      size(); window.addEventListener('resize', size); if (!run) { run = true; requestAnimationFrame(frame); }
    },
    set(m) { mode = m || 'idle'; },
    mood(m) { const p = MOODS[m] || MOODS.calm; tc = p[0]; tc2 = p[1]; },
    say() {}
  };
  return api;
})();
