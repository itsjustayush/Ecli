const $ = (selector) => document.querySelector(selector);
const petWrap = $('#pet-wrap');
const petSvg = $('#pet-svg');
const scene = $('#scene');
const toast = $('#toast');

const defaults = {
  energy: 78,
  curiosity: 64,
  cozy: 82,
  accent: '#9da3ff',
  attention: 3,
  alwaysOnTop: true,
  sound: true,
  context: true,
  note: '',
  timerSeconds: 25 * 60,
};

const saved = JSON.parse(localStorage.getItem('ecli-state') || '{}');
const state = { ...defaults, ...saved };
let moodTimer;
let toastTimer;
let timerInterval = null;
let timerRemaining = state.timerSeconds;
let timerRunning = false;
let typingBurst = [];
let lastActivity = Date.now();
let drag = null;
let reminderKind = 'stretch';
let reminderDueAt = Date.now() + 45 * 60 * 1000;
let updateStatus = 'current';

function persist() {
  localStorage.setItem('ecli-state', JSON.stringify({ ...state, timerSeconds: timerRemaining }));
}

function setAccent(color) {
  state.accent = color;
  document.documentElement.style.setProperty('--accent', color);
  $('#accent-input').value = color;
  persist();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function chirp(kind = 'soft') {
  if (!state.sound || !window.AudioContext) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const base = kind === 'happy' ? 560 : kind === 'hot' ? 230 : 420;
    osc.frequency.setValueAtTime(base, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(base * (kind === 'happy' ? 1.35 : .8), ctx.currentTime + .16);
    gain.gain.setValueAtTime(.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.05, ctx.currentTime + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .19);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + .21);
    osc.addEventListener('ended', () => ctx.close());
  } catch (_) { /* sound is an optional enhancement */ }
}

function clearMoodClasses() {
  petWrap.classList.remove('is-petting', 'is-happy', 'is-sleeping', 'is-thinking', 'is-hot', 'is-stretching', 'is-wobbling');
}

function setMood(title, chip, className = '', duration = 0) {
  clearTimeout(moodTimer);
  clearMoodClasses();
  $('#mood-title').textContent = title;
  $('#mood-chip').textContent = chip;
  if (className) petWrap.classList.add(className);
  if (duration) moodTimer = setTimeout(() => setMood('orbiting quietly', 'CALM'), duration);
}

function updateNeeds() {
  const values = [state.energy, state.curiosity, state.cozy];
  ['energy', 'curiosity', 'cozy'].forEach((key, index) => {
    const value = Math.round(state[key]);
    $(`#${key}-meter`).style.width = `${value}%`;
    $(`#${key}-value`).textContent = value;
  });
  const lowest = Math.min(...values);
  $('#needs-status').textContent = lowest < 28 ? 'needs care' : lowest < 48 ? 'a little low' : 'steady';
}

function updateNote() {
  const note = state.note.trim();
  const el = $('#floating-note');
  el.textContent = note;
  el.hidden = !note;
  $('#note-input').value = note;
}

function renderTimer() {
  const mins = Math.floor(timerRemaining / 60).toString().padStart(2, '0');
  const secs = Math.floor(timerRemaining % 60).toString().padStart(2, '0');
  $('#timer-display').textContent = `${mins}:${secs}`;
  $('#timer-label').textContent = timerRunning ? `${mins}:${secs} focus` : '25:00 focus';
  $('#timer-toggle').textContent = timerRunning ? 'pause timer' : timerRemaining < 25 * 60 ? 'resume timer' : 'start timer';
  const progress = ((25 * 60 - timerRemaining) / (25 * 60)) * 100;
  $('#timer-progress').style.width = `${Math.max(0, Math.min(100, progress))}%`;
}

function setTimerRunning(shouldRun) {
  timerRunning = shouldRun;
  clearInterval(timerInterval);
  if (timerRunning) {
    setMood('holding your focus', 'FOCUS', 'is-thinking');
    timerInterval = setInterval(() => {
      timerRemaining -= 1;
      if (timerRemaining <= 0) {
        timerRemaining = 25 * 60;
        timerRunning = false;
        clearInterval(timerInterval);
        setMood('focus orbit complete', 'BREAK', 'is-happy', 4200);
        showToast('Focus orbit complete. Time for a gentle break.');
        chirp('happy');
      }
      renderTimer();
      persist();
    }, 1000);
  } else if (timerRemaining > 0) {
    setMood('orbiting quietly', 'CALM');
  }
  renderTimer();
}

function interact(kind) {
  lastActivity = Date.now();
  if (kind === 'snack') {
    state.energy = Math.min(100, state.energy + 13);
    state.cozy = Math.min(100, state.cozy + 5);
    setMood('tiny snack acquired', 'SATISFIED', 'is-happy', 3000);
    showToast('Ecli found a starberry. Very good snack.');
    chirp('happy');
  }
  if (kind === 'play') {
    state.curiosity = Math.min(100, state.curiosity + 18);
    state.energy = Math.max(0, state.energy - 6);
    setMood('chasing a comet', 'PLAYFUL', 'is-happy', 3000);
    showToast('Ecli is hunting the cursor.');
    chirp('happy');
  }
  if (kind === 'sleep') {
    state.cozy = Math.min(100, state.cozy + 12);
    state.energy = Math.min(100, state.energy + 7);
    setMood('drifting through a soft nebula', 'SLEEPY', 'is-sleeping');
    showToast('Sleep mode on. Click Ecli to wake them.');
  }
  updateNeeds();
  persist();
}

function triggerPet() {
  if (petWrap.classList.contains('is-sleeping')) {
    setMood('hello again, stargazer', 'AWAKE', 'is-happy', 2600);
    chirp('happy');
    showToast('Ecli woke up.');
    return;
  }
  state.cozy = Math.min(100, state.cozy + 3);
  state.curiosity = Math.min(100, state.curiosity + 2);
  setMood('purring in low gravity', 'LOVED', 'is-petting', 2200);
  chirp('soft');
  updateNeeds();
  persist();
}

function updateEyes(clientX, clientY) {
  const rect = petSvg.getBoundingClientRect();
  const dx = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
  const dy = (clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
  const x = Math.max(-2.6, Math.min(2.6, dx * 3));
  const y = Math.max(-3, Math.min(3, dy * 3));
  document.querySelectorAll('.pupil').forEach((pupil) => {
    pupil.style.transform = `translate(${x}px, ${y}px)`;
  });
}

async function beginDrag(event) {
  lastActivity = Date.now();
  const [windowX, windowY] = window.ecli?.getWindowPosition ? await awaitWindowPosition() : [0, 0];
  drag = { pointerId: event.pointerId, startX: event.screenX, startY: event.screenY, windowX, windowY, moved: false };
  petWrap.setPointerCapture(event.pointerId);
  event.preventDefault();
}

async function awaitWindowPosition() {
  try { return await window.ecli.getWindowPosition(); } catch (_) { return [0, 0]; }
}

function moveDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const dx = event.screenX - drag.startX;
  const dy = event.screenY - drag.startY;
  if (Math.abs(dx) + Math.abs(dy) > 8) drag.moved = true;
  if (drag.moved && window.ecli?.moveWindow) {
    window.ecli.moveWindow({ x: drag.windowX + dx, y: drag.windowY + dy });
    petWrap.classList.add('is-wobbling');
  }
}

function endDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const wasMoved = drag.moved;
  drag = null;
  petWrap.classList.remove('is-wobbling');
  petWrap.releasePointerCapture?.(event.pointerId);
  if (!wasMoved) triggerPet();
}

function updateReminder() {
  const remaining = Math.max(0, reminderDueAt - Date.now());
  const minutes = Math.ceil(remaining / 60000);
  $('#reminder-title').textContent = reminderKind === 'stretch' ? 'stretch orbit' : 'water check';
  $('#reminder-copy').textContent = minutes > 0 ? `next nudge in ${minutes} min` : 'a gentle nudge is ready';
  $('#reminder-strip .reminder-icon').textContent = reminderKind === 'stretch' ? '◒' : '◓';
}

function fireReminder(kind = reminderKind) {
  reminderKind = kind;
  reminderDueAt = Date.now() + (kind === 'stretch' ? 45 : 30) * 60 * 1000;
  if (kind === 'stretch') {
    setMood('stretching with you', 'STRETCH', 'is-stretching', 5200);
    showToast('Stretch orbit: shoulders down, breathe in, reach up.');
  } else {
    setMood('water makes good fuel', 'THIRSTY', 'is-happy', 4200);
    showToast('Water check: a few sips for your next orbit.');
  }
  chirp('happy');
  updateReminder();
}

async function sampleEnvironment() {
  if (!state.context || !window.ecli?.getSystemContext) return;
  try {
    const context = await window.ecli.getSystemContext();
    if (context.idleSeconds > 240 && Date.now() - lastActivity > 180000) {
      setMood('waiting softly for you', 'IDLE', 'is-sleeping');
      $('#activity-text').textContent = 'quiet mode · Ecli noticed a little stillness';
    } else if (context.onBattery) {
      $('#activity-text').textContent = 'battery-aware · keeping movements gentle';
    } else if (!timerRunning) {
      $('#activity-text').textContent = 'Ecli is listening locally · no telemetry';
    }
  } catch (_) { /* context sensing is best-effort */ }
}

function handleTyping(event) {
  if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
  lastActivity = Date.now();
  const now = Date.now();
  typingBurst = typingBurst.filter((time) => now - time < 1800);
  typingBurst.push(now);
  if (typingBurst.length > 18) {
    setMood('careful, stargazer', 'WARM', 'is-hot', 2400);
    showToast('Ecli is getting warm — tiny pause?');
    chirp('hot');
  } else {
    setMood('kneading the keyboard', 'TYPING', 'is-petting', 1000);
  }
}

function setDrawer(open) {
  $('#settings-drawer').classList.toggle('open', open);
  $('#settings-drawer').setAttribute('aria-hidden', String(!open));
}

function handleUpdaterStatus(payload = {}) {
  updateStatus = payload.status || 'current';
  const button = $('#update-button');
  if (updateStatus === 'available') {
    button.hidden = false;
    button.textContent = `update ${payload.version || ''}`.trim();
  } else if (updateStatus === 'downloading') {
    button.hidden = false;
    button.textContent = `downloading ${payload.percent || 0}%`;
  } else if (updateStatus === 'downloaded') {
    button.hidden = false;
    button.textContent = 'restart to update';
    showToast(`Ecli ${payload.version || 'new version'} is ready.`);
  } else if (updateStatus === 'error') {
    button.hidden = true;
  } else {
    button.hidden = true;
  }
}

async function handleUpdateButton() {
  if (updateStatus === 'available') {
    showToast('Downloading the Ecli update…');
    await window.ecli?.downloadUpdate?.();
  } else if (updateStatus === 'downloaded') {
    await window.ecli?.installUpdate?.();
  } else {
    showToast('Checking for a new Ecli release…');
    await window.ecli?.checkForUpdates?.();
  }
}

function handleEnvironmentActivity(activity) {
  if (!state.context || !activity || typeof activity.state !== 'string') return;
  const stateName = activity.state.toLowerCase();
  const label = activity.label || 'your activity';
  lastActivity = Date.now();
  if (stateName.includes('thinking') || stateName.includes('agent')) {
    setMood('thinking alongside you', 'AGENT', 'is-thinking');
    $('#activity-text').textContent = `quietly following ${label}`;
  } else if (stateName.includes('done') || stateName.includes('complete') || stateName.includes('success')) {
    setMood('that orbit landed', 'DONE', 'is-happy', 3800);
    $('#activity-text').textContent = `${label} finished · Ecli noticed locally`;
    chirp('happy');
  } else if (stateName.includes('music') || stateName.includes('listening')) {
    setMood('riding the rhythm', 'MUSIC', 'is-happy', 3200);
    $('#activity-text').textContent = `moving with ${label}`;
  } else if (stateName.includes('video') || stateName.includes('reel') || stateName.includes('short')) {
    setMood('peeking from the edge', 'PEEK', 'is-thinking', 3600);
    $('#activity-text').textContent = `peek mode · ${label}`;
  } else if (stateName.includes('coding') || stateName.includes('typing')) {
    setMood('kneading alongside you', 'CODING', 'is-petting', 2200);
    $('#activity-text').textContent = `coding orbit · ${label}`;
  } else if (stateName.includes('idle')) {
    setMood('taking a quiet breath', 'IDLE', 'is-sleeping');
    $('#activity-text').textContent = 'quiet mode · Ecli noticed a little stillness';
  }
}

$('#snack-button').addEventListener('click', () => interact('snack'));
$('#play-button').addEventListener('click', () => interact('play'));
$('#sleep-button').addEventListener('click', () => interact('sleep'));
$('#timer-toggle').addEventListener('click', () => setTimerRunning(!timerRunning));
$('#timer-reset').addEventListener('click', () => { timerRemaining = 25 * 60; setTimerRunning(false); renderTimer(); persist(); showToast('Focus orbit reset.'); });
$('#reminder-button').addEventListener('click', () => fireReminder(reminderKind === 'stretch' ? 'stretch' : 'water'));
$('#settings-button').addEventListener('click', () => setDrawer(true));
$('#update-button').addEventListener('click', handleUpdateButton);
$('#close-settings').addEventListener('click', () => setDrawer(false));
$('#hide-button').addEventListener('click', () => window.ecli?.hideWindow?.());
$('#accent-input').addEventListener('input', (event) => setAccent(event.target.value));
$('#attention-input').addEventListener('input', (event) => { state.attention = Number(event.target.value); persist(); });
$('#top-input').addEventListener('change', (event) => { state.alwaysOnTop = event.target.checked; window.ecli?.toggleAlwaysOnTop?.(state.alwaysOnTop); persist(); });
$('#sound-input').addEventListener('change', (event) => { state.sound = event.target.checked; persist(); });
$('#context-input').addEventListener('change', (event) => { state.context = event.target.checked; persist(); showToast(state.context ? 'Environment reactions on.' : 'Environment reactions paused.'); });
$('#note-save').addEventListener('click', () => { state.note = $('#note-input').value; updateNote(); persist(); showToast(state.note ? 'Note pinned above Ecli.' : 'Note cleared.'); });
$('#clear-note').addEventListener('click', () => { state.note = ''; updateNote(); persist(); showToast('Note unpinned.'); });
$('#note-input').addEventListener('keydown', (event) => { if (event.key === 'Enter') $('#note-save').click(); });

petWrap.addEventListener('pointerdown', beginDrag);
petWrap.addEventListener('pointermove', moveDrag);
petWrap.addEventListener('pointerup', endDrag);
petWrap.addEventListener('pointercancel', endDrag);
scene.addEventListener('pointermove', (event) => updateEyes(event.clientX, event.clientY));
scene.addEventListener('pointerleave', () => document.querySelectorAll('.pupil').forEach((pupil) => { pupil.style.transform = 'translate(0, 0)'; }));
document.addEventListener('keydown', handleTyping);
document.addEventListener('pointermove', () => { lastActivity = Date.now(); }, { passive: true });

setAccent(state.accent);
$('#attention-input').value = state.attention;
$('#top-input').checked = state.alwaysOnTop;
$('#sound-input').checked = state.sound;
$('#context-input').checked = state.context;
updateNeeds();
updateNote();
renderTimer();
updateReminder();
setInterval(updateReminder, 30000);
setInterval(sampleEnvironment, 20000);
setInterval(() => {
  if (Date.now() - lastActivity > 45 * 60 * 1000) return;
  state.energy = Math.max(0, state.energy - .4);
  state.curiosity = Math.max(0, state.curiosity - .15);
  updateNeeds();
  persist();
}, 60000);

// A quiet, local reminder loop. It never sends data or creates a background cloud task.
setInterval(() => {
  if (Date.now() >= reminderDueAt) {
    fireReminder(reminderKind);
    reminderKind = reminderKind === 'stretch' ? 'water' : 'stretch';
  }
}, 15000);

window.ecli?.onEnvironmentActivity?.(handleEnvironmentActivity);
window.ecli?.onUpdaterStatus?.(handleUpdaterStatus);
