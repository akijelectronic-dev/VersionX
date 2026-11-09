const AV = typeof Avatar !== 'undefined' ? Avatar : { hook() { return 0; }, set() {}, init() {} };
const W = 'https://versionx.akijelectronic.workers.dev';
const M = {
  manager: ['groq', 'openai/gpt-oss-120b'], chat: ['groq', 'openai/gpt-oss-120b'], memory: ['groq', 'openai/gpt-oss-120b'], reviewer: ['groq', 'openai/gpt-oss-120b'],
  coder: ['openrouter', 'qwen/qwen-2.5-coder-32b-instruct'], writer: ['openrouter', 'meta-llama/llama-3.3-70b-instruct'],
  vision: ['groq', 'llama-3.2-11b-vision-preview'], vision2: ['groq', 'meta-llama/llama-4-scout-17b-16e-instruct']
};
const H = () => ({ 'X-App-Token': localStorage.getItem('vx_token') || window.VX_TOKEN || '' });
const nowCtx = () => 'এখন বাংলাদেশের সময়: ' + new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka', dateStyle: 'full', timeStyle: 'short' }) + '। সময়ের হিসাব এই অনুযায়ী করো।\n';
const $ = s => document.querySelector(s);
const ST = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };
let facts = ST.get('vx_facts', []), hist = ST.get('vx_hist', []), busy = false, micOn = false, stopFlag = false, speaking = false, scene = '', camOn = false, camTimer, src, rec, torch;

const PERSONA = 'তুমি সাদিয়া, Version X-এর মেয়ে AI সহকারী। বাঙালির মতো সহজ কথ্য বাংলায়, ছোট ছোট বাক্যে, আপন বন্ধুর মতো কথা বলো। বইয়ের ভাষা, markdown, ইমোজি ও তালিকা এড়াও, কারণ উত্তর জোরে পড়ে শোনানো হবে। ব্যবহারকারী সম্পর্কে যা জানো: ';
const MGR = `তুমি Manager। ব্যবহারকারীর কথা পড়ে শুধু JSON দাও: {"agent":"chat|coder|writer","steps":[...]}।
স্টেপের ধরন দুই রকম:
{"tool":"search","q":"..."} ইন্টারনেট থেকে তথ্য আনতে।
{"tool":"device","cmd":"...","arg":"...","arg2":"..."} ফোনের কাজের জন্য।
cmd তালিকা: open (arg=অ্যাপের নাম), flash (on|off), volume (arg=0-100), settings (arg=wifi|bluetooth|display|sound|battery|location|airplane|apps), callname (arg=কন্টাক্টের নাম), call (arg=সরাসরি নম্বর), sms (arg=নম্বর, arg2=বার্তা), whatsapp (arg=নম্বর, arg2=বার্তা), alarm (arg=HH:MM, arg2=লেবেল), timer (arg=মিনিট, arg2=লেবেল), remind (arg=মিনিট, arg2=বার্তা), morning (arg=HH:MM, প্রতিদিন সকালের মনে করানো), event (arg=শিরোনাম, arg2=ISO সময় যেমন 2026-11-10T15:00), notes (নোটিফিকেশন পড়ে শোনানো), vibrate, battery, location, notify (arg=বার্তা), camera (on|off)।
নিয়ম: তথ্য, খবর, কোনো কিছুর পরিচয়, দাম, সময়, বর্তমান অবস্থা, বাংলাদেশ বা যেকোনো জ্ঞানের প্রশ্ন হলে অবশ্যই একটা search স্টেপ দাও। নিজের আগের জানা থেকে উত্তর দিও না।
উদাহরণ: "কাল সকাল ৭টায় অ্যালার্ম দাও" → {"agent":"chat","steps":[{"tool":"device","cmd":"alarm","arg":"07:00","arg2":"কাজ"}]}। "রহিমকে কল দাও" → callname রহিম। দরকার না হলে steps খালি রাখো। কোড হলে coder, লম্বা লেখা হলে writer, বাকি সব chat।`;

// ---------- LLM ----------
async function llm(role, messages, onTok) {
  const m = M[role];
  const r = await fetch(W + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...H() }, body: JSON.stringify({ provider: m[0], model: m[1], messages, stream: !!onTok }) });
  if (!r.ok) throw new Error(await r.text());
  if (!onTok) return (await r.json()).choices[0].message.content;
  const rd = r.body.getReader(), dc = new TextDecoder(); let buf = '', out = '', raw = '';
  for (;;) {
    const { done, value } = await rd.read(); if (done) break;
    const chunk = dc.decode(value, { stream: true }); raw += chunk; buf += chunk; const ls = buf.split('\n'); buf = ls.pop();
    for (const l of ls) { if (!l.startsWith('data: ') || l.includes('[DONE]')) continue; try { const t = JSON.parse(l.slice(6)).choices[0].delta.content; if (t) { out += t; onTok(out); } } catch {} }
  }
  if (!out) { try { out = JSON.parse(raw).choices[0].message.content || ''; onTok(out); } catch {} }
  if (!out) throw new Error('সার্ভার থেকে খালি উত্তর এসেছে: ' + raw.slice(0, 160));
  return out;
}

// ---------- UI ----------
['MANAGER', 'MEMORY', 'CHAT', 'CODER', 'WRITER'].forEach(a => { const d = document.createElement('div'); d.id = 'ag-' + a; d.textContent = a; $('#agents').append(d); });
const agent = n => document.querySelectorAll('#agents div').forEach(d => d.classList.toggle('work', d.id === 'ag-' + (n || '').toUpperCase()));
const state = s => { $('#state').textContent = s; AV.set({ THINKING: 'think', LISTENING: 'listen', SPEAKING: 'talk' }[s] || 'idle'); };
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function md(t) {
  return String(t).split('```').map((p, i) => {
    if (i % 2) { const code = p.replace(/^[^\n]*\n/, '').replace(/\n$/, ''); return '<div class="code"><button class="cp">কপি</button><pre>' + esc(code) + '</pre></div>'; }
    return esc(p).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`\n]+)`/g, '<code>$1</code>');
  }).join('');
}
function setBody(e, t) {
  const b = e.querySelector('.body'); if (!b) return;
  b.innerHTML = t === '…' ? '<span class="dots"><i></i><i></i><i></i></span>' : md(t);
}
function addMsg(c, t) {
  const e = document.createElement('div'); e.className = 'm ' + c;
  const time = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
  e.innerHTML = '<div class="body"></div><div class="meta"><span>' + time + '</span>' +
    (c === 'a' ? '<button data-act="speak" aria-label="শোনাও">🔊</button><button data-act="copy" aria-label="কপি">📋</button><button data-act="retry" aria-label="আবার">↻</button>' : '') + '</div>';
  setBody(e, t); $('#log').append(e); $('#log').scrollTop = 1e9; return e;
}
$('#log').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.classList.contains('cp')) { navigator.clipboard?.writeText(b.parentElement.querySelector('pre').textContent); b.textContent = 'কপি হয়েছে'; setTimeout(() => (b.textContent = 'কপি'), 1200); return; }
  const m = b.closest('.m'), body = m?.querySelector('.body')?.innerText || '';
  if (b.dataset.act === 'speak') return speak(body);
  if (b.dataset.act === 'copy') { navigator.clipboard?.writeText(body); b.textContent = '✓'; setTimeout(() => (b.textContent = '📋'), 1200); }
  if (b.dataset.act === 'retry' && lastUser) run(lastUser);
});

// ---------- Voice ----------
const AC = new (window.AudioContext || window.webkitAudioContext)(), an = AC.createAnalyser(); an.fftSize = 256; an.connect(AC.destination);
const ab = new Uint8Array(an.fftSize);
let fake = false, vmode = ST.get('vx_vmode', 'auto'), vrate = ST.get('vx_rate', 1);
AV.hook = () => { if (fake) { const n = performance.now(); return .25 + .55 * Math.abs(Math.sin(n / 95)) * Math.abs(Math.sin(n / 290)); } an.getByteTimeDomainData(ab); let s = 0; for (const v of ab) s += (v - 128) ** 2; return Math.min(1, Math.sqrt(s / ab.length) / 35); };
const rateStr = () => { const p = Math.round((vrate - 1) * 100); return (p >= 0 ? '+' : '') + p + '%'; };
let voiceNote = '';
async function cloudAudio(t) {
  const key = new Request('https://vx.local/tts?r=' + vrate + '&t=' + encodeURIComponent(t)); let c;
  try { c = await caches.open('vx-voice'); const hit = await c.match(key); if (hit) return await AC.decodeAudioData(await hit.arrayBuffer()); } catch {}
  try {
    const r = await fetch(W + '/tts', { method: 'POST', headers: { 'Content-Type': 'application/json', ...H() }, body: JSON.stringify({ text: t, rate: rateStr() }) });
    if (!r.ok) { voiceNote = 'সার্ভার ' + r.status + ' ' + (await r.text()).slice(0, 160); return null; }
    const b = await r.arrayBuffer(); try { c && await c.put(key, new Response(b.slice(0))); } catch {}
    return await AC.decodeAudioData(b);
  } catch (e) { voiceNote = 'সার্ভার/অডিও: ' + (e.message || e); return null; }
}
async function gSpeak(t) {
  fake = true; let ok = false;
  const T = window.Capacitor?.Plugins?.TextToSpeech;
  if (T) for (const lang of ['bn-BD', 'bn-IN']) { try { await T.speak({ text: t, lang, rate: vrate, pitch: 1.05, volume: 1 }); ok = true; break; } catch (e) { voiceNote += ' ফোনের ভয়েস(' + lang + '): ' + (e.message || e); } }
  if (!ok && window.speechSynthesis) { try { await new Promise(r => { const u = new SpeechSynthesisUtterance(t); u.lang = 'bn-BD'; u.rate = vrate; u.onend = r; u.onerror = r; speechSynthesis.speak(u); }); ok = true; } catch {} }
  fake = false; return ok;
}
async function speak(text) {
  const parts = text.replace(/```[\s\S]*?```/g, ' ').replace(/[*#`_>]/g, '').match(/[^।.!?\n]+[।.!?]?/g)?.map(s => s.trim()).filter(Boolean) || [];
  speaking = true; state('SPEAKING'); stopMicForSpeech(); AV.mood?.(moodOf(text)); try { await AC.resume(); } catch {}
  let warned = false; const warn = () => { if (!warned) { warned = true; addMsg('a', '🔇 ভয়েস বাজেনি। কারণ: ' + (voiceNote || 'অজানা')); } };
  const cloud = vmode !== 'google'; let nx = cloud && parts[0] ? cloudAudio(parts[0]) : null;
  for (let i = 0; i < parts.length && !stopFlag; i++) { if ($('#cap')) { $('#cap').textContent = parts[i]; $('#cap').classList.add('show'); }
    const cur = cloud ? await nx : null; nx = cloud && parts[i + 1] ? cloudAudio(parts[i + 1]) : null;
    if (cur) { voiceNote = ''; src = AC.createBufferSource(); src.buffer = cur; src.connect(an); AV.say?.(parts[i], cur.duration * 1000); src.start(); await new Promise(r => (src.onended = r)); }
    else if (vmode !== 'sadia') { AV.say?.(parts[i], parts[i].length * 75); if (!(await gSpeak(parts[i]))) warn(); }
    else warn();
  }
  speaking = false; state(micOn ? 'LISTENING' : 'IDLE'); AV.mood?.('calm'); if ($('#cap')) { $('#cap').classList.remove('show'); } resumeMicAfterSpeech();
}
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let quietUntil = 0;
function stopMicForSpeech() {
  try { window.Capacitor?.Plugins?.SpeechRecognition?.stop(); } catch {}
  try { rec && rec.stop(); } catch {}
}
function resumeMicAfterSpeech() {
  quietUntil = Date.now() + 1200;
  if (micOn && rec) setTimeout(() => { if (micOn && !speaking && !busy) try { rec.start(); } catch {} }, 1200);
}
async function nativeMic(S) {
  while (micOn) {
    if (speaking || busy || Date.now() < quietUntil) { await new Promise(r => setTimeout(r, 300)); continue; }
    try {
      const r = await S.start({ language: 'bn-BD', maxResults: 1, popup: false, partialResults: false });
      const t = r?.matches?.[0]?.trim();
      if (t && !speaking && !busy && Date.now() > quietUntil) run(t, true);
    } catch (e) {
      if (/permission|denied/i.test(String(e?.message || e))) {
        micOn = false; $('#mic').classList.remove('on');
        addMsg('a', 'মাইকের অনুমতি নেই। ফোনের Settings → Apps → Sadia AI → Permissions থেকে Microphone চালু করুন।');
        break;
      }
      await new Promise(r => setTimeout(r, 600));
    }
  }
  state(speaking ? 'SPEAKING' : 'IDLE');
}
async function mic(on) {
  micOn = on; $('#mic').classList.toggle('on', on); NP()?.keepAlive({ on })?.catch?.(() => {});
  if (!on) { stopMicForSpeech(); return state('IDLE'); }
  const NS = window.Capacitor?.Plugins?.SpeechRecognition;
  if (NS) {
    try {
      const p = await NS.requestPermissions();
      if (p && p.speechRecognition && p.speechRecognition !== 'granted') throw new Error('permission');
    } catch (e) {
      micOn = false; $('#mic').classList.remove('on');
      return addMsg('a', 'মাইকের অনুমতি দিন। ফোনের Settings → Apps → Sadia AI → Permissions থেকে Microphone চালু করুন, তারপর আবার মাইক চাপুন।');
    }
    nativeMic(NS); return state('LISTENING');
  }
  if (!SR) return addMsg('a', 'এই ব্রাউজারে ভয়েস ইনপুট নেই।');
  rec = new SR(); rec.lang = 'bn-BD'; rec.continuous = true;
  rec.onresult = e => { const t = e.results[e.results.length - 1][0].transcript.trim(); if (t && !speaking && !busy && Date.now() > quietUntil) run(t, true); };
  rec.onend = () => { if (micOn && !speaking) setTimeout(() => { if (micOn && !speaking) try { rec.start(); } catch {} }, 300); };
  try { rec.start(); } catch {}
  state('LISTENING');
}

// ---------- Camera / Vision ----------
async function look(q) {
  const v = $('#cam'), c = document.createElement('canvas'); c.width = 512; c.height = v.videoHeight * 512 / v.videoWidth;
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  const msgs = [{ role: 'user', content: [{ type: 'text', text: q || 'ছবিতে কী দেখছ? বাংলায় সংক্ষেপে বলো।' }, { type: 'image_url', image_url: { url: c.toDataURL('image/jpeg', .6) } }] }];
  try { return await llm('vision', msgs); } catch { return await llm('vision2', msgs); }
}
async function cam(on) {
  const v = $('#cam'); camOn = on; clearInterval(camTimer);
  if (!on) { v.srcObject?.getTracks().forEach(t => t.stop()); v.hidden = true; scene = ''; return; }
  v.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }); v.hidden = false; await v.play();
  camTimer = setInterval(async () => { if (!busy && !speaking) try { scene = await look('এক বাক্যে বলো কী দেখছ'); } catch {} }, 8000);
}

// ---------- Device control ----------
const go = url => { const AL = window.Capacitor?.Plugins?.AppLauncher; AL ? AL.openUrl({ url }) : (location.href = url); };
const notify = (t) => { if (Notification.permission === 'granted') new Notification('Sadia', { body: t }); };
const Dev = {
  call: n => (go('tel:' + n), 'কল দিচ্ছি'),
  sms: (n, t) => (go(`sms:${n}?body=${encodeURIComponent(t || '')}`), 'এসএমএস খুলছি'),
  whatsapp: (n, t) => (go(`https://wa.me/${String(n).replace(/\D/g, '')}?text=${encodeURIComponent(t || '')}`), 'হোয়াটসঅ্যাপ খুলছি'),
  open: a => { const U = { youtube: 'https://youtube.com', facebook: 'https://facebook.com', maps: 'https://maps.google.com', gmail: 'https://mail.google.com', whatsapp: 'https://wa.me/' }; go(U[String(a).toLowerCase()] || 'https://www.google.com/search?q=' + encodeURIComponent(a)); return a + ' খুলছি'; },
  flash: async on => {
    if (on === 'off') { torch?.stop(); torch = null; return 'ফ্ল্যাশ বন্ধ'; }
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); torch = s.getVideoTracks()[0];
    await torch.applyConstraints({ advanced: [{ torch: true }] }); return 'ফ্ল্যাশ চালু';
  },
  vibrate: () => (navigator.vibrate?.([200, 100, 200]), 'ভাইব্রেট করলাম'),
  battery: async () => Math.round((await navigator.getBattery()).level * 100) + '% ব্যাটারি',
  location: () => new Promise(r => navigator.geolocation.getCurrentPosition(p => r(`অক্ষাংশ ${p.coords.latitude.toFixed(4)}, দ্রাঘিমাংশ ${p.coords.longitude.toFixed(4)}`), () => r('লোকেশন পাইনি'))),
  notify: t => (notify(t), 'নোটিফিকেশন দিলাম'),
  remind: (min, msg) => { setTimeout(() => { notify(msg); speak(msg); navigator.vibrate?.(300); }, (parseFloat(min) || 1) * 60000); return `${min} মিনিট পর মনে করিয়ে দেব`; },
  camera: async on => { await cam(on !== 'off'); return on === 'off' ? 'ক্যামেরা বন্ধ' : 'ক্যামেরা চালু'; }
};
async function perms() { try { await Notification.requestPermission(); } catch {} navigator.geolocation?.getCurrentPosition(() => {}, () => {}); AC.resume(); try { navigator.wakeLock?.request('screen'); } catch {} }

const VX = window.Capacitor?.Plugins?.VXDevice;
if (VX) {
  const web = { open: Dev.open };
  Dev.open = async a => { try { const r = await VX.launchApp({ name: String(a) }); return r.ok ? r.label + ' চালু করলাম' : a + ' নামে অ্যাপ পাইনি'; } catch { return web.open(a); } };
  Dev.flash = async on => { await VX.flashlight({ on: on !== 'off' }); return on === 'off' ? 'ফ্ল্যাশ বন্ধ' : 'ফ্ল্যাশ চালু'; };
  Dev.volume = async v => { await VX.volume({ level: +v }); return 'ভলিউম ' + v + '%'; };
  Dev.settings = async p => { await VX.settings({ page: String(p) }); return 'সেটিংস খুলছি'; };
  Dev.call = async n => { await VX.dial({ number: String(n) }); return 'ডায়াল স্ক্রিন খুলছি'; };
}
let lastTalk = 0, lastUser = '';
const NP = () => window.Capacitor?.Plugins?.VXDevice;
const need = () => { const p = NP(); if (!p) throw new Error('এই কাজ শুধু APK-তে চলে'); return p; };
const moodOf = t => /দুঃখিত|খারাপ|আফসোস|sorry/i.test(t) ? 'sad' : /\?/.test(t) ? 'curious' : /!|খুশি|দারুণ|চমৎকার|ভালো/.test(t) ? 'happy' : 'calm';
Object.assign(Dev, {
  remind: async (min, msg) => {
    const m = parseFloat(min) || 1, p = NP();
    if (!p) { setTimeout(() => { notify(msg); speak(msg); }, m * 60000); return m + ' মিনিট পর মনে করিয়ে দেব'; }
    await p.scheduleReminder({ seconds: Math.round(m * 60), message: String(msg || 'মনে করিয়ে দিচ্ছি') });
    return m + ' মিনিট পর মনে করিয়ে দেব';
  },
  morning: async hm => { const [h, m] = String(hm || '07:00').split(':').map(Number); await need().scheduleDaily({ hour: h || 0, minute: m || 0, message: 'সুপ্রভাত! আজকের কাজ দেখুন' }); return 'প্রতিদিন ' + String(hm || '07:00') + ' এ সকালের মনে করানো সেট'; },
  alarm: async (hm, label) => { const [h, m] = String(hm || '').split(':').map(Number); await need().setAlarm({ hour: h || 0, minute: m || 0, message: String(label || 'সাদিয়া') }); return 'অ্যালার্ম সেট: ' + hm; },
  timer: async (min, label) => { const m = parseFloat(min) || 1; await need().setTimer({ seconds: Math.round(m * 60), message: String(label || 'টাইমার') }); return m + ' মিনিটের টাইমার সেট'; },
  callname: async name => { const r = await need().findContact({ name: String(name || '') }); if (!r.number) return name + ' নামে কন্টাক্ট পাইনি'; await need().dial({ number: r.number }); return r.name + ' কে কল দিচ্ছি'; },
  sms: async (num, text) => { await need().sendSms({ number: String(num || ''), text: String(text || '') }); return 'এসএমএস পাঠানো হয়েছে'; },
  whatsapp: async (num, text) => { await need().openWhatsApp({ number: String(num || '').replace(/\D/g, ''), text: String(text || '') }); return 'হোয়াটসঅ্যাপে বার্তা প্রস্তুত। অ্যাক্সেসিবিলিটি চালু থাকলে নিজে সেন্ড করবে'; },
  event: async (title, when) => { await need().addEvent({ title: String(title || 'ইভেন্ট'), startMillis: Date.parse(when) || Date.now() }); return 'ক্যালেন্ডার খুলছি, সেভ চাপুন'; },
  notes: async () => { const r = await need().readNotifications(); const l = r.items || []; return l.length ? 'সর্বশেষ নোটিফিকেশন: ' + l.slice(0, 5).join('; ') : 'কোনো নোটিফিকেশন পাইনি। Settings → Notifications → Notification access থেকে Sadia AI চালু আছে কি না দেখুন'; },
});

// ---------- Main pipeline ----------
async function run(text, voice = false) {
  let raw = String(text || '').trim();
  if (voice) {
    if (!(/^(সাদিয়া|sadia)/i.test(raw) || Date.now() - lastTalk < 60000)) return;
    raw = raw.replace(/^(সাদিয়া|sadia)[,।!?\s]*/i, '');
    if (!raw) { lastTalk = Date.now(); addMsg('a', 'জি, বলুন।'); return speak('জি, বলুন।'); }
  }
  text = raw; lastUser = text;
  if (/(ভুলে যাও|মুছে ফেল)/.test(text) && /(সব|সবকিছু)/.test(text)) {
    facts = []; hist = []; ST.set('vx_facts', facts); ST.set('vx_hist', hist);
    addMsg('u', text); return addMsg('a', 'ঠিক আছে, আমি সব তথ্য আর আগের কথা ভুলে গেলাম।');
  }
  if (/কী মনে আছে|কি মনে আছে/.test(text)) {
    addMsg('u', text); return addMsg('a', facts.length ? 'আমার মনে আছে: ' + facts.join('; ') : 'এখনো তেমন কিছু মনে রাখিনি।');
  }
  lastTalk = Date.now();
  if (busy || !text) return; busy = true; stopFlag = false; addMsg('u', text); state('THINKING');
  try {
    agent('manager'); let plan = { agent: 'chat', steps: [] };
    try { plan = JSON.parse((await llm('manager', [{ role: 'system', content: MGR + ' ' + nowCtx() }, { role: 'user', content: text }])).match(/\{[\s\S]*\}/)[0]); } catch {}
    const obs = [];
    for (const s of plan.steps || []) {
      if (stopFlag) break;
      try {
        if (s.tool === 'search') obs.push('সার্চ: ' + (await (await fetch(W + '/search?q=' + encodeURIComponent(s.q), { headers: H() })).json()).map(x => x.title + ' - ' + x.snippet).join(' | '));
        else if (s.tool === 'device' && Dev[s.cmd]) obs.push(s.cmd + ': ' + await Dev[s.cmd](s.arg, s.arg2));
      } catch (e) { obs.push((s.cmd || s.tool) + ' ব্যর্থ: ' + e.message); }
    }
    const ag = ['chat', 'coder', 'writer'].includes(plan.agent) ? plan.agent : 'chat'; agent(ag);
    const sys = nowCtx() + bdCtx(text) + ABOUT_PROMPT() + PERSONA + (obs.length ? 'নিচের "টুলের ফলাফল" থেকে তথ্য নিয়ে উত্তর দাও, নিজে কিছু বানিয়ে বলো না। ' : '') + (facts.join('; ') || 'কিছু না') + (scene ? '। ক্যামেরায় এখন দেখা যাচ্ছে: ' + scene : '') + (ag === 'chat' ? '' : '। কাজটা পুরো করো, কোড হলে code block দাও।');
    const el = addMsg('a', '…');
    let ans = await llm(ag, [{ role: 'system', content: sys }, ...hist.slice(-12), { role: 'user', content: text + (obs.length ? '\n\n[টুলের ফলাফল]\n' + obs.join('\n') : '') }], t => { setBody(el, t); $('#log').scrollTop = 1e9; });
    if (ag !== 'chat' && !stopFlag) { agent('manager'); try { ans = await llm('reviewer', [{ role: 'system', content: 'তুমি Reviewer। নিচের উত্তরে ভুল থাকলে ঠিক করে পুরো উত্তরটা আবার দাও, ঠিক থাকলে হুবহু একই দাও।' }, { role: 'user', content: ans }]); setBody(el, ans); } catch {} }
    hist.push({ role: 'user', content: text }, { role: 'assistant', content: ans }); hist = hist.slice(-30); ST.set('vx_hist', hist);
    agent('memory');
    llm('memory', [{ role: 'system', content: 'ব্যবহারকারীর কথা থেকে স্থায়ী গুরুত্বপূর্ণ তথ্য (নাম, পছন্দ, পরিকল্পনা) থাকলে শুধু ছোট বাংলা বাক্যের JSON array দাও, না থাকলে []' }, { role: 'user', content: text }])
      .then(r => { facts = [...new Set([...facts, ...JSON.parse(r.match(/\[[\s\S]*\]/)[0])])].slice(-60); ST.set('vx_facts', facts); }).catch(() => {}).finally(() => agent(''));
    busy = false; if (!stopFlag) await speak(ans);
  } catch (e) { document.querySelectorAll('.m.a').forEach(x => x.querySelector('.dots') && x.remove()); addMsg('a', 'সমস্যা হয়েছে: ' + e.message); state('IDLE'); agent(''); }
  busy = false;
}

$('#send').onclick = () => { perms(); const t = $('#inp').value.trim(); $('#inp').value = ''; $('#inp').style.height = ''; run(t); };
$('#inp').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#send').click(); } };
$('#inp').oninput = e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; };
$('#mic').onclick = () => { perms(); mic(!micOn); };
$('#camb').onclick = () => cam(!camOn).catch(e => addMsg('a', 'ক্যামেরা পাইনি: ' + e.message));
$('#stop').onclick = () => { stopFlag = true; try { src?.stop(); } catch {} speechSynthesis.cancel(); try { window.Capacitor?.Plugins?.TextToSpeech?.stop(); } catch {} fake = false; };
AV.init($('#stage'));
navigator.serviceWorker?.register('sw.js');

try {
const sheet = $('#sheet');
$('#gear').onclick = () => (sheet.hidden = !sheet.hidden); $('#sclose').onclick = () => (sheet.hidden = true);
const setV = m => { vmode = m; ST.set('vx_vmode', m); sheet.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === m)); };
sheet.querySelectorAll('[data-v]').forEach(b => (b.onclick = () => setV(b.dataset.v))); setV(vmode);
$('#rate').value = vrate; $('#rate').oninput = e => { vrate = +e.target.value; ST.set('vx_rate', vrate); };
$('#wsave').onclick = () => addMsg('a', 'Worker লিংক অ্যাপে ঠিক করা আছে, এখানে বদলানোর দরকার নেই');
$('#wtest').onclick = async () => { try { const r = await fetch(W + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...H() }, body: JSON.stringify({ provider: 'groq', model: 'openai/gpt-oss-120b', messages: [{ role: 'user', content: 'hi' }] }) }); addMsg('a', 'Worker উত্তর: ' + r.status + ' ' + (await r.text()).slice(0, 200)); } catch (e) { addMsg('a', 'Worker-এ পৌঁছাতে পারিনি: ' + e.message); } sheet.hidden = true; };
$('#vtest').onclick = () => { perms(); stopFlag = false; speak('হ্যালো! আমি সাদিয়া। আমার ভয়েস এখন এভাবে শোনাচ্ছে।'); };
const flashOn = { v: false };
document.querySelectorAll('#chips button').forEach(b => (b.onclick = async () => {
  if (b.dataset.q) return run(b.dataset.q);
  perms(); let a = b.dataset.a; if (b.dataset.c === 'flash') { flashOn.v = !flashOn.v; a = flashOn.v ? 'on' : 'off'; }
  try { addMsg('a', await Dev[b.dataset.c](a, b.dataset.b)); } catch (e) { addMsg('a', 'হয়নি: ' + e.message); }
}));
} catch (e) { console.warn(e); }

$('#tok').value = localStorage.getItem('vx_token') || '';
$('#tsave').onclick = () => { localStorage.setItem('vx_token', $('#tok').value.trim()); addMsg('a', 'টোকেন সেভ হয়েছে'); };

$('#clear').onclick = () => { $('#log').innerHTML = ''; hist = []; ST.set('vx_hist', hist); $('#sheet').hidden = true; addMsg('a', 'নতুন করে শুরু করলাম। কী করব?'); };

document.querySelectorAll('[data-tile]').forEach(b => (b.onclick = () => {
  const k = b.dataset.tile;
  if (k === 'chat') return $('#inp').focus();
  if (k === 'voice') return $('#mic').click();
  if (k === 'memory') return run('তুমি আমার সম্পর্কে কী কী মনে রেখেছ?');
  if (k === 'media') return $('#camb').click();
}));
document.querySelectorAll('[data-nav]').forEach(b => (b.onclick = () => {
  const k = b.dataset.nav;
  document.querySelectorAll('[data-nav]').forEach(x => x.classList.toggle('on', x === b));
  if (k === 'home') $('#log').scrollTop = 0;
  if (k === 'memory') run('তুমি আমার সম্পর্কে কী কী মনে রেখেছ?');
  if (k === 'tools') $('#sheet').hidden = false;
}));
