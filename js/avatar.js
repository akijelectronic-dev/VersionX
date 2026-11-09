const Avatar = (() => {
  const SVG = `<svg viewBox="0 0 300 360" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
<style>.rc{fill:var(--rc)}.rs{stroke:var(--rc);fill:none}.gl{filter:drop-shadow(0 0 6px var(--rc))}</style>
<defs>
<linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#d4e0ff"/><stop offset="1" stop-color="#8ea6e6"/></linearGradient>
<radialGradient id="sc" gradientUnits="userSpaceOnUse" cx="150" cy="150" r="115"><stop offset="0" stop-color="#143a7a"/><stop offset="1" stop-color="#030a1c"/></radialGradient>
<radialGradient id="ey" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".4" style="stop-color:var(--rc)"/><stop offset="1" style="stop-color:var(--rc)"/></radialGradient>
<clipPath id="sk"><ellipse cx="150" cy="172" rx="92" ry="68"/></clipPath>
</defs>
<ellipse id="rb-sh" cx="150" cy="352" rx="60" ry="7" fill="#000" opacity=".35"/>
<g id="rb-all">
<path class="rb-st rc" d="M0-8L2-2L8 0L2 2L0 8L-2 2L-8 0L-2-2Z"/><path class="rb-st rc" d="M0-8L2-2L8 0L2 2L0 8L-2 2L-8 0L-2-2Z"/><path class="rb-st rc" d="M0-8L2-2L8 0L2 2L0 8L-2 2L-8 0L-2-2Z"/>
<ellipse cx="122" cy="338" rx="20" ry="10" fill="url(#sh)" class="rs" stroke-width="2.5"/><ellipse cx="178" cy="338" rx="20" ry="10" fill="url(#sh)" class="rs" stroke-width="2.5"/>
<g id="rb-aL"><ellipse cx="88" cy="290" rx="15" ry="30" fill="url(#sh)" class="rs gl" stroke-width="2.5"/><circle cx="86" cy="318" r="7" class="rc"/></g>
<g id="rb-aR"><ellipse cx="212" cy="290" rx="15" ry="30" fill="url(#sh)" class="rs gl" stroke-width="2.5"/><circle cx="214" cy="318" r="7" class="rc"/></g>
<ellipse cx="150" cy="292" rx="56" ry="52" fill="url(#sh)" class="rs gl" stroke-width="3"/>
<path id="rb-heart" d="M150 308C126 292 131 272 143 272C148 272 150 276 150 279C150 276 152 272 157 272C169 272 174 292 150 308Z" class="rc gl"/>
<g id="rb-head">
<g id="rb-ant"><line x1="150" y1="70" x2="150" y2="46" class="rs" stroke-width="4"/><circle cx="150" cy="38" r="10" class="rc gl"/><circle cx="147" cy="34" r="3" fill="#fff" opacity=".85"/></g>
<g id="rb-eL"><circle cx="32" cy="172" r="20" fill="url(#sh)" class="rs gl" stroke-width="3"/><circle cx="32" cy="172" r="8" class="rc"/></g>
<g id="rb-eR"><circle cx="268" cy="172" r="20" fill="url(#sh)" class="rs gl" stroke-width="3"/><circle cx="268" cy="172" r="8" class="rc"/></g>
<ellipse cx="150" cy="168" rx="120" ry="100" fill="url(#sh)" class="rs gl" stroke-width="4"/>
<path d="M68 112Q150 60 232 112" stroke="#fff" stroke-width="6" stroke-linecap="round" fill="none" opacity=".75"/>
<ellipse cx="150" cy="172" rx="92" ry="68" fill="url(#sc)" class="rs" stroke-width="2.5"/>
<g clip-path="url(#sk)">
<g class="rb-eye gl" data-x="112"><ellipse rx="24" ry="30" fill="url(#ey)"/><circle cx="-8" cy="-11" r="9" fill="#fff"/><circle cx="9" cy="11" r="4" fill="#fff" opacity=".8"/></g>
<g class="rb-eye gl" data-x="188"><ellipse rx="24" ry="30" fill="url(#ey)"/><circle cx="-8" cy="-11" r="9" fill="#fff"/><circle cx="9" cy="11" r="4" fill="#fff" opacity=".8"/></g>
<rect class="rb-lid" x="76" y="192" width="72" height="70" fill="url(#sc)"/><rect class="rb-lid" x="152" y="192" width="72" height="70" fill="url(#sc)"/>
<ellipse id="rb-bl" cx="84" cy="200" rx="14" ry="8" fill="#ff6fa8" opacity=".45"/><ellipse id="rb-br" cx="216" cy="200" rx="14" ry="8" fill="#ff6fa8" opacity=".45"/>
<path id="rb-sm" class="rs gl" stroke-width="4" stroke-linecap="round" d="M134 204Q150 217 166 204"/>
<path id="rb-mo" class="rc gl" visibility="hidden"/>
</g>
<g id="rb-th"><circle cx="226" cy="66" r="5" class="rc"/><circle cx="244" cy="48" r="7" class="rc"/><circle cx="266" cy="28" r="9" class="rc"/></g>
</g></g></svg>`;
  let mood = 'calm', vis = [], visT0 = 0, visMs = 1, state = 'idle', lv = 0, blinkAt = 2, blinkT = -1, gx = 0, gy = 0, tx = 0, ty = 0, last = 0;
  const api = { hook: () => 0, set: s => (state = s) };
  api.mood = m => (mood = m);
  api.say = (text, ms) => { vis = [...String(text)].map(c => /[াোৌেৈআঅএঐওঔ]/.test(c) ? 1 : /[ািীিুূইঈউঊ]/.test(c) ? .6 : /[্।,.?!\s]/.test(c) ? 0 : .35); visT0 = performance.now(); visMs = Math.max(300, ms || vis.length * 75); };
  api.init = el => {
    el.innerHTML = SVG;
    const q = s => el.querySelector(s), all = q('#rb-all'), head = q('#rb-head'), sh = q('#rb-sh'), aL = q('#rb-aL'), aR = q('#rb-aR'), ant = q('#rb-ant'),
      eL = q('#rb-eL'), eR = q('#rb-eR'), sm = q('#rb-sm'), mo = q('#rb-mo'), heart = q('#rb-heart'), bl = q('#rb-bl'), br = q('#rb-br');
    const eyes = [...el.querySelectorAll('.rb-eye')], lids = [...el.querySelectorAll('.rb-lid')], th = [...q('#rb-th').children], st = [...el.querySelectorAll('.rb-st')];
    const col = { idle: '#00d2ff', listen: '#00d2ff', think: '#a855f7', talk: '#22ff88' };
    const spots = [[40, 78], [262, 112], [256, 300]];
    addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); tx = Math.max(-7, Math.min(7, (e.clientX - r.left - r.width / 2) / r.width * 18)); ty = Math.max(-5, Math.min(5, (e.clientY - r.top - r.height / 2) / r.height * 12)); last = performance.now(); });
    const loop = ms => {
      requestAnimationFrame(loop); const t = ms * .001;
      lv += (api.hook() - lv) * .45;
      if (state === 'talk' && vis.length) { const k = Math.floor((ms - visT0) / (visMs / vis.length)); lv = Math.max(lv, k >= 0 && k < vis.length ? vis[k] * .9 : 0); }
      el.style.setProperty('--rc', col[state] || col.idle);
      if (ms - last > 4000) { tx = Math.sin(t * .5) * 5; ty = Math.sin(t * .37) * 3; }
      const think = state === 'think'; gx += ((think ? 6 : tx) - gx) * .1; gy += ((think ? -6 : ty) - gy) * .1;
      const fy = Math.sin(t * 1.8) * 6;
      all.setAttribute('transform', `translate(0 ${fy})`); sh.setAttribute('rx', 60 - fy * 1.5); sh.setAttribute('opacity', .38 + fy * .02);
      head.setAttribute('transform', `translate(${gx * .8} ${gy * .5}) rotate(${Math.sin(t * .7) * 1.5 + gx * .5 + (state === 'listen' ? 5 : 0)} 150 250)`);
      ant.setAttribute('transform', `rotate(${Math.sin(t * 3 + .6) * 9 + (state === 'talk' ? Math.sin(t * 12) * lv * 10 : 0)} 150 72)`);
      const w = state === 'listen' ? Math.sin(t * 8) * 10 : 0; eL.setAttribute('transform', `rotate(${w} 32 172)`); eR.setAttribute('transform', `rotate(${-w} 268 172)`);
      if (t > blinkAt) { blinkT = t; blinkAt = t + 2 + Math.random() * 3; }
      const b = t - blinkT < .14 ? .1 : (state === 'listen' || mood === 'curious' ? 1.1 : 1);
      eyes.forEach(e => e.setAttribute('transform', `translate(${+e.dataset.x + gx * 1.6} ${165 + gy}) scale(1 ${b})`));
      const s = state === 'talk' ? .45 + lv * .35 : .08; lids.forEach(l => l.setAttribute('y', 195 - s * 36));
      if (state === 'talk') { const mw = 14 + lv * 10, h = 6 + lv * 26; mo.setAttribute('d', `M${150 - mw} 205Q150 ${205 + h * 1.6} ${150 + mw} 205Q150 202 ${150 - mw} 205Z`); mo.setAttribute('visibility', 'visible'); sm.setAttribute('visibility', 'hidden'); }
      else { mo.setAttribute('visibility', 'hidden'); sm.setAttribute('visibility', 'visible'); sm.setAttribute('d', mood === 'sad' ? 'M134 212Q150 200 166 212' : 'M134 204Q150 217 166 204'); }
      bl.setAttribute('opacity', state === 'talk' ? .75 : .45); br.setAttribute('opacity', state === 'talk' ? .75 : .45);
      const sa = state === 'talk' ? Math.sin(t * 9) * lv * 34 : Math.sin(t * 1.8) * 4;
      aL.setAttribute('transform', `rotate(${sa} 100 268)`); aR.setAttribute('transform', `rotate(${-sa} 200 268)`);
      heart.setAttribute('transform', `translate(150 290) scale(${1 + Math.abs(Math.sin(t * (state === 'talk' ? 6 : 2.4))) * .12}) translate(-150 -290)`);
      th.forEach((c, i) => c.setAttribute('opacity', think ? (Math.sin(t * 4 - i * .9) > -.2 ? 1 : .2) : 0));
      st.forEach((p, i) => p.setAttribute('transform', `translate(${spots[i][0]} ${spots[i][1]}) scale(${.5 + .5 * Math.abs(Math.sin(t * 1.6 + i * 2))}) rotate(${t * 20})`));
    };
    requestAnimationFrame(loop);
  };
  return api;
})();
