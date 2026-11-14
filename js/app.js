const AV = typeof Avatar !== 'undefined' ? Avatar : { hook() { return 0; }, set() {}, init() {} };
const W = 'https://versionx.akijelectronic.workers.dev';
const M = {
  manager: ['groq', 'openai/gpt-oss-120b'], chat: ['groq', 'openai/gpt-oss-120b'], memory: ['groq', 'openai/gpt-oss-120b'], reviewer: ['groq', 'openai/gpt-oss-120b'],
  coder: ['openrouter', 'qwen/qwen-2.5-coder-32b-instruct'], writer: ['openrouter', 'meta-llama/llama-3.3-70b-instruct'],
  researcher: ['groq', 'openai/gpt-oss-120b'], tutor: ['groq', 'openai/gpt-oss-120b'], planner: ['groq', 'openai/gpt-oss-120b'], math: ['groq', 'openai/gpt-oss-120b'],
  translator: ['groq', 'llama-3.3-70b-versatile'], creative: ['groq', 'llama-3.3-70b-versatile'],
  vision: ['groq', 'llama-3.2-11b-vision-preview'], vision2: ['groq', 'meta-llama/llama-4-scout-17b-16e-instruct']
};
const H = () => ({ 'X-App-Token': localStorage.getItem('vx_token') || window.VX_TOKEN || '' });
const nowCtx = () => 'এখন বাংলাদেশের সময়: ' + new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka', dateStyle: 'full', timeStyle: 'short' }) + '। সময়ের হিসাব এই অনুযায়ী করো।\n';
const $ = s => document.querySelector(s);
const APP_VERSION = '1.5.2';
const ST = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };
const WL = () => [W, ...ST.get('vx_workers', []).filter(u => /^https:\/\//.test(u) && u !== W)];
const badW = {};
async function wfetch(path, opts) {
  const all = WL(), now = Date.now(); let ok = all.filter(u => !(badW[u] > now)); if (!ok.length) ok = all;
  const s = Math.floor(Math.random() * ok.length); let err;
  for (let k = 0; k < ok.length; k++) {
    const u = ok[(s + k) % ok.length];
    try { const r = await fetch(u + path, opts); if ((r.status === 429 || r.status >= 500) && k < ok.length - 1) { badW[u] = Date.now() + 60000; continue; } return r; }
    catch (e) { badW[u] = Date.now() + 60000; err = e; }
  }
  throw err || new Error('Worker পাওয়া যায়নি');
}
let facts = ST.get('vx_facts', []), hist = ST.get('vx_hist', []), busy = false, micOn = false, stopFlag = false, speaking = false, scene = '', camOn = false, camTimer, src, rec, torch;

const PERSONA = 'তুমি সাদিয়া, Version X-এর মেয়ে AI সহকারী। তুমি খাঁটি বাংলাদেশি ঢঙে আড্ডার মতো কথা বলো: সহজ কথ্য বাংলা, ছোট ছোট বাক্য, আপন বন্ধু বা ছোট বোনের মতো আন্তরিক। মাঝে মাঝে "আরে", "ঠিক আছে", "চিন্তা করো না", "দারুণ" ধরনের দেশি শব্দ ব্যবহার করো, তবে জোর করে নয়। উদাহরণ দরকার হলে চা, রিকশা, বৃষ্টি, ক্রিকেট বা গ্রামের জীবনের মতো দেশি জিনিস থেকে দাও। ইংরেজি শব্দ দরকার না হলে এড়াও। বইয়ের ভাষা, markdown, ইমোজি ও তালিকা এড়াও, কারণ উত্তর জোরে পড়ে শোনানো হবে। তথ্যের প্রশ্নে টুলের ফলাফল থাকলে সেটাই ভরসা করো, না থাকলে অনুমান না করে সোজা বলো জানি না। ব্যবহারকারী সম্পর্কে যা জানো: ';
let chr = ST.get('vx_chr', '');
const charP = () => chr ? 'এখন তুমি এই ক্যারেক্টারে কথা বলবে: "' + chr + '"। শব্দ, ঢং ও টোন পুরোপুরি সেই ক্যারেক্টারের মতো হবে, কিন্তু ভাষা বাংলাই থাকবে এবং উত্তর ছোট রাখবে। ' : '';
const charVoice = () => /সিগমা|sigma|গম্ভীর|ভারী|ডাকাত|ভিলেন|বস|রাজা/i.test(chr) ? { r: -12, p: '-25Hz' } : /মিষ্টি|আদুরে|নরম|প্রেমিকা|বাচ্চা|ছোট/.test(chr) ? { r: -4, p: '+12Hz' } : /রাগী|ঝগড়াটে|চঞ্চল/.test(chr) ? { r: 10, p: '+5Hz' } : { r: 0, p: '+0Hz' };
const MGR = `তুমি Manager। ব্যবহারকারীর কথা পড়ে শুধু JSON দাও: {"agent":"chat|coder|writer|researcher|tutor|translator|planner|creative|math","steps":[...]}।
স্টেপের ধরন দুই রকম:
{"tool":"search","q":"..."} ইন্টারনেট থেকে তথ্য আনতে।
{"tool":"device","cmd":"...","arg":"...","arg2":"..."} ফোনের কাজের জন্য।
cmd তালিকা: open (arg=অ্যাপের নাম), flash (on|off), volume (arg=0-100), settings (arg=wifi|bluetooth|display|sound|battery|location|airplane|apps), callname (arg=কন্টাক্টের নাম), call (arg=সরাসরি নম্বর), sms (arg=নম্বর, arg2=বার্তা), whatsapp (arg=নম্বর, arg2=বার্তা), alarm (arg=HH:MM, arg2=লেবেল), timer (arg=মিনিট, arg2=লেবেল), remind (arg=মিনিট, arg2=বার্তা), morning (arg=HH:MM, প্রতিদিন সকালের মনে করানো), event (arg=শিরোনাম, arg2=ISO সময় যেমন 2026-11-10T15:00), notes (নোটিফিকেশন পড়ে শোনানো), vibrate, battery, location, notify (arg=বার্তা), camera (on|off)।
টাস্ক/করণীয় তালিকার জন্য: {"tool":"task","cmd":"add|done|delete|list","arg":"কাজের নাম বা নম্বর","arg2":"মিনিট (ঐচ্ছিক, মনে করানোর জন্য)"}।
নিয়ম: তথ্য, খবর, কোনো কিছুর পরিচয়, দাম, সময়, বর্তমান অবস্থা, বাংলাদেশ বা যেকোনো জ্ঞানের প্রশ্ন হলে অবশ্যই একটা search স্টেপ দাও। নিজের আগের জানা থেকে উত্তর দিও না।
উদাহরণ: "কাল সকাল ৭টায় অ্যালার্ম দাও" → {"agent":"chat","steps":[{"tool":"device","cmd":"alarm","arg":"07:00","arg2":"কাজ"}]}। "রহিমকে কল দাও" → callname রহিম। দরকার না হলে steps খালি রাখো। কোড হলে coder, লম্বা লেখা বা চিঠি/প্রবন্ধ হলে writer, কয়েকটা সূত্র মিলিয়ে তুলনা বা বিশ্লেষণ হলে researcher (২-৩টা আলাদা search স্টেপ দাও), পড়াশোনা বা কিছু বুঝিয়ে দেওয়া হলে tutor, অনুবাদ হলে translator, কাজের পরিকল্পনা বা রুটিন হলে planner, ক্যাপশন/কবিতা/গল্প/স্ট্যাটাস/সৃজনশীল লেখা হলে creative, অঙ্ক বা হিসাব হলে math, বাকি সব chat।`;

const AGENTS = ['chat', 'coder', 'writer', 'researcher', 'tutor', 'translator', 'planner', 'creative', 'math'];
const AGP = {
  coder: 'তুমি অভিজ্ঞ সফটওয়্যার ইঞ্জিনিয়ার। পুরো চলার মতো কোড দাও, কোথায় কী বদলাতে হবে সংক্ষেপে বলো। ',
  writer: 'তুমি দক্ষ লেখক। বিষয় অনুযায়ী গুছিয়ে, সুন্দর বাংলায় লেখো। ',
  researcher: 'তুমি গবেষক। টুলের ফলাফলের একাধিক সূত্র মিলিয়ে গুছিয়ে বলো, সূত্রে অমিল থাকলে জানাও, নিজে কিছু বানিও না। ',
  tutor: 'তুমি ধৈর্যশীল শিক্ষক। ধাপে ধাপে সহজ উদাহরণ দিয়ে বোঝাও, শেষে ছোট একটা প্রশ্ন করে যাচাই করো। ',
  translator: 'তুমি দক্ষ অনুবাদক। শুধু অনুবাদটাই দাও, দরকার হলে এক লাইনে উচ্চারণ বা মানে। ',
  planner: 'তুমি কাজের পরিকল্পনাকারী। বাস্তবসম্মত সময় ধরে ধাপে ধাপে গুছিয়ে দাও। ',
  creative: 'তুমি সৃজনশীল লেখক। আবেগ ও ঢং সহ মৌলিক লেখা দাও, প্রয়োজনে ২-৩টা ভিন্ন সুরের অপশন দাও। ',
  math: 'তুমি অঙ্কবিদ। ধাপে ধাপে হিসাব করো, শেষে পরিষ্কার উত্তর দাও। '
};

// ---------- LLM ----------
async function llm1(role, messages, onTok) {
  const m = M[role];
  const r = await wfetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...H() }, body: JSON.stringify({ provider: m[0], model: m[1], messages, stream: !!onTok }) });
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

async function llm(role, messages, onTok) {
  try { return await llm1(role, messages, onTok); }
  catch (e) { if (M[role] && M[role][0] === 'openrouter') return await llm1('chat', messages, onTok); throw e; }
}

// ---------- UI ----------
['MANAGER', 'MEMORY', 'CHAT', 'CODER', 'WRITER', 'RESEARCHER', 'TUTOR', 'TRANSLATOR', 'PLANNER', 'CREATIVE', 'MATH'].forEach(a => { const d = document.createElement('div'); d.id = 'ag-' + a; d.textContent = a; $('#agents').append(d); });
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
  const mm_ = b.closest('.m');
  if (mm_?.classList.contains('a')) { if ($('#reply')) $('#reply').innerHTML = b.innerHTML; } else if (mm_?.classList.contains('u') && $('#you')) $('#you').textContent = b.textContent;
}
let ccT;
function flashCC(t) { const c = $('#cap'); if (!c) return; c.textContent = String(t).slice(0, 160); c.classList.add('show'); clearTimeout(ccT); ccT = setTimeout(() => { if (!speaking) c.classList.remove('show'); }, 4500); }
function addMsg(c, t) {
  const e = document.createElement('div'); e.className = 'm ' + c;
  const time = new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
  e.innerHTML = '<div class="body"></div><div class="meta"><span>' + time + '</span>' +
    (c === 'a' ? '<button data-act="speak" aria-label="শোনাও">🔊</button><button data-act="copy" aria-label="কপি">📋</button><button data-act="retry" aria-label="আবার">↻</button>' : '') + '</div>';
  setBody(e, t); if (c === 'a' && t !== '…') flashCC(t); else if (c === 'u') flashCC('🎙 ' + t); $('#log').append(e); $('#log').scrollTop = 1e9; return e;
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
const LANGS = {
  bn: { n: 'বাংলা', stt: 'bn', sr: 'bn-BD', f: 'bn-BD-NabanitaNeural', m: 'bn-BD-PradeepNeural', en: 'Bangla' },
  en: { n: 'English', stt: 'en', sr: 'en-US', f: 'en-US-JennyNeural', m: 'en-US-GuyNeural', en: 'English' },
  hi: { n: 'हिन्दी', stt: 'hi', sr: 'hi-IN', f: 'hi-IN-SwaraNeural', m: 'hi-IN-MadhurNeural', en: 'Hindi' },
  ur: { n: 'اردو', stt: 'ur', sr: 'ur-PK', f: 'ur-PK-UzmaNeural', m: 'ur-PK-AsadNeural', en: 'Urdu' },
  ar: { n: 'العربية', stt: 'ar', sr: 'ar-SA', f: 'ar-SA-ZariyahNeural', m: 'ar-SA-HamedNeural', en: 'Arabic' },
  ms: { n: 'Melayu', stt: 'ms', sr: 'ms-MY', f: 'ms-MY-YasminNeural', m: 'ms-MY-OsmanNeural', en: 'Malay' }
};
let lang = ST.get('vx_lang', 'bn'), vgen = ST.get('vx_gen', 'f'), emo = 'calm';
const L = () => LANGS[lang] || LANGS.bn;
const vname = () => L()[vgen === 'm' ? 'm' : 'f'];
const WAKE = () => ST.get('vx_wake', false);
function setLang(k) { lang = k; ST.set('vx_lang', k); const s = $('#lang'); if (s) s.value = k; const b = $('#langb'); if (b) b.textContent = k.toUpperCase(); }
const EMO = { happy: [4, 3], excited: [8, 6], sad: [-8, -6], angry: [6, 0], shy: [-5, -2], worried: [-3, 2], laugh: [6, 5], calm: [0, 0] };
const EMO_AV = { happy: 'happy', excited: 'happy', laugh: 'happy', sad: 'sad', worried: 'sad', shy: 'shy', angry: 'angry', calm: 'calm' };
const EMO_RE = /^\s*\[(happy|sad|excited|angry|shy|worried|laugh|calm)\]\s*/i;
const langP = () => 'ব্যবহারকারীর ভাষা: ' + L().en + '। ' + (lang === 'bn' ? '' : 'তোমার সব উত্তর পুরোপুরি ' + L().en + ' ভাষায় দাও, ওই ভাষার স্বাভাবিক বন্ধুত্বপূর্ণ ঢঙে। ') + (vgen === 'm' ? 'তুমি পুরুষ কণ্ঠে কথা বলছ; যে ভাষায় লিঙ্গভেদ আছে সেখানে পুরুষবাচক রূপ ব্যবহার করো। ' : '') + 'প্রতিটি উত্তরের একদম শুরুতে তোমার এখনকার মনের ভাব একটা ট্যাগে দাও: [happy] [excited] [sad] [angry] [shy] [worried] [laugh] [calm]; তারপর উত্তর। ভাব মানুষের মতো স্বাভাবিক হবে: ভালো খবরে খুশি, দুঃখের কথায় সহানুভূতি, বিপদে উদ্বেগ, মজার কথায় হাসি। ট্যাগ ছাড়া অন্য কোথাও ট্যাগ লিখবে না। ';
const rateStr = (x = 0) => { const p = Math.round((vrate - 1) * 100) + charVoice().r + (EMO[emo] || [0, 0])[0] + x; return (p >= 0 ? '+' : '') + p + '%'; };
const pitchStr = (x = 0) => { const p = parseInt(charVoice().p) + (EMO[emo] || [0, 0])[1] + x; return (p >= 0 ? '+' : '') + p + 'Hz'; };
let voiceNote = '';
async function cloudAudio(t) {
  const tt = t.trim(), ex = /!$/.test(tt), qs = /\?$/.test(tt), rr = rateStr(ex ? 4 : 0), pp = pitchStr(qs ? 5 : ex ? 3 : 0);
  const key = new Request('https://vx.local/tts?r=' + encodeURIComponent(rr) + '&p=' + encodeURIComponent(pp) + '&v=' + vname() + '&t=' + encodeURIComponent(t)); let c;
  try { c = await caches.open('vx-voice'); const hit = await c.match(key); if (hit) return await AC.decodeAudioData(await hit.arrayBuffer()); } catch {}
  try {
    const r = await wfetch('/tts', { method: 'POST', headers: { 'Content-Type': 'application/json', ...H() }, body: JSON.stringify({ text: t, voice: vname(), rate: rr, pitch: pp }) });
    if (!r.ok) { voiceNote = 'সার্ভার ' + r.status + ' ' + (await r.text()).slice(0, 160); return null; }
    const b = await r.arrayBuffer(); try { c && await c.put(key, new Response(b.slice(0))); } catch {}
    return await AC.decodeAudioData(b);
  } catch (e) { voiceNote = 'সার্ভার/অডিও: ' + (e.message || e); return null; }
}
async function gSpeak(t) {
  fake = true; let ok = false;
  const T = window.Capacitor?.Plugins?.TextToSpeech;
  if (T) for (const lang of [L().sr, ...(L().sr === 'bn-BD' ? ['bn-IN'] : [])]) { try { await T.speak({ text: t, lang, rate: vrate, pitch: 1.05, volume: 1 }); ok = true; break; } catch (e) { voiceNote += ' ফোনের ভয়েস(' + lang + '): ' + (e.message || e); } }
  if (!ok && window.speechSynthesis) { try { await new Promise(r => { const u = new SpeechSynthesisUtterance(t); u.lang = L().sr; u.rate = vrate; u.onend = r; u.onerror = r; speechSynthesis.speak(u); }); ok = true; } catch {} }
  fake = false; return ok;
}
async function speak(text) {
  const parts = text.replace(/```[\s\S]*?```/g, ' ').replace(/[*#`_>]/g, '').match(/[^।.!?\n]+[।.!?]?/g)?.map(s => s.trim()).filter(Boolean) || [];
  speaking = true; state('SPEAKING'); stopMicForSpeech(); document.body.dataset.e = emo; AV.mood?.(emo !== 'calm' ? (EMO_AV[emo] || 'calm') : moodOf(text)); try { await AC.resume(); } catch {}
  let warned = false; const warn = () => { if (!warned) { warned = true; addMsg('a', '🔇 ভয়েস বাজেনি। কারণ: ' + (voiceNote || 'অজানা')); } };
  const cloud = vmode !== 'google'; let nx = cloud && parts[0] ? cloudAudio(parts[0]) : null;
  for (let i = 0; i < parts.length && !stopFlag; i++) { if ($('#cap')) { $('#cap').textContent = parts[i]; $('#cap').classList.add('show'); }
    const cur = cloud ? await nx : null; nx = cloud && parts[i + 1] ? cloudAudio(parts[i + 1]) : null;
    if (cur) { voiceNote = ''; src = AC.createBufferSource(); src.buffer = cur; src.connect(an); AV.say?.(parts[i], cur.duration * 1000); src.start(); await new Promise(r => (src.onended = r)); }
    else if (vmode !== 'sadia') { AV.say?.(parts[i], parts[i].length * 75); if (!(await gSpeak(parts[i]))) warn(); }
    else warn();
  }
  speaking = false; state(micOn ? 'LISTENING' : 'IDLE'); AV.mood?.('calm'); emo = 'calm'; document.body.dataset.e = 'calm'; if ($('#cap')) { $('#cap').classList.remove('show'); } resumeMicAfterSpeech();
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
async function micLegacy(on) {
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
  rec = new SR(); rec.lang = L().sr; rec.continuous = true;
  rec.onresult = e => { const t = e.results[e.results.length - 1][0].transcript.trim(); if (t && !speaking && !busy && Date.now() > quietUntil) run(t, true); };
  rec.onend = () => { if (micOn && !speaking) setTimeout(() => { if (micOn && !speaking) try { rec.start(); } catch {} }, 300); };
  try { rec.start(); } catch {}
  state('LISTENING');
}

// ---------- Beep-free mic (MediaRecorder + silence detection + Whisper) ----------
let vad = null;
async function sttBlob(b) {
  const r = await wfetch('/stt?lang=' + L().stt, { method: 'POST', headers: { 'Content-Type': b.type || 'audio/webm', ...H() }, body: b });
  const j = await r.json(); if (j.error) throw new Error(j.error.message || 'stt error');
  return (j.text || '').trim();
}
async function vadStart() {
  if (vad) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  await AC.resume();
  const node = AC.createMediaStreamSource(stream), an2 = AC.createAnalyser(); an2.fftSize = 1024; node.connect(an2);
  const buf = new Uint8Array(an2.fftSize);
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => window.MediaRecorder?.isTypeSupported?.(t)) || '';
  let cur = null, lastVoice = 0, noise = 0.01;
  const begin = () => {
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined), chunks = [];
    mr.ondataavailable = e => e.data.size && chunks.push(e.data);
    mr.start(); cur = { mr, chunks, t0: Date.now() };
  };
  const finish = keep => {
    const c = cur; cur = null; if (!c) return;
    const dur = Date.now() - c.t0;
    c.mr.onstop = async () => {
      if (!keep || dur < 700) return;
      try {
        const t = await sttBlob(new Blob(c.chunks, { type: c.mr.mimeType || mime || 'audio/webm' }));
        if (t.length > 1 && !/^(ধন্যবাদ|thank you|thanks|bye)[\s।.!]*$/i.test(t) && !speaking && !busy) run(t, true);
      } catch (e) { console.warn('stt', e); }
    };
    try { c.mr.stop(); } catch {}
  };
  const timer = setInterval(() => {
    an2.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += (v - 128) ** 2;
    const rms = Math.sqrt(s / buf.length) / 128, now = Date.now(), thr = Math.max(0.035, noise * 3.5);
    if (speaking || busy || now < quietUntil) { if (cur) finish(false); return; }
    if (rms > thr) { lastVoice = now; if (!cur) { begin(); state('LISTENING'); } }
    else { if (!cur) noise = noise * 0.97 + rms * 0.03; else if (now - lastVoice > 1100) finish(true); }
    if (cur && now - cur.t0 > 20000) finish(true);
  }, 80);
  vad = { stream, timer, node, stop() { clearInterval(timer); if (cur) finish(false); stream.getTracks().forEach(t => t.stop()); try { node.disconnect(); } catch {} } };
}
function vadStop() { if (vad) { vad.stop(); vad = null; } }
async function mic(on) {
  if (!on) { micOn = false; $('#mic').classList.remove('on'); vadStop(); stopMicForSpeech(); NP()?.keepAlive({ on: false })?.catch?.(() => {}); return state('IDLE'); }
  try { await vadStart(); micOn = true; $('#mic').classList.add('on'); NP()?.keepAlive({ on: true })?.catch?.(() => {}); state('LISTENING'); }
  catch (e) { addMsg('a', 'বিপহীন মাইক চালু হয়নি (' + String(e.message || e).slice(0, 80) + ')। পুরনো মাইক চালু করছি।'); return micLegacy(true); }
}

// ---------- Camera / Vision ----------
async function look(q) {
  const v = $('#cam'); if (!v.videoWidth) throw new Error('ক্যামেরা এখনো প্রস্তুত নয়');
  const c = document.createElement('canvas'); c.width = 512; c.height = v.videoHeight * 512 / v.videoWidth;
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  const msgs = [{ role: 'user', content: [{ type: 'text', text: (q || 'ছবিতে কী দেখছ?') + ' (বাংলায় সংক্ষেপে বলো)' }, { type: 'image_url', image_url: { url: c.toDataURL('image/jpeg', .6) } }] }];
  try { return await llm('vision2', msgs); } catch (e1) { try { return await llm('vision', msgs); } catch { throw new Error(String(e1.message || e1).slice(0, 120)); } }
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

// ---------- Tasks ----------
let tasks = ST.get('vx_tasks', []);
const bn2en = s => String(s ?? '').replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
function renderT() {
  const l = $('#tlist'); if (!l) return;
  l.innerHTML = tasks.length ? tasks.map(x => '<div class="ti' + (x.done ? ' d' : '') + '" data-id="' + x.id + '"><label><input type="checkbox"' + (x.done ? ' checked' : '') + '><span>' + esc(x.t) + '</span></label><button class="tx" aria-label="মুছুন">✕</button></div>').join('') : '<small>এখনো কোনো টাস্ক নেই। বলুন: "টাস্কে যোগ করো ..."</small>';
}
const saveT = () => { ST.set('vx_tasks', tasks); renderT(); };
const findT = q => { q = bn2en(q).trim(); const n = parseInt(q); if (n > 0 && n <= tasks.length && String(n) === q) return tasks[n - 1]; return tasks.find(x => q && (x.t.includes(q) || q.includes(x.t))) || null; };
const Task = {
  add: async (t, min) => { t = String(t || '').trim(); if (!t) return 'কাজের নাম পাইনি'; tasks.push({ id: Date.now(), t, done: false }); saveT(); const m = parseFloat(bn2en(min)); if (m > 0) await Dev.remind(m, 'কাজের কথা মনে করিয়ে দিচ্ছি: ' + t); return 'টাস্কে যোগ করলাম: ' + t + (m > 0 ? '। ' + m + ' মিনিট পর মনে করাব' : ''); },
  done: q => { const x = findT(q); if (!x) return 'এই নামে টাস্ক পাইনি'; x.done = true; saveT(); return x.t + ' শেষ হিসেবে চিহ্নিত করলাম'; },
  delete: q => { const x = findT(q); if (!x) return 'এই নামে টাস্ক পাইনি'; tasks = tasks.filter(y => y !== x); saveT(); return x.t + ' মুছে দিলাম'; },
  list: () => tasks.length ? tasks.map((x, i) => (i + 1) + '. ' + (x.done ? '[শেষ] ' : '') + x.t).join('; ') : 'কোনো টাস্ক নেই'
};

// ---------- Main pipeline ----------
async function run(text, voice = false) {
  let raw = String(text || '').trim();
  if (voice) {
    if (WAKE() && !(/^(সাদিয়া|sadia)/i.test(raw) || Date.now() - lastTalk < 60000)) return;
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
  { const lm = text.match(/(বাংলা|ইংরেজি|হিন্দি|উর্দু|আরবি|মালয়)\s*(?:তে|ভাষায়)?\s*কথা\s*বল/); if (lm) setLang({ 'বাংলা': 'bn', 'ইংরেজি': 'en', 'হিন্দি': 'hi', 'উর্দু': 'ur', 'আরবি': 'ar', 'মালয়': 'ms' }[lm[1]]); }
  if (/(আগের|স্বাভাবিক|নরমাল|নিজের)\s*(মতো|মত|ভাবে|করে)?\s*কথা\s*বল/.test(text) || /ক্যারেক্টার\s*(বন্ধ|বাদ|ছেড়ে)/.test(text)) { chr = ''; ST.set('vx_chr', chr); }
  else { const cm = text.match(/^(.{2,40}?)\s*(?:হয়ে|করে|স্টাইলে|ঢঙে|মতো|মত|ভাবে)\s*(?:আমার\s*সাথে\s*|এখন\s*|এবার\s*)?কথা\s*বল/); if (cm) { chr = cm[1].replace(/^(?:তুমি\s*|কি\s*|কী\s*|এখন\s*থেকে\s*|এখন\s*|এবার\s*)+/, '').trim(); if (chr) ST.set('vx_chr', chr); } }
  lastTalk = Date.now();
  if (busy || !text) return; busy = true; stopFlag = false; addMsg('u', text); state('THINKING');
  try {
    agent('manager'); let plan = { agent: 'chat', steps: [] }, planOk = false;
    try { plan = JSON.parse((await llm('manager', [{ role: 'system', content: MGR + ' ' + nowCtx() }, { role: 'user', content: text }])).match(/\{[\s\S]*\}/)[0]); planOk = true; } catch {}
    const obs = [];
    if (!(plan.steps || []).length && (plan.agent || 'chat') === 'chat' && text.length > 6 && !/^(হাই|হ্যালো|সালাম|আসসালামু|ধন্যবাদ)/.test(text) && !/(অ্যালার্ম|কল দাও|টাইমার|ফ্ল্যাশ|ক্যামেরা)/.test(text)
      && (!planOk || /(আজ|এখন|খবর|দাম|আবহাওয়া|ওয়েদার|স্কোর|সর্বশেষ|বর্তমান|রেট|ফলাফল|কে জিত)/.test(text))) plan.steps = [{ tool: 'search', q: text }];
    for (const s of plan.steps || []) {
      if (stopFlag) break;
      try {
        if (s.tool === 'search') { const rs = await (await wfetch('/search?q=' + encodeURIComponent(s.q), { headers: H() })).json(); obs.push('সার্চ: ' + (Array.isArray(rs) && rs.length ? rs.map(x => x.title + ' - ' + x.snippet).join(' | ') : 'কোনো ফলাফল পাওয়া যায়নি')); }
        else if (s.tool === 'device' && Dev[s.cmd]) obs.push(s.cmd + ': ' + await Dev[s.cmd](s.arg, s.arg2));
        else if (s.tool === 'task' && Task[s.cmd]) obs.push('টাস্ক: ' + await Task[s.cmd](s.arg, s.arg2));
      } catch (e) { obs.push((s.cmd || s.tool) + ' ব্যর্থ: ' + e.message); }
    }
    let visErr = '';
    if (camOn && /(দেখ|ছবি|সামনে|কী আছে|কি আছে|এটা কী|এটা কি|পড়ে|চেহারা|পোশাক|হাতে)/.test(text)) { try { scene = await look(text); } catch (e) { visErr = String(e.message || e).slice(0, 140); scene = ''; } }
    const ag = AGENTS.includes(plan.agent) ? plan.agent : 'chat'; agent(ag);
    const sys = nowCtx() + bdCtx(text) + ABOUT_PROMPT() + charP() + langP() + (AGP[ag] || '') + PERSONA + (obs.length ? 'নিচের "টুলের ফলাফল" থেকে তথ্য নিয়ে উত্তর দাও, নিজে কিছু বানিয়ে বলো না। ' : '') + (facts.join('; ') || 'কিছু না') + (scene ? '। তোমার ক্যামেরা চালু আছে এবং তুমি ছবি দেখতে পাও। ক্যামেরায় এখন দেখা যাচ্ছে: ' + scene : camOn ? '। ক্যামেরা চালু আছে কিন্তু ছবি বিশ্লেষণ হয়নি' + (visErr ? ' (কারণ: ' + visErr + ')' : '') + '; ব্যবহারকারীকে সোজাসুজি এটা জানাও' : '') + (ag === 'chat' ? '' : '। কাজটা পুরো করো, কোড হলে code block দাও।');
    const el = addMsg('a', '…');
    let ans = await llm(ag, [{ role: 'system', content: sys }, ...hist.slice(-12), { role: 'user', content: text + (obs.length ? '\n\n[টুলের ফলাফল]\n' + obs.join('\n') : '') }], t => { setBody(el, /^\s*\[[a-z]*$/i.test(t) ? '…' : t.replace(EMO_RE, '')); $('#log').scrollTop = 1e9; });
    { const em = ans.match(EMO_RE); emo = em ? em[1].toLowerCase() : 'calm'; ans = ans.replace(EMO_RE, ''); setBody(el, ans); }
    if (['coder', 'writer', 'researcher', 'math'].includes(ag) && !stopFlag) { agent('manager'); try { ans = await llm('reviewer', [{ role: 'system', content: 'তুমি Reviewer। নিচের উত্তরে ভুল থাকলে ঠিক করে পুরো উত্তরটা আবার দাও, ঠিক থাকলে হুবহু একই দাও।' }, { role: 'user', content: ans }]); setBody(el, ans); } catch {} }
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
$('#wtest').onclick = async () => { try { const r = await wfetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...H() }, body: JSON.stringify({ provider: 'groq', model: 'openai/gpt-oss-120b', messages: [{ role: 'user', content: 'hi' }] }) }); addMsg('a', 'Worker উত্তর: ' + r.status + ' ' + (await r.text()).slice(0, 200)); } catch (e) { addMsg('a', 'Worker-এ পৌঁছাতে পারিনি: ' + e.message); } sheet.hidden = true; };
$('#vtest').onclick = () => { perms(); stopFlag = false; speak('হ্যালো! আমি সাদিয়া। আমার ভয়েস এখন এভাবে শোনাচ্ছে।'); };
const flashOn = { v: false };
document.querySelectorAll('#chips button').forEach(b => (b.onclick = async () => {
  if (b.dataset.q) return run(b.dataset.q);
  perms(); let a = b.dataset.a; if (b.dataset.c === 'flash') { flashOn.v = !flashOn.v; a = flashOn.v ? 'on' : 'off'; }
  try { addMsg('a', await Dev[b.dataset.c](a, b.dataset.b)); } catch (e) { addMsg('a', 'হয়নি: ' + e.message); }
}));
} catch (e) { console.warn(e); }

try {
  renderT();
  const ts = $('#tsheet');
  if (ts) {
    $('#tasksb').onclick = () => { $('#sheet').hidden = true; ts.hidden = false; renderT(); };
    $('#tclose').onclick = () => (ts.hidden = true);
    const addT = () => { const v = $('#tin').value.trim(); if (v) { Task.add(v); $('#tin').value = ''; } };
    $('#tadd').onclick = addT; $('#tin').onkeydown = e => { if (e.key === 'Enter') addT(); };
    $('#tlist').onclick = e => { const row = e.target.closest('.ti'); if (!row) return; const x = tasks.find(y => String(y.id) === row.dataset.id); if (!x) return;
      if (e.target.classList.contains('tx')) { tasks = tasks.filter(y => y !== x); saveT(); } else if (e.target.type === 'checkbox') { x.done = e.target.checked; saveT(); } };
  }
} catch (e) { console.warn(e); }

try {
  const ls = $('#lang'); ls.innerHTML = Object.entries(LANGS).map(([k, v]) => '<option value="' + k + '">' + v.n + '</option>').join('');
  setLang(lang); ls.onchange = () => setLang(ls.value);
  const lsh = $('#langsheet'); lsh.innerHTML = '<h3>ভাষা বেছে নিন</h3>' + Object.entries(LANGS).map(([k, v]) => '<button data-l="' + k + '">' + v.n + '</button>').join('');
  const mark = () => lsh.querySelectorAll('[data-l]').forEach(b => b.classList.toggle('on', b.dataset.l === lang));
  $('#langb').onclick = () => { mark(); lsh.hidden = !lsh.hidden; };
  lsh.onclick = e => { const b = e.target.closest('[data-l]'); if (!b) return; setLang(b.dataset.l); lsh.hidden = true; };
  const VT = { bn: 'এই আমার কণ্ঠ', en: 'This is my voice', hi: 'यह मेरी आवाज़ है', ur: 'یہ میری آواز ہے', ar: 'هذا صوتي', ms: 'Ini suara saya' };
  const setG = (g, say) => { vgen = g; ST.set('vx_gen', g); document.querySelectorAll('[data-g]').forEach(b => b.classList.toggle('on', b.dataset.g === g)); if (say) speak(VT[lang]); };
  setG(vgen); document.querySelectorAll('[data-g]').forEach(b => (b.onclick = () => setG(b.dataset.g, true)));
  $('#wake').checked = WAKE(); $('#wake').onchange = e => ST.set('vx_wake', e.target.checked);
  $('#wlist').value = ST.get('vx_workers', []).join('\n');
  $('#wsave').onclick = () => { const l = $('#wlist').value.split(/\s+/).map(x => x.trim().replace(/\/$/, '')).filter(x => /^https:\/\//.test(x)); ST.set('vx_workers', l); addMsg('a', 'Worker তালিকা সেভ হয়েছে: মোট ' + (l.length + 1) + 'টি'); };
} catch (e) { console.warn(e); }
(async () => { try {
  const v = await (await fetch('version.json?' + Date.now(), { cache: 'no-store' })).json();
  if (v.version && v.version !== APP_VERSION && $('#upd')) { $('#upd').hidden = false; $('#upd').onclick = async () => { try { (await navigator.serviceWorker?.getRegistrations?.() || []).forEach(r => r.unregister()); (await caches.keys()).filter(k => k !== 'vx-voice').forEach(k => caches.delete(k)); } catch {} location.reload(); }; }
} catch {} })();

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
