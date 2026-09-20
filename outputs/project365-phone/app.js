/* ═══════════════════════════════════════════════════════════════
   PROJECT365 v3.1 — Discipline System Upgrade
   Global Score, Badges, Recovery Plan, Weekly Reports, PDF Export
   ═══════════════════════════════════════════════════════════════ */

// ─── Constants & Config ──────────────────────────────────────
const KEY = "project365.single_user.v1";
const GOAL_DAYS = 365;

const DEFAULT_SETTINGS = {
  startDate: "2026-06-16",
  leetcodeGoal: 500,
  aiPhase: "learning",
  aiLearningMonths: 6,
  logicalDayCutoffHour: 1,
  lastBackupAt: null,
  lastOpenedDate: null,
  notificationsEnabled: true,
  workshopMode: null
};

const SCHEDULE = [
  ["morning",      "Morning Routine",    "06:00", "07:00"],
  ["prayer",       "Breakfast + Prayer", "07:00", "07:20"],
  ["college",      "College",            "09:00", "15:00"],
  ["college_work", "College Work",       "18:00", "20:30"],
  ["dinner",       "Dinner",             "20:30", "21:00"],
  ["walking",      "Walking",            "21:00", "21:30"],
  ["ai_ml",        "AI/ML",              "21:30", "23:30"],
  ["leetcode",     "LeetCode",           "23:30", "01:00"]
];

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 1;

const GIFTS = [
  { emoji: "🔥", text: "The fire in you is stronger than the fire around you." },
  { emoji: "💪", text: "Discipline is choosing between what you want now and what you want most." },
  { emoji: "🌟", text: "You are one day closer to the person you want to become." },
  { emoji: "🎯", text: "Small daily improvements over time lead to stunning results." },
  { emoji: "🧠", text: "Your mind is a weapon. Keep it sharp." },
  { emoji: "⚡", text: "Energy and persistence conquer all things." },
  { emoji: "🏔️", text: "The mountain is high, but you're already climbing." },
  { emoji: "🦁", text: "Be a lion among sheep. Lead yourself first." },
  { emoji: "💎", text: "Pressure makes diamonds. Keep pushing." },
  { emoji: "🚀", text: "Launch yourself beyond your limits today." },
  { emoji: "🌊", text: "Be like water — adapt, flow, overcome." },
  { emoji: "🎖️", text: "Medals are earned in practice, not in the game." },
  { emoji: "⏰", text: "Time waits for no one. Make every hour count." },
  { emoji: "🌅", text: "Each sunrise is a chance to reset and restart." },
  { emoji: "🔑", text: "Consistency is the key that unlocks greatness." },
  { emoji: "🧗", text: "The view from the top is worth the climb." },
  { emoji: "🎓", text: "Learning never exhausts the mind." },
  { emoji: "💡", text: "An idea without execution is just a daydream." },
  { emoji: "🏆", text: "Champions are made when nobody is watching." },
  { emoji: "🌙", text: "Even the darkest night will end with a sunrise." },
  { emoji: "📈", text: "Progress, not perfection. You're growing." },
  { emoji: "🛡️", text: "Your discipline is your armor. Wear it daily." },
  { emoji: "🌱", text: "Tiny seeds grow into mighty trees. Keep planting." },
  { emoji: "⭐", text: "You were born to stand out, not to fit in." },
  { emoji: "🔨", text: "Build the life you want, brick by brick." },
  { emoji: "🎵", text: "Life has rhythm. Find yours and dance to it." },
  { emoji: "🦅", text: "Eagles don't flock. You'll find them one at a time." },
  { emoji: "🎪", text: "Life is a circus — be the ringmaster." },
  { emoji: "🧩", text: "Every piece matters. Even the ones that don't seem to fit yet." },
  { emoji: "🌈", text: "After the storm comes the rainbow. Keep going." },
  { emoji: "🗝️", text: "The key to success is hidden in your daily routine." },
  { emoji: "⚔️", text: "Battle your excuses. Win against yourself." },
  { emoji: "🎯", text: "Aim so high that even if you miss, you land among stars." },
  { emoji: "🏗️", text: "Rome wasn't built in a day, but they worked on it every day." },
  { emoji: "🧭", text: "Direction is more important than speed." },
  { emoji: "🐝", text: "Be busy like a bee. Sweetness comes from hard work." },
  { emoji: "🌻", text: "Turn your face to the sun. Let the shadows fall behind." },
  { emoji: "🔋", text: "Recharge, refocus, restart. You've got this." },
  { emoji: "📚", text: "Knowledge compounds. Every hour of study pays dividends." },
  { emoji: "🎭", text: "Master your emotions. They are tools, not your master." },
  { emoji: "🌀", text: "Chaos is just opportunity in disguise." },
  { emoji: "💫", text: "Believe in your infinite potential." },
  { emoji: "🔐", text: "Lock in. Focus mode activated." },
  { emoji: "🎸", text: "Play your own tune. The world needs your unique sound." },
  { emoji: "🏛️", text: "Build a legacy that outlasts you." },
  { emoji: "🦊", text: "Be smart. Be cunning. Be unstoppable." },
  { emoji: "🌐", text: "Think globally, act locally, grow personally." },
  { emoji: "💥", text: "Make today so epic that yesterday gets jealous." },
  { emoji: "🧬", text: "Success is in your DNA. Activate it." },
  { emoji: "🎆", text: "You are a firework. Ignite and shine." }
];

const MILESTONES = {
  1: { emoji: "🎬", text: "Day 1! The journey of 365 days begins with this single step. Let's GO!" },
  7: { emoji: "🎯", text: "One week strong! You've proven you can start. Now prove you can continue." },
  14: { emoji: "⚡", text: "Two weeks! Habits are forming. The neural pathways are strengthening!" },
  30: { emoji: "🏅", text: "ONE MONTH! 🎉 You're officially in the top 10% of people who stick to their goals!" },
  50: { emoji: "🔥", text: "50 days of discipline! Half a century of commitment!" },
  75: { emoji: "💎", text: "75 Hard complete! You've proven you're made of diamond." },
  100: { emoji: "💯", text: "TRIPLE DIGITS! 100 days! You are a machine of discipline!" },
  150: { emoji: "🏔️", text: "150 days — you're past the halfway hump. The summit is visible!" },
  200: { emoji: "🚀", text: "200 days! Over half way there. You're UNSTOPPABLE!" },
  250: { emoji: "🌟", text: "250 days! You're in the elite zone. Most people quit at Day 3." },
  300: { emoji: "🦁", text: "300 DAYS! The lion doesn't concern himself with the opinions of sheep." },
  330: { emoji: "🏆", text: "330 days! One month to go. THE FINISH LINE IS IN SIGHT!" },
  350: { emoji: "⭐", text: "350 days! Two weeks to legendary status!" },
  365: { emoji: "👑", text: "DAY 365! YOU DID IT! 👑🎆🏆 A FULL YEAR OF DISCIPLINE. YOU ARE A LEGEND!" }
};

// ─── Discipline Levels ──────────────────────────────────────
const DISCIPLINE_LEVELS = [
  { min: 0,    max: 199,  name: "Beginner",         emoji: "🌱", css: "beginner" },
  { min: 200,  max: 499,  name: "Consistent",       emoji: "📈", css: "consistent" },
  { min: 500,  max: 999,  name: "Disciplined",       emoji: "💪", css: "disciplined" },
  { min: 1000, max: 1999, name: "Iron Discipline",   emoji: "🛡️", css: "iron" },
  { min: 2000, max: 99999, name: "Elite Execution",  emoji: "👑", css: "elite" }
];

// ─── Achievement Badges ─────────────────────────────────────
const BADGES = [
  { id: "streak_7",   emoji: "🔥", name: "7 Day Streak",    cat: "Streak" },
  { id: "streak_30",  emoji: "💪", name: "30 Day Streak",   cat: "Streak" },
  { id: "streak_60",  emoji: "⚡", name: "60 Day Streak",   cat: "Streak" },
  { id: "streak_90",  emoji: "🛡️", name: "90 Day Streak",   cat: "Streak" },
  { id: "streak_180", emoji: "💎", name: "180 Day Streak",  cat: "Streak" },
  { id: "streak_365", emoji: "👑", name: "365 Day Streak",  cat: "Streak" },
  { id: "lc_100",  emoji: "💻", name: "100 LeetCode",    cat: "LeetCode" },
  { id: "lc_250",  emoji: "🧠", name: "250 LeetCode",    cat: "LeetCode" },
  { id: "lc_500",  emoji: "🏆", name: "500 LeetCode",    cat: "LeetCode" },
  { id: "ai_100",  emoji: "🤖", name: "100 AI/ML Hrs",   cat: "AI/ML" },
  { id: "ai_250",  emoji: "🔬", name: "250 AI/ML Hrs",   cat: "AI/ML" },
  { id: "ai_500",  emoji: "🎓", name: "500 AI/ML Hrs",   cat: "AI/ML" },
  { id: "backlog_killer", emoji: "⚔️", name: "Backlog Killer", cat: "Special" },
  { id: "perfect_week",  emoji: "🌟", name: "Perfect Week",   cat: "Special" },
  { id: "perfect_month", emoji: "🏛️", name: "Perfect Month",  cat: "Special" }
];

// ─── State ───────────────────────────────────────────────────
let state = loadState();
let activeScreen = "dashboard";
let pendingDialogSave = null;
let backlogFilter = "pending";
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let calendarSelectedDay = null;
let timerInterval = null;
let notificationCheckInterval = null;
let lastNotifiedSession = null;
let giftDismissedToday = false;
let cachedScore = null;
let cachedBadges = null;

const $ = (id) => document.getElementById(id);

// ─── Date & Time Utilities ──────────────────────────────────
function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function parseDate(key) { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); }
function todayKey() { return toDateKey(new Date()); }
function logicalDayKey(date = new Date()) {
  const d = new Date(date);
  const cutoff = Number(state.settings.logicalDayCutoffHour ?? 1);
  if (d.getHours() < cutoff) d.setDate(d.getDate() - 1);
  return toDateKey(d);
}
function addDays(key, n) { const d = parseDate(key); d.setDate(d.getDate() + n); return toDateKey(d); }
function daysBetween(a, b) { return Math.floor((parseDate(b) - parseDate(a)) / 86400000); }
function dayNumberFor(dateKey) {
  const start = parseDate(state.settings.startDate);
  return Math.max(1, Math.floor((parseDate(dateKey) - start) / 86400000) + 1);
}
function nextSunday(fromKey) {
  const d = parseDate(fromKey); const offset = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + offset); return toDateKey(d);
}
function isSunday(key) { return parseDate(key).getDay() === 0; }
function minutesFromTime(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function sessionDurationMinutes(s) {
  let st = minutesFromTime(s.startTime), en = minutesFromTime(s.endTime);
  if (en <= st) en += 1440; return en - st;
}
function isWithinTimeWindow(session) {
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
  let st = minutesFromTime(session.startTime), en = minutesFromTime(session.endTime), adj = nm;
  if (en <= st) { if (adj < st) adj += 1440; en += 1440; }
  return adj >= st && adj < en;
}
function isSessionPast(session) {
  const nm = new Date().getHours() * 60 + new Date().getMinutes();
  let st = minutesFromTime(session.startTime), en = minutesFromTime(session.endTime);
  if (en <= st) { return nm >= en && nm < st; }
  return nm >= en;
}
function isSessionFuture(session) {
  const nm = new Date().getHours() * 60 + new Date().getMinutes();
  let st = minutesFromTime(session.startTime), en = minutesFromTime(session.endTime);
  if (en <= st) { return nm < st && nm >= en; }
  return nm < st;
}
// Returns true if the given session is currently paused
function isSessionPaused(sessionId) {
  return state.timerPause.sessionId === sessionId;
}

// Returns total ms paused for a session (including current open pause if active)
function getTotalPausedMs(sessionId) {
  const stored = state.timerPause.totalPausedMs[sessionId] || 0;
  if (state.timerPause.sessionId === sessionId && state.timerPause.pausedAt) {
    return stored + (Date.now() - state.timerPause.pausedAt);
  }
  return stored;
}

// Pause the active session
function pauseSession(sessionId) {
  if (state.timerPause.sessionId === sessionId) return; // already paused
  state.timerPause.sessionId = sessionId;
  state.timerPause.pausedAt = Date.now();
  saveState();
  render();
}

// Resume the active session
function resumeSession(sessionId) {
  if (state.timerPause.sessionId !== sessionId) return;
  const elapsed = Date.now() - (state.timerPause.pausedAt || Date.now());
  state.timerPause.totalPausedMs[sessionId] = (state.timerPause.totalPausedMs[sessionId] || 0) + elapsed;
  state.timerPause.sessionId = null;
  state.timerPause.pausedAt = null;
  saveState();
  render();
}

function finalizePauseBacklog(session) {
  const pausedMs = getTotalPausedMs(session.id);
  const pausedMinutes = Math.ceil(pausedMs / 60000);
  if (pausedMinutes <= 0) return;

  // Add a partial backlog entry representing the paused time
  const backlogId = `backlog-pause-${session.id}`;
  if (!state.backlog.some(b => b.id === backlogId)) {
    state.backlog.push({
      id: backlogId,
      sourceSessionId: session.id,
      sourceDate: logicalDayKey(),
      title: `${session.title} (paused ${pausedMinutes} min)`,
      type: session.type,
      status: 'pending',
      recoverySunday: nextSunday(logicalDayKey()),
      carryCount: 0,
      notes: `Timer was paused for ${pausedMinutes} minutes during this session.`,
      completedAt: null,
      isPauseBacklog: true,
      pausedMinutes: pausedMinutes
    });
  }

  // Clean up pause state for this session
  delete state.timerPause.totalPausedMs[session.id];
  if (state.timerPause.sessionId === session.id) {
    state.timerPause.sessionId = null;
    state.timerPause.pausedAt = null;
  }
}

function secondsRemainingInSession(session) {
  const now = new Date(), ns = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let es = minutesFromTime(session.endTime) * 60, ss = minutesFromTime(session.startTime) * 60;
  if (es <= ss) es += 86400;
  let an = ns; if (an < ss && es > 86400) an += 86400;
  const rawRemaining = Math.max(0, es - an);
  const pausedSec = Math.floor(getTotalPausedMs(session.id) / 1000);
  return Math.max(0, rawRemaining + pausedSec); // paused time extends the effective end
}
function secondsUntilSessionStart(session) {
  const now = new Date(), ns = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  let ss = minutesFromTime(session.startTime) * 60;
  if (ss <= ns) ss += 86400; // start is tomorrow (cross-midnight)
  return Math.max(0, ss - ns);
}
// secondsRemainingInDay() — Audited against manual test times:
//   12:51 → 43740s (12h09m) ✓   18:05 → 24900s (6h55m) ✓
//   23:50 → 4200s  (1h10m) ✓   00:30 → 1800s  (30m)   ✓
// Math is correct for the 6AM→1AM (19-hour) logical day window.
function secondsRemainingInDay() {
  const now = new Date(), ns = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const es = DAY_END_HOUR * 3600;
  if (now.getHours() >= DAY_START_HOUR) return (86400 - ns) + es;
  if (now.getHours() < DAY_END_HOUR) return es - ns;
  return 0;
}
function dayEndLabel() {
  const h = state.settings.logicalDayCutoffHour ?? DAY_END_HOUR;
  return `Until ${h === 0 ? '12:00 AM' : String(h).padStart(2, '0') + ':00 AM'}`;
}
function dayProgressPercent() {
  const total = (24 - DAY_START_HOUR + DAY_END_HOUR) * 3600;
  return Math.max(0, Math.min(100, ((total - secondsRemainingInDay()) / total) * 100));
}
function formatTimer(ts) {
  return `${String(Math.floor(ts / 3600)).padStart(2, "0")}:${String(Math.floor((ts % 3600) / 60)).padStart(2, "0")}:${String(ts % 60).padStart(2, "0")}`;
}
function formatDate(key) { return parseDate(key).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
function formatDateTime(v) { return v ? new Date(v).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : ""; }

// ─── State Management ───────────────────────────────────────
function loadState() {
  const stored = localStorage.getItem(KEY);
  if (stored) { try { return migrateState(JSON.parse(stored)); } catch { localStorage.setItem(`${KEY}.corrupt.${Date.now()}`, stored); } }
  return migrateState({ settings: DEFAULT_SETTINGS, days: {}, backlog: [], leetcode: {}, aiMl: {}, collegeWork: {}, startup: {} });
}
function migrateState(input) {
  return {
    settings: { ...DEFAULT_SETTINGS, ...(input?.settings || {}) },
    days: input?.days || {},
    backlog: Array.isArray(input?.backlog) ? input.backlog : [],
    leetcode: input?.leetcode || {},
    aiMl: input?.aiMl || {},
    collegeWork: input?.collegeWork || {},
    startup: input?.startup || {},
    timerPause: input?.timerPause || { sessionId: null, pausedAt: null, totalPausedMs: {} },
    giftsDismissed: input?.giftsDismissed || [],
    disciplineLog: input?.disciplineLog || { score: 0, history: [] },
    weeklyReports: input?.weeklyReports || [],
    achievements: input?.achievements || []
  };
}
function saveState() { localStorage.setItem(KEY, JSON.stringify(state)); }
function saveAndRender() { cachedScore = null; cachedBadges = null; saveState(); render(); }
function isValidState(v) { return Boolean(v && v.settings && typeof v.settings.startDate === "string" && typeof v.days === "object" && Array.isArray(v.backlog)); }

// ─── Workshop Mode ──────────────────────────────────────────
function isWorkshopDay(dk) { const ws = state.settings.workshopMode; return ws && ws.startDate && ws.endDate && dk >= ws.startDate && dk <= ws.endDate; }
function isWorkshopActive() { return isWorkshopDay(logicalDayKey()); }

// ─── Day & Session Generation ───────────────────────────────
function ensureToday() {
  const today = logicalDayKey();
  generateMissingDays(today);
  rollForwardMissedDays(today);
  ensureDay(today);
  if (isSunday(today)) { carryOldSundayBacklog(today); autoGenerateWeeklyReport(today); }
  state.settings.lastOpenedDate = today;
  saveState();
}
function generateMissingDays(today) {
  const start = parseDate(state.settings.startDate), end = parseDate(today);
  if (end < start) return;
  const max = Math.min(GOAL_DAYS, Math.floor((end - start) / 86400000) + 1);
  for (let i = 0; i < max; i++) { const d = new Date(start); d.setDate(start.getDate() + i); ensureDay(toDateKey(d)); }
}
function ensureDay(dk) {
  if (state.days[dk]) return state.days[dk];
  const isWs = isWorkshopDay(dk);
  state.days[dk] = {
    date: dk, isHomeDay: false, collegeAttended: null,
    sessions: SCHEDULE.map(([type, title, st, en]) => ({ id: `${dk}-${type}`, type, title, startTime: st, endTime: en, status: isWs ? "workshop_override" : "pending", notes: "" }))
  };
  return state.days[dk];
}
function rollForwardMissedDays(today) {
  Object.values(state.days).forEach(day => {
    if (day.date >= today) return;
    day.sessions.forEach(s => {
      if (s.status === "pending" || s.status === "in_progress") { s.status = "missed"; createBacklogFromSession(day.date, s); }
    });
  });
}

// ─── Session Actions (Time-Locked) ──────────────────────────
function setSessionStatus(id, status) {
  const today = logicalDayKey(), day = ensureDay(today), session = day.sessions.find(s => s.id === id);
  if (!session) return;
  if (isWorkshopActive()) { showToast("Workshop mode active. Sessions paused.", "info"); return; }
  if (status === "completed") {
    if (!isWithinTimeWindow(session) && !isSessionPast(session)) { showToast(`⏰ ${session.title} hasn't started yet!`, "warning"); return; }
    if (isSessionPast(session) && session.status !== "in_progress") { showToast(`⏰ ${session.title} time passed. It's in backlog.`, "warning"); return; }
    if (session.type === "leetcode") return openLeetCodeDialog(session);
    if (session.type === "ai_ml") return openAiDialog(session);
    if (session.type === "college_work") state.collegeWork[day.date] = { completed: true, notes: "" };
  }
  if (status === "completed" || status === "missed") {
    finalizePauseBacklog(session);
  }
  session.status = status;
  if (session.type === "college_work" && status !== "completed") state.collegeWork[day.date] = { completed: false, notes: "" };
  if (status === "missed") createBacklogFromSession(day.date, session);
  if (session.type === "college" && status === "completed") showCollegeAttendanceDialog();
  saveAndRender();
}
function autoExpireSessions() {
  const today = logicalDayKey(), day = state.days[today];
  if (!day || isWorkshopActive()) return;
  let changed = false;
  day.sessions.forEach(s => {
    if ((s.status === "pending" || s.status === "in_progress") && isSessionPast(s)) {
      finalizePauseBacklog(s);
      s.status = "missed"; createBacklogFromSession(today, s);
      showToast(`⏰ ${s.title} expired → Backlog`, "warning"); changed = true;
    }
  });
  if (changed) saveAndRender();
}

// ─── Backlog Management ─────────────────────────────────────
function createBacklogFromSession(date, session) {
  if (state.backlog.some(i => i.sourceSessionId === session.id)) return;
  state.backlog.push({ id: `backlog-${session.id}`, sourceSessionId: session.id, sourceDate: date, title: session.title, type: session.type, status: "pending", recoverySunday: nextSunday(date), carryCount: 0, notes: "", completedAt: null });
}
function carryOldSundayBacklog(today) {
  state.backlog.forEach(i => { if (i.status !== "pending") return; while (i.recoverySunday < today) { i.recoverySunday = nextSunday(i.recoverySunday); i.carryCount += 1; } });
}
function canAccessBacklog() { const today = logicalDayKey(), day = state.days[today]; return isSunday(today) || (day && day.isHomeDay); }
function completeBacklog(id) {
  if (!canAccessBacklog()) { showToast("🔒 Backlog only on Sundays / Home Days", "warning"); return; }
  const item = state.backlog.find(b => b.id === id); if (!item) return;
  item.status = "completed"; item.completedAt = new Date().toISOString(); saveAndRender();
}
function moveBacklog(id) { const item = state.backlog.find(b => b.id === id); if (!item) return; item.recoverySunday = nextSunday(item.recoverySunday); item.carryCount += 1; saveAndRender(); }
function pendingBacklog() { return state.backlog.filter(i => i.status === "pending"); }
function filteredBacklog() {
  if (backlogFilter === "all") return [...state.backlog];
  if (backlogFilter === "completed") return state.backlog.filter(i => i.status === "completed");
  return pendingBacklog();
}
function backlogUrgency(item) { return item.carryCount >= 3 ? "high" : item.carryCount >= 1 ? "medium" : "low"; }

// ─── Core Stats ─────────────────────────────────────────────
function leetcodeStats() {
  const total = Object.values(state.leetcode).reduce((s, e) => s + Number(e.solved || 0), 0);
  const goal = Number(state.settings.leetcodeGoal || 500), remaining = Math.max(0, goal - total);
  const rd = Math.max(1, GOAL_DAYS - dayNumberFor(logicalDayKey()) + 1);
  return { total, goal, remaining, percent: goal ? Math.min(100, Math.round((total / goal) * 100)) : 0, dailyAverage: remaining / rd };
}
function aiStats() {
  const e = Object.values(state.aiMl);
  return { hours: e.reduce((s, x) => s + Number(x.hours || 0), 0), modules: e.reduce((s, x) => s + Number(x.modules || 0), 0), coursePercent: e.reduce((m, x) => Math.max(m, Number(x.coursePercent || 0)), 0), projects: e.filter(x => x.projectName).length };
}
function startupHours() { return Object.values(state.startup).reduce((s, e) => s + Number(e.hours || 0), 0); }
function collegeStreak() { let s = 0, c = logicalDayKey(); while (state.collegeWork[c]?.completed) { s++; c = addDays(c, -1); } return s; }
function allDaysStreak() {
  let s = 0, c = logicalDayKey();
  while (state.days[c]) {
    if (!state.days[c].sessions.every(x => x.status === "completed" || x.status === "workshop_override")) break;
    s++; c = addDays(c, -1);
  }
  return s;
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 1: GLOBAL DISCIPLINE SCORE
// ═══════════════════════════════════════════════════════════════
function calcGlobalScore() {
  if (cachedScore !== null) return cachedScore;
  let score = 0;
  const days = Object.values(state.days);

  // Session scoring
  days.forEach(day => {
    let allCompleted = true;
    day.sessions.forEach(s => {
      if (s.status === "completed") score += 10;
      else if (s.status === "missed") { score -= 15; allCompleted = false; }
      else if (s.status === "workshop_override") { /* neutral */ }
      else { allCompleted = false; }
    });
    // Daily bonus: all sessions completed
    if (allCompleted && day.sessions.length > 0 && day.sessions.every(s => s.status === "completed" || s.status === "workshop_override") && day.sessions.some(s => s.status === "completed")) {
      score += 25;
    }
  });

  // Backlog completion bonus
  state.backlog.forEach(b => { if (b.status === "completed") score += 20; });

  // Weekly bonus: only for fully-elapsed weeks where all 7 days exist and none missed.
  // A week is "fully elapsed" when its Sunday (last day) <= current logical day.
  const sortedDates = Object.keys(state.days).sort();
  const currentDay = logicalDayKey();
  if (sortedDates.length > 0) {
    let weekStart = sortedDates[0];
    const startDow = parseDate(weekStart).getDay();
    // Align to Monday
    const mondayOffset = startDow === 0 ? -6 : 1 - startDow;
    weekStart = addDays(weekStart, mondayOffset);

    let cursor = weekStart;
    while (true) {
      const weekSunday = addDays(cursor, 6);
      // Stop if this week's Sunday hasn't passed yet (still in progress)
      if (weekSunday > currentDay) break;

      let weekPerfect = true;
      let allSevenExist = true;
      for (let d = 0; d < 7; d++) {
        const dk = addDays(cursor, d);
        const day = state.days[dk];
        if (!day) { allSevenExist = false; weekPerfect = false; break; }
        if (day.sessions.some(s => s.status === "missed")) { weekPerfect = false; break; }
      }
      if (weekPerfect && allSevenExist) score += 100;
      cursor = addDays(cursor, 7);
    }
  }

  score = Math.max(0, score);
  cachedScore = score;
  state.disciplineLog.score = score;
  return score;
}

function getDisciplineLevel(score) {
  return DISCIPLINE_LEVELS.find(l => score >= l.min && score <= l.max) || DISCIPLINE_LEVELS[0];
}

function getScoreLevelProgress(score) {
  const level = getDisciplineLevel(score);
  const idx = DISCIPLINE_LEVELS.indexOf(level);
  const next = idx < DISCIPLINE_LEVELS.length - 1 ? DISCIPLINE_LEVELS[idx + 1] : null;
  const progress = next ? Math.min(100, ((score - level.min) / (next.min - level.min)) * 100) : 100;
  return { level, next, progress: Math.round(progress) };
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 3: FAILURE COST COUNTER
// ═══════════════════════════════════════════════════════════════
function calcFailureCost() {
  let missedSessions = 0, missedAiMl = 0, missedLeetcode = 0, missedCollegeWork = 0, missedOther = 0;
  Object.values(state.days).forEach(day => {
    day.sessions.forEach(s => {
      if (s.status !== "missed") return;
      missedSessions++;
      const hrs = sessionDurationMinutes(s) / 60;
      if (s.type === "ai_ml") missedAiMl += hrs;
      else if (s.type === "leetcode") missedLeetcode += hrs;
      else if (s.type === "college_work") missedCollegeWork += hrs;
      else missedOther += hrs;
    });
  });
  const backlogHrs = pendingBacklog().reduce((s, b) => {
    const sched = SCHEDULE.find(x => x[0] === b.type);
    if (!sched) return s;
    let st = minutesFromTime(sched[2]), en = minutesFromTime(sched[3]);
    if (en <= st) en += 1440;
    return s + (en - st) / 60;
  }, 0);
  const total = missedAiMl + missedLeetcode + missedCollegeWork + missedOther + backlogHrs;
  return { missedSessions, missedAiMl, missedLeetcode, missedCollegeWork, backlogHrs, total };
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 4: ACHIEVEMENT BADGES
// ═══════════════════════════════════════════════════════════════
function checkBadgeUnlocked(badge) {
  const streak = allDaysStreak();
  const lc = leetcodeStats();
  const ai = aiStats();
  const completedBacklog = state.backlog.filter(b => b.status === "completed").length;
  switch (badge.id) {
    case "streak_7":   return streak >= 7;
    case "streak_30":  return streak >= 30;
    case "streak_60":  return streak >= 60;
    case "streak_90":  return streak >= 90;
    case "streak_180": return streak >= 180;
    case "streak_365": return streak >= 365;
    case "lc_100":  return lc.total >= 100;
    case "lc_250":  return lc.total >= 250;
    case "lc_500":  return lc.total >= 500;
    case "ai_100":  return ai.hours >= 100;
    case "ai_250":  return ai.hours >= 250;
    case "ai_500":  return ai.hours >= 500;
    case "backlog_killer": return completedBacklog >= 20;
    case "perfect_week":  return hasAnyPerfectWeek();
    case "perfect_month": return hasAnyPerfectMonth();
    default: return false;
  }
}

function getUnlockedBadges() {
  if (cachedBadges !== null) return cachedBadges;
  cachedBadges = BADGES.filter(b => checkBadgeUnlocked(b));
  return cachedBadges;
}

function hasAnyPerfectWeek() {
  const dates = Object.keys(state.days).sort();
  for (let i = 0; i <= dates.length - 7; i++) {
    const start = dates[i];
    let perfect = true;
    for (let d = 0; d < 7; d++) {
      const dk = addDays(start, d);
      const day = state.days[dk];
      if (!day || day.sessions.some(s => s.status === "missed")) { perfect = false; break; }
      if (!day.sessions.every(s => s.status === "completed" || s.status === "workshop_override")) { perfect = false; break; }
    }
    if (perfect) return true;
  }
  return false;
}

function hasAnyPerfectMonth() {
  const dates = Object.keys(state.days).sort();
  for (let i = 0; i <= dates.length - 30; i++) {
    let perfect = true;
    for (let d = 0; d < 30; d++) {
      const dk = addDays(dates[i], d);
      const day = state.days[dk];
      if (!day || !day.sessions.every(s => s.status === "completed" || s.status === "workshop_override")) { perfect = false; break; }
    }
    if (perfect) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 5: EMERGENCY RECOVERY PLAN
// ═══════════════════════════════════════════════════════════════
function checkRecoveryNeeded() {
  const pending = pendingBacklog();
  const totalHrs = pending.reduce((s, b) => {
    const sched = SCHEDULE.find(x => x[0] === b.type);
    if (!sched) return s;
    let st = minutesFromTime(sched[2]), en = minutesFromTime(sched[3]);
    if (en <= st) en += 1440;
    return s + (en - st) / 60;
  }, 0);
  const needed = pending.length >= 10 || totalHrs >= 10;
  const level = getRecoveryLevel(totalHrs, pending.length);
  return { needed, level, items: pending, totalHrs, count: pending.length };
}

function getRecoveryLevel(hrs, count) {
  if (hrs > 20 || count > 20) return "critical";
  if (hrs > 10 || count > 10) return "high";
  if (hrs > 5 || count > 5) return "medium";
  return "low";
}

function generateRecoveryPlan(recovery) {
  const grouped = {};
  recovery.items.sort((a, b) => a.sourceDate.localeCompare(b.sourceDate) || b.carryCount - a.carryCount)
    .forEach(item => {
      if (!grouped[item.type]) grouped[item.type] = [];
      grouped[item.type].push(item);
    });

  const plan = [];
  const typeLabels = { ai_ml: "AI/ML Recovery", leetcode: "LeetCode Recovery", college_work: "College Work", morning: "Morning Routine", prayer: "Prayer", college: "College", dinner: "Dinner", walking: "Walking" };

  Object.entries(grouped).forEach(([type, items]) => {
    const sched = SCHEDULE.find(x => x[0] === type);
    let hrs = 0;
    if (sched) { let st = minutesFromTime(sched[2]), en = minutesFromTime(sched[3]); if (en <= st) en += 1440; hrs = items.length * (en - st) / 60; }
    plan.push({ type, label: typeLabels[type] || type, count: items.length, hours: hrs, day: type === "ai_ml" ? "Saturday" : "Sunday" });
  });

  const sundaysNeeded = Math.ceil(recovery.totalHrs / 8);
  return { plan, sundaysNeeded };
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 2: WEEKLY REALITY REPORT
// ═══════════════════════════════════════════════════════════════
function getWeekNumber(dk) {
  const start = parseDate(state.settings.startDate);
  const date = parseDate(dk);
  return Math.max(1, Math.ceil(((date - start) / 86400000 + 1) / 7));
}

function autoGenerateWeeklyReport(sundayKey) {
  const weekNum = getWeekNumber(sundayKey);
  if (state.weeklyReports.some(r => r.weekNumber === weekNum)) return;
  const weekEnd = sundayKey;
  const weekStart = addDays(weekEnd, -6);
  let planned = 0, completed = 0, missed = 0, bCreated = 0, bCleared = 0;
  let lcSolved = 0, aiHrs = 0, suHrs = 0;

  for (let d = 0; d < 7; d++) {
    const dk = addDays(weekStart, d);
    const day = state.days[dk];
    if (!day) continue;
    day.sessions.forEach(s => {
      if (s.status !== "workshop_override") planned++;
      if (s.status === "completed") completed++;
      if (s.status === "missed") missed++;
    });
    if (state.leetcode[dk]) lcSolved += Number(state.leetcode[dk].solved || 0);
    if (state.aiMl[dk]) aiHrs += Number(state.aiMl[dk].hours || 0);
    if (state.startup[dk]) suHrs += Number(state.startup[dk].hours || 0);
  }

  bCreated = state.backlog.filter(b => b.sourceDate >= weekStart && b.sourceDate <= weekEnd).length;
  bCleared = state.backlog.filter(b => b.status === "completed" && b.completedAt && b.completedAt.slice(0, 10) >= weekStart && b.completedAt.slice(0, 10) <= weekEnd).length;

  const score = calcGlobalScore();
  const prevReport = state.weeklyReports[state.weeklyReports.length - 1];
  const scoreChange = prevReport ? score - prevReport.scoreAtEnd : score;

  state.weeklyReports.push({
    weekNumber: weekNum, startDate: weekStart, endDate: weekEnd,
    sessionsPlanned: planned, sessionsCompleted: completed, sessionsMissed: missed,
    backlogCreated: bCreated, backlogCleared: bCleared,
    leetcodeSolved: lcSolved, aiMlHours: aiHrs, startupHours: suHrs,
    scoreChange, scoreAtEnd: score
  });
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 6: PDF REPORT EXPORT
// ═══════════════════════════════════════════════════════════════
function exportPDF(type) {
  const score = calcGlobalScore();
  const lvl = getDisciplineLevel(score);
  const lc = leetcodeStats();
  const ai = aiStats();
  const su = startupHours();
  const fail = calcFailureCost();
  const badges = getUnlockedBadges();
  const dn = dayNumberFor(logicalDayKey());
  const today = logicalDayKey();

  let title = "", dateRange = "";
  if (type === "monthly") {
    const m = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
    title = `Monthly Report — ${m}`; dateRange = m;
  } else if (type === "quarterly") {
    title = "Quarterly Report"; dateRange = "Last 90 Days";
  } else {
    title = "365-Day Complete Report"; dateRange = `${formatDate(state.settings.startDate)} — ${formatDate(today)}`;
  }

  const totalSessions = Object.values(state.days).reduce((s, d) => s + d.sessions.length, 0);
  const completedSessions = Object.values(state.days).reduce((s, d) => s + d.sessions.filter(x => x.status === "completed").length, 0);
  const missedSessions = fail.missedSessions;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:'Segoe UI',sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#111;line-height:1.6}
h1{text-align:center;font-size:24px;border-bottom:3px solid #06b6d4;padding-bottom:10px}
h2{color:#06b6d4;font-size:18px;margin-top:30px;border-bottom:1px solid #ddd;padding-bottom:6px}
.meta{text-align:center;color:#666;margin-bottom:30px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
.stat{border:1px solid #ddd;border-radius:8px;padding:12px;text-align:center}
.stat strong{display:block;font-size:24px;color:#111}
.stat span{font-size:12px;color:#666}
.badge-row{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.badge{padding:4px 10px;border:1px solid #ddd;border-radius:20px;font-size:12px}
table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{text-align:left;padding:8px;border-bottom:1px solid #eee}
th{background:#f8f8f8;font-weight:600}
.footer{text-align:center;color:#999;font-size:11px;margin-top:40px;padding-top:20px;border-top:1px solid #eee}
</style></head><body>
<h1>📊 Project365 — ${title}</h1>
<div class="meta">${dateRange} • Day ${dn} / ${GOAL_DAYS}</div>

<h2>🏆 Discipline Score</h2>
<div class="grid">
<div class="stat"><strong>${score}</strong><span>Total Score</span></div>
<div class="stat"><strong>${lvl.emoji} ${lvl.name}</strong><span>Current Level</span></div>
</div>

<h2>📋 Sessions</h2>
<div class="grid">
<div class="stat"><strong>${totalSessions}</strong><span>Total Planned</span></div>
<div class="stat"><strong>${completedSessions}</strong><span>Completed</span></div>
<div class="stat"><strong>${missedSessions}</strong><span>Missed</span></div>
<div class="stat"><strong>${Math.round(completedSessions / Math.max(1, totalSessions) * 100)}%</strong><span>Completion Rate</span></div>
</div>

<h2>💻 LeetCode</h2>
<div class="grid">
<div class="stat"><strong>${lc.total}</strong><span>Solved</span></div>
<div class="stat"><strong>${lc.goal}</strong><span>Goal</span></div>
</div>

<h2>🤖 AI/ML</h2>
<div class="grid">
<div class="stat"><strong>${ai.hours.toFixed(1)}h</strong><span>Total Hours</span></div>
<div class="stat"><strong>${ai.modules}</strong><span>Modules</span></div>
</div>

<h2>💀 Failure Cost</h2>
<table>
<tr><th>Category</th><th>Hours Lost</th></tr>
<tr><td>AI/ML</td><td>${fail.missedAiMl.toFixed(1)}h</td></tr>
<tr><td>LeetCode</td><td>${fail.missedLeetcode.toFixed(1)}h</td></tr>
<tr><td>College Work</td><td>${fail.missedCollegeWork.toFixed(1)}h</td></tr>
<tr><td>Backlog Pending</td><td>${fail.backlogHrs.toFixed(1)}h</td></tr>
<tr><td><strong>Total</strong></td><td><strong>${fail.total.toFixed(1)}h</strong></td></tr>
</table>

<h2>🏅 Achievements (${badges.length}/${BADGES.length})</h2>
<div class="badge-row">${badges.length ? badges.map(b => `<span class="badge">${b.emoji} ${b.name}</span>`).join("") : "<em>No badges unlocked yet</em>"}</div>

<div class="footer">Generated by Project365 • ${new Date().toLocaleString()}</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  else showToast("Please allow popups to export PDF", "warning");
}

// ─── Hours Tracking ─────────────────────────────────────────
function getHoursData() {
  return SCHEDULE.map(([type, title, st, en]) => {
    let s = minutesFromTime(st), e = minutesFromTime(en); if (e <= s) e += 1440;
    const sH = (e - s) / 60, tH = sH * GOAL_DAYS;
    let cc = 0, bc = 0;
    Object.values(state.days).forEach(d => { const x = d.sessions.find(ss => ss.type === type); if (x && x.status === "completed") cc++; });
    bc = state.backlog.filter(b => b.type === type && b.status === "pending").length;
    return { type, title, sessionHours: sH, totalHours: tH, completedHours: cc * sH, backlogHours: bc * sH, remainingHours: tH - cc * sH, percent: tH ? Math.round((cc * sH / tH) * 100) : 0 };
  });
}

// ─── Gift System ────────────────────────────────────────────
function getTodayGift() { const dn = dayNumberFor(logicalDayKey()); return MILESTONES[dn] || GIFTS[(dn - 1) % GIFTS.length]; }
function isGiftDismissed() { return state.giftsDismissed.includes(logicalDayKey()); }
function dismissGift() { const t = logicalDayKey(); if (!state.giftsDismissed.includes(t)) { state.giftsDismissed.push(t); saveState(); } giftDismissedToday = true; render(); }

// ─── Notification System ────────────────────────────────────
function requestNotificationPermission() { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); }
function sendNotification(title, body) {
  showToast(`${title}: ${body}`, "info");
  if ("Notification" in window && Notification.permission === "granted" && state.settings.notificationsEnabled) {
    try { new Notification(title, { body, icon: "./icon.svg", vibrate: [200, 100, 200] }); } catch {}
  }
}
function checkNotifications() {
  if (!state.settings.notificationsEnabled) return;
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes(), today = logicalDayKey(), day = state.days[today];
  if (!day || isWorkshopActive()) return;
  if (nm === DAY_START_HOUR * 60) sendNotification("🌅 Good Morning!", `Day ${dayNumberFor(today)}/${GOAL_DAYS} has started!`);
  day.sessions.forEach(s => {
    const sm = minutesFromTime(s.startTime), key = `${today}-${s.type}-start`;
    if (nm === sm && lastNotifiedSession !== key && s.status === "pending") {
      sendNotification(`⏰ ${s.title}`, `Started! ${Math.round(sessionDurationMinutes(s) / 60 * 10) / 10} hours.`);
      lastNotifiedSession = key;
    }
    let em = minutesFromTime(s.endTime); if (em <= sm) em += 1440;
    let an = nm; if (an < sm && em > 1440) an += 1440;
    const wk = `${today}-${s.type}-warn`;
    if (an === em - 5 && lastNotifiedSession !== wk && (s.status === "pending" || s.status === "in_progress")) {
      sendNotification(`⚠️ ${s.title}`, "5 minutes left! Submit now!"); lastNotifiedSession = wk;
    }
  });
}

// ─── Toast System ───────────────────────────────────────────
function showToast(msg, type = "info") {
  const c = $("toastContainer"); if (!c) return;
  const t = document.createElement("div"); t.className = `toast ${type}`; t.textContent = msg;
  c.appendChild(t); setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, 4000);
}

// ─── College Attendance ─────────────────────────────────────
function showCollegeAttendanceDialog() { $("collegeDialog").showModal(); }

// ─── Dialogs ────────────────────────────────────────────────
function openEntryDialog(title, fields, onSave, ctx = null) {
  pendingDialogSave = { onSave, context: ctx };
  $("entryTitle").textContent = title;
  $("entryFields").innerHTML = fields.map(([n, l, t, v]) => {
    if (t === "textarea") return `<div class="field"><label for="${n}">${l}</label><textarea id="${n}" name="${n}">${escapeHtml(v)}</textarea></div>`;
    if (t === "select") return `<div class="field"><label for="${n}">${l}</label><select id="${n}" name="${n}"><option value="no">No</option><option value="yes">Yes</option></select></div>`;
    return `<div class="field"><label for="${n}">${l}</label><input id="${n}" name="${n}" type="${t}" value="${escapeHtml(v)}" inputmode="${t === 'number' ? 'decimal' : 'text'}"></div>`;
  }).join("");
  $("entryDialog").showModal();
}
function openLeetCodeDialog(session = null) {
  openEntryDialog("LeetCode", [["solved", "Problems Solved", "number", "0"], ["notes", "Notes", "textarea", ""]], (v, c) => {
    const k = logicalDayKey(), ex = state.leetcode[k] || { solved: 0, notes: "" };
    state.leetcode[k] = { solved: Number(ex.solved || 0) + Number(v.solved || 0), notes: v.notes || ex.notes || "" };
    if (c?.sessionId) markSessionCompleted(c.sessionId); saveAndRender();
  }, session ? { sessionId: session.id } : null);
}
function openAiDialog(session = null) {
  openEntryDialog("AI/ML", [["hours", "Hours", "number", "2"], ["modules", "Modules", "number", "0"], ["coursePercent", "Course %", "number", ""], ["projectName", "Project", "text", ""], ["skills", "Skills", "text", ""]], (v, c) => {
    const k = logicalDayKey(), ex = state.aiMl[k] || {};
    state.aiMl[k] = { phase: state.settings.aiPhase, hours: Number(ex.hours || 0) + Number(v.hours || 0), modules: Number(ex.modules || 0) + Number(v.modules || 0), coursePercent: v.coursePercent === "" ? Number(ex.coursePercent || 0) : Number(v.coursePercent || 0), projectName: v.projectName || ex.projectName || "", skills: v.skills || ex.skills || "" };
    if (c?.sessionId) markSessionCompleted(c.sessionId); saveAndRender();
  }, session ? { sessionId: session.id } : null);
}
function openStartupDialog() {
  openEntryDialog("Startup", [["hours", "Hours", "number", "1"], ["meeting", "Meeting", "select", "no"], ["notes", "Notes", "textarea", ""]], (v) => {
    const k = logicalDayKey(), ex = state.startup[k] || { hours: 0, meeting: false, notes: "" };
    state.startup[k] = { hours: Number(ex.hours || 0) + Number(v.hours || 0), meeting: v.meeting === "yes", notes: v.notes || ex.notes || "" };
    saveAndRender();
  });
}
function markSessionCompleted(sid) { const s = ensureDay(logicalDayKey()).sessions.find(x => x.id === sid); if (s) s.status = "completed"; }

// ─── Settings ───────────────────────────────────────────────
function saveSettings() {
  state.settings.startDate = $("settingStartDate").value || state.settings.startDate;
  state.settings.leetcodeGoal = Number($("settingLcGoal").value || 500);
  state.settings.aiPhase = $("settingAiPhase").value;
  state.settings.logicalDayCutoffHour = Number($("settingCutoff").value || 1);
  state.settings.notificationsEnabled = $("settingNotifications").checked;
  const wsN = $("settingWsName").value.trim(), wsS = $("settingWsStart").value, wsE = $("settingWsEnd").value;
  state.settings.workshopMode = wsN && wsS && wsE ? { name: wsN, startDate: wsS, endDate: wsE } : null;
  showToast("✅ Settings saved!", "success"); saveAndRender();
}
function exportData() {
  state.settings.lastBackupAt = new Date().toISOString(); saveState();
  const b = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const l = document.createElement("a"); l.href = URL.createObjectURL(b); l.download = `project365-backup-${todayKey()}.json`; l.click(); URL.revokeObjectURL(l.href);
  showToast("📦 Backup downloaded!", "success");
}
function importData() {
  if (!confirm("Import will replace all data. Export first!\n\nContinue?")) return;
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "application/json";
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { try { const im = migrateState(JSON.parse(r.result)); if (!isValidState(im)) throw 0; state = im; showToast("✅ Imported!", "success"); saveAndRender(); } catch { alert("Invalid backup file."); } };
    r.readAsText(f); }; inp.click();
}
function resetAllData() {
  if (!confirm("⚠️ DELETE ALL data permanently?")) return; if (!confirm("Last chance! Continue?")) return;
  localStorage.removeItem(KEY); state = loadState(); showToast("🗑️ Data reset.", "warning"); saveAndRender();
}

// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════
function render() {
  ensureToday();
  const today = logicalDayKey();
  if (today < state.settings.startDate) { renderCountdown(state.settings.startDate, today); return; }
  const day = ensureDay(today), dn = dayNumberFor(today);
  $("dayLabel").textContent = `DAY ${dn} / ${GOAL_DAYS}  •  ${formatDate(today)}`;
  $("screenTitle").textContent = screenTitle(activeScreen);
  $("topbarRight").innerHTML = `<button id="homeDayToggle" class="status ${day.isHomeDay ? 'completed' : 'pending'}" type="button" onclick="toggleHomeDay()" style="cursor:pointer;min-height:32px;font-size:11px;">${day.isHomeDay ? '🏠 HOME' : '🏫 COLLEGE'}</button>`;
  renderDashboard(day, dn); renderBacklog(); renderHours(); renderCalendar(); renderSettings();
}
function renderCountdown(sd, td) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $("dashboardScreen").classList.add("active");
  $("dayLabel").textContent = "PROJECT365"; $("screenTitle").textContent = "Countdown"; $("topbarRight").innerHTML = "";
  $("dashboardScreen").innerHTML = `<div class="countdown-screen"><div class="countdown-days">${daysBetween(td, sd)}</div><div class="countdown-label">days until your journey begins</div><p class="muted">Starting ${formatDate(sd)}</p><div style="font-size:64px;margin-top:20px;">🚀</div></div>`;
}
function screenTitle(s) { return { dashboard: "Today", backlog: "Backlog", hours: "Hours", calendar: "Calendar", settings: "Settings" }[s] || "Dashboard"; }

// ─── Dashboard ──────────────────────────────────────────────
function renderDashboard(day, dn) {
  // BUG 1 FIX: Separate truly-active session from next-upcoming session
  const active = findActiveSession(day);  // null if nothing is in its time window
  const nextUp = active ? null : findNextUpSession(day); // only computed if no active
  const pending = pendingBacklog(), lc = leetcodeStats(), ai = aiStats();
  const score = calcGlobalScore(), lp = getScoreLevelProgress(score), streak = allDaysStreak(), fail = calcFailureCost();
  let html = "";

  // Workshop banner
  if (isWorkshopActive()) { const ws = state.settings.workshopMode; html += `<div class="workshop-banner">🏫 Workshop: ${escapeHtml(ws.name)} (${formatDate(ws.startDate)} — ${formatDate(ws.endDate)})</div>`; }

  // Gift
  if (!isGiftDismissed() && !isWorkshopActive()) {
    const gift = getTodayGift();
    html += `<div class="gift-card"><button class="gift-dismiss" type="button" onclick="dismissGift()">✕</button><span class="gift-emoji">${gift.emoji}</span><div class="gift-text">${escapeHtml(gift.text)}</div><div class="muted" style="margin-top:8px;font-size:11px;">Day ${dn} Gift</div></div>`;
  }

  // Timers
  const dayRem = secondsRemainingInDay(), dayProg = dayProgressPercent();
  const R = 52, C = 2 * Math.PI * R;

  // Session timer ring — only for genuinely active (in time window) sessions
  let sesRingHtml = "";
  if (active) {
    const sesRem = secondsRemainingInSession(active), sesTotal = sessionDurationMinutes(active) * 60;
    const sesProg = Math.max(0, ((sesTotal - sesRem) / sesTotal) * 100);
    const sesUrg = sesRem < sesTotal * 0.25 ? "urgent" : sesRem < sesTotal * 0.5 ? "warning" : "safe";
    const strokeColor = sesUrg === 'urgent' ? 'red' : sesUrg === 'warning' ? 'amber' : 'green';
    sesRingHtml = `<div class="timer-ring"><svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="${R}"></circle><circle class="progress" cx="60" cy="60" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - sesProg / 100)}" style="stroke:var(--accent-${strokeColor})"></circle></svg><div class="timer-inner"><div class="timer-digits" id="sessionTimer">${formatTimer(sesRem)}</div><div class="timer-label">${escapeHtml(active.title)}</div></div></div>`;
  }

  // BUG 2 FIX: Label says "Until 1:00 AM" instead of vague "Day Left"
  html += `<div class="timer-container">
    <div class="timer-ring"><svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="${R}"></circle><circle class="progress" cx="60" cy="60" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - dayProg / 100)}" style="stroke:var(--accent-cyan)"></circle></svg><div class="timer-inner"><div class="timer-digits" id="masterTimer">${formatTimer(dayRem)}</div><div class="timer-label">${dayEndLabel()}</div></div></div>
    ${sesRingHtml}
  </div>`;

  // FEATURE 1: Score Hero Card
  html += `<div class="score-hero">
    <div class="level-badge ${lp.level.css}">${lp.level.emoji} ${lp.level.name}</div>
    <div class="score-value">${score}</div>
    <div class="score-progress"><div class="progress-bar"><span style="width:${lp.progress}%"></span></div>
    <div class="score-next">${lp.next ? `Next: ${lp.next.emoji} ${lp.next.name} (${lp.next.min})` : '🏆 MAX LEVEL!'}</div></div>
  </div>`;

  // Active session card (genuinely in its time window)
  if (active && !isWorkshopActive()) {
    const sesRem = secondsRemainingInSession(active);
    const sesTotal = sessionDurationMinutes(active) * 60;
    const sesUrg = sesRem < sesTotal * 0.25 ? "urgent" : sesRem < sesTotal * 0.5 ? "warning" : "safe";
    const canSubmit = isWithinTimeWindow(active) || active.status === "in_progress";
    
    const paused = isSessionPaused(active.id);
    const canPause = active.status === 'in_progress';
    const pauseBtnHtml = `<button type="button" class="secondary" onclick="${paused ? `resumeSession('${active.id}')` : `pauseSession('${active.id}')`}" ${!canPause ? 'disabled' : ''}>${paused ? '▶ Resume' : '⏸ Pause'}</button>`;

    html += `<article class="panel current"><div><p class="eyebrow">Current Session</p><h2>${escapeHtml(active.title)}</h2><p class="muted" style="color:#cbd5e1">${active.startTime} — ${active.endTime} • ${label(active.status)}</p></div>
    <div class="session-timer ${sesUrg} ${paused ? 'paused' : ''}"><span class="muted" style="color:var(--text-secondary)">Time Left</span><span class="timer-digits" id="sessionTimerBar">${formatTimer(sesRem)}</span></div>
    <div class="actions three"><button type="button" onclick="setSessionStatus('${active.id}','in_progress')" ${active.status !== 'pending' ? 'disabled' : ''}>▶ Start</button>${pauseBtnHtml}<button type="button" onclick="setSessionStatus('${active.id}','completed')" ${!canSubmit ? 'disabled' : ''}>✓ Done</button></div>
    <button type="button" class="danger" onclick="setSessionStatus('${active.id}','missed')" style="width:100%;margin-top:8px;">✕ Miss</button></article>`;
  }

  // BUG 1 FIX: "Next Up" card — distinct from active session
  if (!active && nextUp && !isWorkshopActive()) {
    const startsIn = secondsUntilSessionStart(nextUp);
    html += `<article class="panel"><div><p class="eyebrow">⏳ Next Up</p><h2>${escapeHtml(nextUp.title)}</h2><p class="muted" style="color:#cbd5e1">Starts at ${nextUp.startTime} — ${nextUp.endTime}</p></div>
    <div class="session-timer safe" style="border-color:var(--accent-purple);"><span class="muted" style="color:var(--text-secondary)">Starts In</span><span class="timer-digits" id="nextUpTimer" style="color:var(--accent-purple)">${formatTimer(startsIn)}</span></div></article>`;
  }

  // Quick stats
  html += `<div class="metric-grid">
    <div class="metric"><strong>${streak}🔥</strong><span class="metric-label">Day Streak</span></div>
    <div class="metric"><strong>${pending.length}</strong><span class="metric-label">Backlog Items</span></div>
    <div class="metric"><strong>${lc.total}/${lc.goal}</strong><span class="metric-label">LeetCode</span></div>
    <div class="metric"><strong>${ai.hours.toFixed(1)}h</strong><span class="metric-label">AI/ML Hours</span></div>
  </div>`;

  // FEATURE 3: Failure Cost Card
  if (fail.missedSessions > 0) {
    html += `<div class="failure-card"><h2>💀 Failure Cost</h2><div class="failure-stats">
      <div class="failure-stat"><span>${fail.missedSessions} sessions missed</span><span class="fail-value">${fail.missedSessions}</span></div>
      ${fail.missedAiMl > 0 ? `<div class="failure-stat"><span>AI/ML hours lost</span><span class="fail-value">${fail.missedAiMl.toFixed(1)}h</span></div>` : ""}
      ${fail.missedLeetcode > 0 ? `<div class="failure-stat"><span>LeetCode hours lost</span><span class="fail-value">${fail.missedLeetcode.toFixed(1)}h</span></div>` : ""}
      ${fail.missedCollegeWork > 0 ? `<div class="failure-stat"><span>College Work hours lost</span><span class="fail-value">${fail.missedCollegeWork.toFixed(1)}h</span></div>` : ""}
      ${fail.backlogHrs > 0 ? `<div class="failure-stat"><span>Backlog hours waiting</span><span class="fail-value">${fail.backlogHrs.toFixed(1)}h</span></div>` : ""}
    </div><div class="failure-total"><span>TOTAL TIME WASTED</span><span class="fail-value">${fail.total.toFixed(1)}h</span></div></div>`;
  }

  // Today's schedule
  html += `<article class="panel"><h2>Today's Schedule</h2><div class="session-list">`;
  const sorted = [...day.sessions];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const pe = minutesFromTime(sorted[i - 1].endTime), cs = minutesFromTime(sorted[i].startTime);
      if (cs > pe) { const g = cs - pe; html += `<div class="free-time-row">☕ Free Time • ${Math.floor(g / 60) > 0 ? Math.floor(g / 60) + 'h ' : ''}${g % 60 > 0 ? g % 60 + 'm' : ''}</div>`; }
    }
    html += renderSessionRow(sorted[i]);
  }
  html += `</div></article>`;

  // Quick Entry
  html += `<article class="panel"><h2>Quick Entry</h2><div class="actions three">
    <button type="button" onclick="openLeetCodeDialog()">💻 LC</button>
    <button type="button" onclick="openAiDialog()">🤖 AI/ML</button>
    <button type="button" onclick="openStartupDialog()">🚀 Startup</button>
  </div></article>`;

  html += renderDailyReview(day);
  $("dashboardScreen").innerHTML = html;
}

// BUG 1 FIX: Only return a session that is genuinely within its time window.
// Returns null if no session is currently active — caller uses findNextUpSession() separately.
function findActiveSession(day) {
  return day.sessions.find(s => isWithinTimeWindow(s) && s.status !== "completed" && s.status !== "missed" && s.status !== "workshop_override") || null;
}
// Find the next future pending session (for "Next Up" display)
function findNextUpSession(day) {
  return day.sessions.find(s => isSessionFuture(s) && (s.status === "pending" || s.status === "in_progress")) || null;
}
function renderSessionRow(s) {
  const ia = isWithinTimeWindow(s), cd = ia || s.status === "in_progress";
  return `<div class="session-row" style="${ia ? 'border-color:var(--accent-cyan);box-shadow:var(--glow-cyan)' : ''}">
    <div><span class="session-title">${escapeHtml(s.title)}</span><div class="session-meta">${s.startTime} — ${s.endTime}</div></div>
    <div class="session-actions"><span class="status ${s.status}">${label(s.status)}</span>
    ${s.status === "pending" || s.status === "in_progress" ? `<button type="button" onclick="setSessionStatus('${s.id}','completed')" ${!cd ? 'disabled' : ''} style="min-height:32px;font-size:11px;padding:0 8px;">✓</button><button type="button" class="secondary" onclick="setSessionStatus('${s.id}','missed')" style="min-height:32px;font-size:11px;padding:0 8px;">✕</button>` : ""}
    </div></div>`;
}
function renderDailyReview(day) {
  const c = day.sessions.filter(s => s.status === "completed").map(s => s.title);
  const m = day.sessions.filter(s => s.status === "missed").map(s => s.title);
  const p = day.sessions.filter(s => s.status === "pending" || s.status === "in_progress").map(s => s.title);
  let h = `<article class="panel"><h2>📝 Daily Review</h2><div class="review-section">`;
  if (c.length) h += `<div class="review-item good">✅ Completed: ${c.join(", ")}</div>`;
  if (m.length) h += `<div class="review-item attention">❌ Missed → Backlog: ${m.join(", ")}</div>`;
  if (p.length) h += `<div class="review-item tomorrow">⏳ Pending: ${p.join(", ")}</div>`;
  h += `<div class="review-item tomorrow">📋 Tomorrow: ${SCHEDULE.map(s => s[1]).join(", ")}</div></div></article>`;
  return h;
}

// ─── Backlog Screen ─────────────────────────────────────────
function renderBacklog() {
  const items = filteredBacklog().sort((a, b) => a.status !== b.status ? (a.status === "pending" ? -1 : 1) : a.recoverySunday.localeCompare(b.recoverySunday));
  const canAccess = canAccessBacklog(), today = logicalDayKey();
  let html = "";

  // FEATURE 5: Recovery Plan
  const recovery = checkRecoveryNeeded();
  if (recovery.needed) {
    const plan = generateRecoveryPlan(recovery);
    html += `<div class="recovery-card risk-${recovery.level}">
      <div class="recovery-header"><h2>⚠️ Recovery Required</h2><span class="risk-badge ${recovery.level}">${recovery.level.toUpperCase()}</span></div>
      <p class="muted" style="margin:0 0 12px;">${recovery.count} items • ${recovery.totalHrs.toFixed(1)} hours pending</p>
      <div style="margin-bottom:8px;"><strong style="font-size:13px;">📅 Suggested Plan:</strong></div>
      ${plan.plan.map(p => `<div class="recovery-plan-item"><span>${p.label} (${p.count} items)</span><span><span class="plan-day">${p.day}</span> • ${p.hours.toFixed(1)}h</span></div>`).join("")}
      <p class="muted" style="margin:10px 0 0;font-size:12px;">Est. recovery: ~${plan.sundaysNeeded} Sunday${plan.sundaysNeeded > 1 ? 's' : ''}</p>
    </div>`;
  }

  html += `<article class="panel"><h2>${isSunday(today) ? "☀️ Sunday Recovery" : "📦 Backlog"}</h2>
    <div class="segmented">${filterBtn("pending", `Pending (${pendingBacklog().length})`)}${filterBtn("completed", "Done")}${filterBtn("all", "All")}</div>`;

  if (!canAccess && backlogFilter === "pending") {
    html += `<div class="backlog-locked-msg"><span class="lock-icon">🔒</span><p>Backlog only on <strong>Sundays</strong> / <strong>Home Days</strong></p><p class="muted">${pendingBacklog().length} items waiting</p></div>`;
  } else {
    html += `<div class="backlog-list">`;
    if (items.length) items.forEach(i => { html += renderBacklogRow(i, canAccess); });
    else html += `<p class="muted text-center" style="padding:20px;">No ${backlogFilter} backlog 🎉</p>`;
    html += `</div>`;
  }
  html += `</article>`;
  $("backlogScreen").innerHTML = html;
}
function filterBtn(f, t) { return `<button type="button" class="${backlogFilter === f ? '' : 'secondary'}" onclick="setBacklogFilter('${f}')">${t}</button>`; }
function renderBacklogRow(item, canAccess) {
  const done = item.status === "completed", urg = backlogUrgency(item);
  return `<div class="backlog-row urgent-${urg}"><div class="backlog-top"><div><strong>${escapeHtml(item.title)}</strong>${item.isPauseBacklog ? '<span class="pause-tag">⏸ Paused time</span>' : ''}<div class="session-meta">${formatDate(item.sourceDate)} → Sun ${formatDate(item.recoverySunday)}${item.carryCount > 0 ? ` • Carried ${item.carryCount}x` : ""}</div></div><span class="status ${done ? 'completed' : 'pending'}">${done ? 'Done' : urg === 'high' ? '🔴 Critical' : 'Pending'}</span></div>
  ${done ? `<div class="session-meta">Completed ${formatDateTime(item.completedAt)}</div>` : canAccess ? `<div class="backlog-actions"><button type="button" onclick="completeBacklog('${item.id}')">✓ Done</button><button type="button" class="secondary" onclick="moveBacklog('${item.id}')">→ Next Sun</button></div>` : ""}</div>`;
}

// ─── Hours Screen ───────────────────────────────────────────
function renderHours() {
  const data = getHoursData(), tAll = data.reduce((s, d) => s + d.totalHours, 0), cAll = data.reduce((s, d) => s + d.completedHours, 0);
  let html = `<article class="panel"><h2>📊 Total Hours</h2>
    <div class="metric-grid"><div class="metric"><strong>${tAll.toFixed(0)}h</strong><span class="metric-label">Total (365 days)</span></div><div class="metric"><strong>${cAll.toFixed(1)}h</strong><span class="metric-label">Completed</span></div></div>
    <div class="progress-bar" style="margin-top:12px;"><span style="width:${tAll ? (cAll / tAll * 100) : 0}%"></span></div></article>
    <div class="hours-grid">`;
  data.forEach(d => {
    html += `<div class="hours-card"><div class="hours-title">${escapeHtml(d.title)}</div>
      <div class="hours-numbers"><div><div class="hours-value">${d.completedHours.toFixed(1)}</div><div class="hours-label">Done</div></div><div><div class="hours-value" style="color:var(--accent-amber)">${d.backlogHours.toFixed(1)}</div><div class="hours-label">Backlog</div></div><div><div class="hours-value" style="color:var(--text-muted)">${d.remainingHours.toFixed(0)}</div><div class="hours-label">Remaining</div></div></div>
      <div class="hours-bar"><span style="width:${d.percent}%"></span></div>
      <div class="muted" style="font-size:11px;">${d.sessionHours.toFixed(1)}h/day × 365 = ${d.totalHours.toFixed(0)}h</div></div>`;
  });
  html += `</div>`;

  // FEATURE 2: Weekly Reports
  if (state.weeklyReports.length > 0) {
    html += `<article class="panel"><h2>📋 Weekly Reports</h2><div class="session-list">`;
    [...state.weeklyReports].reverse().slice(0, 10).forEach(r => {
      const scClass = r.scoreChange >= 0 ? "positive" : "negative";
      html += `<div class="report-card"><div class="report-header"><h3>Week ${r.weekNumber}</h3><span class="report-score-change ${scClass}">${r.scoreChange >= 0 ? '+' : ''}${r.scoreChange}</span></div>
        <div class="session-meta" style="margin-bottom:8px;">${formatDate(r.startDate)} — ${formatDate(r.endDate)}</div>
        <div class="report-stats">
          <div class="report-stat">Sessions: <strong>${r.sessionsCompleted}/${r.sessionsPlanned}</strong></div>
          <div class="report-stat">Missed: <strong>${r.sessionsMissed}</strong></div>
          <div class="report-stat">LC Solved: <strong>${r.leetcodeSolved}</strong></div>
          <div class="report-stat">AI/ML: <strong>${r.aiMlHours.toFixed(1)}h</strong></div>
          <div class="report-stat">Backlog +${r.backlogCreated} / -${r.backlogCleared}</div>
          <div class="report-stat">Score: <strong>${r.scoreAtEnd}</strong></div>
        </div></div>`;
    });
    html += `</div></article>`;
  }

  $("hoursScreen").innerHTML = html;
}

// ─── Calendar Screen ────────────────────────────────────────
function renderCalendar() {
  const today = logicalDayKey();
  const mNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const first = new Date(calendarYear, calendarMonth, 1), last = new Date(calendarYear, calendarMonth + 1, 0);
  const sDow = first.getDay(), dim = last.getDate();

  let html = `<article class="panel"><div class="calendar-nav"><button type="button" class="secondary" onclick="changeCalMonth(-1)">◀</button><span class="cal-month">${mNames[calendarMonth]} ${calendarYear}</span><button type="button" class="secondary" onclick="changeCalMonth(1)">▶</button></div>
    <div class="calendar-grid">${dNames.map(d => `<div class="calendar-header">${d}</div>`).join("")}`;

  for (let i = 0; i < sDow; i++) html += `<div class="calendar-day other-month"></div>`;

  for (let d = 1; d <= dim; d++) {
    const dk = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isT = dk === today, day = state.days[dk];
    const dBl = state.backlog.filter(b => b.sourceDate === dk);
    const hasP = dBl.some(b => b.status === "pending"), hasD = dBl.some(b => b.status === "completed");
    const isSel = calendarSelectedDay === dk;

    // Heatmap: completion level
    let heatClass = "no-data";
    if (day) {
      const comp = day.sessions.filter(s => s.status === "completed").length;
      if (comp === 0) heatClass = "heat-0";
      else if (comp <= 3) heatClass = "heat-1";
      else if (comp <= 6) heatClass = "heat-2";
      else heatClass = "heat-3";
    }
    if (hasP) heatClass = "has-backlog";
    else if (hasD && !day) heatClass = "backlog-done";

    let cls = `calendar-day ${heatClass}`;
    if (isT) cls += " today";
    if (isSel) cls += " today";

    html += `<div class="${cls}" onclick="selectCalDay('${dk}')"><span class="day-num">${d}</span>${hasP ? '<span class="day-dot"></span>' : ""}</div>`;
  }
  html += `</div></article>`;

  if (calendarSelectedDay) {
    const sb = state.backlog.filter(b => b.sourceDate === calendarSelectedDay), sd = state.days[calendarSelectedDay];
    html += `<div class="calendar-day-detail"><h2 style="margin:0 0 8px;font-size:15px;">${formatDate(calendarSelectedDay)}</h2>`;
    if (sd) { const c = sd.sessions.filter(s => s.status === "completed").length, m = sd.sessions.filter(s => s.status === "missed").length; html += `<p class="muted">Sessions: ${c} done, ${m} missed, ${sd.sessions.length} total</p>`; }
    if (sb.length) { html += `<div style="margin-top:8px;">`; sb.forEach(b => { html += `<div class="session-meta" style="padding:4px 0;">• ${escapeHtml(b.title)} — <span class="status ${b.status}" style="font-size:10px;">${b.status}</span></div>`; }); html += `</div>`; }
    else html += `<p class="muted" style="margin-top:8px;">No backlog for this day</p>`;
    html += `</div>`;
  }

  // Monthly summary
  const mp = state.backlog.filter(b => b.sourceDate.startsWith(`${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}`) && b.status === "pending").length;
  const md = state.backlog.filter(b => b.sourceDate.startsWith(`${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}`) && b.status === "completed").length;
  html += `<article class="panel"><h2>📅 Month Summary</h2><div class="metric-grid"><div class="metric"><strong>${mp}</strong><span class="metric-label">Pending Backlog</span></div><div class="metric"><strong>${md}</strong><span class="metric-label">Cleared</span></div></div></article>`;

  // FEATURE 4: Achievement Badges
  const unlocked = getUnlockedBadges();
  html += `<article class="panel"><h2>🏅 Achievements (${unlocked.length}/${BADGES.length})</h2><div class="badge-grid">`;
  BADGES.forEach(b => {
    const isUnlocked = unlocked.some(u => u.id === b.id);
    html += `<div class="badge-card ${isUnlocked ? 'unlocked' : 'locked'}"><span class="badge-emoji">${isUnlocked ? b.emoji : '🔒'}</span><span class="badge-name">${b.name}</span></div>`;
  });
  html += `</div></article>`;

  $("calendarScreen").innerHTML = html;
}

// ─── Settings Screen ────────────────────────────────────────
function renderSettings() {
  const ws = state.settings.workshopMode || {}, lb = state.settings.lastBackupAt;
  const dsb = lb ? Math.floor((Date.now() - new Date(lb).getTime()) / 86400000) : null;
  $("settingsScreen").innerHTML = `<div class="settings-list">
    <div class="setting-row"><strong>📅 Start Date</strong><input id="settingStartDate" type="date" value="${state.settings.startDate}"></div>
    <div class="setting-row"><strong>💻 LeetCode Goal</strong><input id="settingLcGoal" type="number" inputmode="numeric" value="${state.settings.leetcodeGoal}"></div>
    <div class="setting-row"><strong>🤖 AI/ML Phase</strong><select id="settingAiPhase"><option value="learning" ${state.settings.aiPhase === "learning" ? "selected" : ""}>Learning</option><option value="implementation" ${state.settings.aiPhase === "implementation" ? "selected" : ""}>Implementation</option></select></div>
    <div class="setting-row"><strong>🌙 Day Ends At</strong><select id="settingCutoff"><option value="0" ${Number(state.settings.logicalDayCutoffHour) === 0 ? "selected" : ""}>Midnight</option><option value="1" ${Number(state.settings.logicalDayCutoffHour) === 1 ? "selected" : ""}>01:00 AM</option><option value="2" ${Number(state.settings.logicalDayCutoffHour) === 2 ? "selected" : ""}>02:00 AM</option></select></div>
    <div class="setting-row"><strong>🔔 Notifications</strong><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input id="settingNotifications" type="checkbox" ${state.settings.notificationsEnabled ? "checked" : ""} style="width:20px;height:20px;"><span class="muted">Enable session reminders</span></label></div>
    <div class="setting-row" style="border-left:3px solid var(--accent-purple);"><strong>🏫 Workshop Mode</strong><p class="muted" style="margin:0;">Pause during workshops/events</p><input id="settingWsName" type="text" placeholder="Workshop name" value="${escapeHtml(ws.name || "")}"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><input id="settingWsStart" type="date" value="${ws.startDate || ""}"><input id="settingWsEnd" type="date" value="${ws.endDate || ""}"></div></div>
    <div class="setting-row"><button type="button" onclick="saveSettings()" style="width:100%;">💾 Save Settings</button></div>

    <div class="setting-row" style="border-left:3px solid var(--accent-cyan);"><strong>📊 Export Reports</strong><p class="muted" style="margin:0;">Generate PDF reports</p>
      <div class="actions three"><button type="button" class="secondary" onclick="exportPDF('monthly')">Monthly</button><button type="button" class="secondary" onclick="exportPDF('quarterly')">Quarterly</button><button type="button" class="secondary" onclick="exportPDF('yearly')">Full Year</button></div></div>

    <div class="setting-row"><strong>💾 Backup</strong><span class="muted">Last: ${lb ? formatDateTime(lb) : "Never"}${dsb !== null && dsb > 7 ? ` ⚠️ ${dsb} days ago!` : ""}</span>
      <div class="actions"><button type="button" onclick="exportData()">📥 Export</button><button type="button" class="secondary" onclick="importData()">📤 Import</button></div></div>
    <div class="setting-row"><button type="button" class="danger" onclick="resetAllData()" style="width:100%;">🗑️ Reset All Data</button></div>
  </div>`;
}

// ─── Utility ────────────────────────────────────────────────
function label(s) { return { pending: "Pending", in_progress: "In Progress", completed: "Done", missed: "Missed", workshop_override: "Workshop" }[s] || s; }
function escapeHtml(v) { return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

// ─── Timer Tick ─────────────────────────────────────────────
function startTimers() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const me = $("masterTimer"); if (me) me.textContent = formatTimer(secondsRemainingInDay());
    const today = logicalDayKey(), day = state.days[today];
    if (day) {
      // BUG 1 FIX: Only update session timer for genuinely active sessions
      const a = findActiveSession(day);
      if (a) {
        if (!isSessionPaused(a.id)) {
          const r = secondsRemainingInSession(a);
          const se = $("sessionTimer"); if (se) se.textContent = formatTimer(r);
          const be = $("sessionTimerBar"); if (be) be.textContent = formatTimer(r);
        }
      }
      // Update "Next Up" countdown separately
      if (!a) {
        const nu = findNextUpSession(day);
        if (nu) { const nt = $("nextUpTimer"); if (nt) nt.textContent = formatTimer(secondsUntilSessionStart(nu)); }
      }
    }
    if (Date.now() % 10000 < 1100) autoExpireSessions();
  }, 1000);
}
function startNotificationChecker() { if (notificationCheckInterval) clearInterval(notificationCheckInterval); notificationCheckInterval = setInterval(checkNotifications, 30000); }

// ─── Event Handlers ─────────────────────────────────────────
function toggleHomeDay() {
  const day = ensureDay(logicalDayKey()); day.isHomeDay = !day.isHomeDay;
  if (day.isHomeDay) { day.collegeAttended = false; showToast("🏠 Home Day! Backlog unlocked!", "success"); }
  else showToast("🏫 College Day. Backlog locked.", "info");
  saveAndRender();
}
function setBacklogFilter(f) { backlogFilter = f; render(); }
function changeCalMonth(d) { calendarMonth += d; if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; } if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; } calendarSelectedDay = null; render(); }
function selectCalDay(dk) { calendarSelectedDay = calendarSelectedDay === dk ? null : dk; render(); }

// ─── Navigation ─────────────────────────────────────────────
document.querySelectorAll(".nav-button").forEach(b => {
  b.addEventListener("click", () => {
    activeScreen = b.dataset.screen;
    document.querySelectorAll(".nav-button").forEach(x => x.classList.toggle("active", x === b));
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    $(`${activeScreen}Screen`).classList.add("active"); render();
  });
});

// ─── Dialog Handlers ────────────────────────────────────────
$("entryForm").addEventListener("submit", (e) => {
  if (e.submitter?.value !== "save" || !pendingDialogSave) { pendingDialogSave = null; return; }
  const fd = new FormData(e.currentTarget), sv = pendingDialogSave; pendingDialogSave = null;
  sv.onSave(Object.fromEntries(fd.entries()), sv.context);
});
$("collegeForm").addEventListener("submit", (e) => {
  const today = logicalDayKey(), day = ensureDay(today);
  if (e.submitter?.value === "yes") { day.collegeAttended = true; day.isHomeDay = false; showToast("🎓 Attendance recorded!", "success"); }
  else { day.collegeAttended = false; day.isHomeDay = true; showToast("🏠 Home Day. Backlog unlocked!", "success"); }
  saveAndRender();
});

// ─── Service Worker ─────────────────────────────────────────
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});

// ─── Initialization Entry Point ─────────────────────────────
// appInit() is the single named entry point that boots the app.
// It is defined here (after all functions are declared) so that
// window.appInit can be safely exported and called externally.
function appInit() {
  requestNotificationPermission();
  startTimers();
  startNotificationChecker();
  render();
}

// ─── Global Exports ─────────────────────────────────────────
window.setSessionStatus = setSessionStatus;
window.completeBacklog = completeBacklog;
window.moveBacklog = moveBacklog;
window.openLeetCodeDialog = openLeetCodeDialog;
window.openAiDialog = openAiDialog;
window.pauseSession = pauseSession;
window.resumeSession = resumeSession;
window.openStartupDialog = openStartupDialog;
window.saveSettings = saveSettings;
window.exportData = exportData;
window.importData = importData;
window.resetAllData = resetAllData;
window.setBacklogFilter = setBacklogFilter;
window.toggleHomeDay = toggleHomeDay;
window.dismissGift = dismissGift;
window.changeCalMonth = changeCalMonth;
window.selectCalDay = selectCalDay;
window.exportPDF = exportPDF;
window.appInit = appInit;

// ─── Boot ───────────────────────────────────────────────────
appInit();
