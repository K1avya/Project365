"use client";

import React, { useEffect, useState, useTransition, useMemo } from "react";
import type { TaskInstanceResponseDTO } from "../dtos/task.dto";
import type { CapacityRemainingResponseDto } from "../dtos/capacity.dto";
import type { LifeAreaResponseDTO } from "../dtos/life-area.dto";
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Plus,
  X,
  LogOut,
  AlertTriangle,
  Play,
  Pause,
  CheckCircle2,
  Lock,
  Clock,
  Flame,
  Award,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Shield,
  FileText,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

// ─── Constants & Reference Config ────────────────────────────
const GOAL_DAYS = 365;
const KEY = "project365.single_user.v1";

type AutoProfileRule = {
  id: string;
  name: string;
  profile: string; // 'regular', 'exam', 'hackathon', 'placement', 'vacation'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  priority: number;
};

const DEFAULT_SETTINGS = {
  startDate: "2026-06-16",
  leetcodeGoal: 500,
  aiPhase: "learning",
  aiLearningMonths: 6,
  logicalDayCutoffHour: 1,
  lastBackupAt: null as string | null,
  lastOpenedDate: null as string | null,
  notificationsEnabled: true,
  workshopMode: null as { name: string; startDate: string; endDate: string } | null,
  activeProfile: "regular", // Default manual profile
  autoProfiles: [] as AutoProfileRule[],
  overrideProfile: null as string | null,
  overrideExpiresAt: null as string | null, // Date key e.g. "2026-09-20"
  auditLogs: [] as { timestamp: string; event: string; source: string; profile: string; rule?: string }[],
  sleepHours: 8,
};

const BASE_SCHEDULE: [string, string, string, string][] = [
  ["morning", "Morning Routine", "06:00", "07:00"],
  ["prayer", "Breakfast + Prayer", "07:00", "07:20"],
  ["college", "College", "09:00", "15:00"],
  ["college_work", "College Work", "18:00", "20:30"],
  ["dinner", "Dinner", "20:30", "21:00"],
  ["walking", "Walking", "21:00", "21:30"],
  ["ai_ml", "AI/ML", "21:30", "23:30"],
  ["leetcode", "LeetCode", "23:30", "01:00"],
];

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
  { emoji: "🎆", text: "You are a firework. Ignite and shine." },
];

const MILESTONES: Record<number, { emoji: string; text: string }> = {
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
  365: { emoji: "👑", text: "DAY 365! YOU DID IT! 👑🎆🏆 A FULL YEAR OF DISCIPLINE. YOU ARE A LEGEND!" },
};

const DISCIPLINE_LEVELS = [
  { min: 0, max: 199, name: "Beginner", emoji: "🌱", css: "beginner" },
  { min: 200, max: 499, name: "Consistent", emoji: "📈", css: "consistent" },
  { min: 500, max: 999, name: "Disciplined", emoji: "💪", css: "disciplined" },
  { min: 1000, max: 1999, name: "Iron Discipline", emoji: "🛡️", css: "iron" },
  { min: 2000, max: 99999, name: "Elite Execution", emoji: "👑", css: "elite" },
];

const BADGES = [
  { id: "streak_7", emoji: "🔥", name: "7 Day Streak", cat: "Streak" },
  { id: "streak_30", emoji: "💪", name: "30 Day Streak", cat: "Streak" },
  { id: "streak_60", emoji: "⚡", name: "60 Day Streak", cat: "Streak" },
  { id: "streak_90", emoji: "🛡️", name: "90 Day Streak", cat: "Streak" },
  { id: "streak_180", emoji: "💎", name: "180 Day Streak", cat: "Streak" },
  { id: "streak_365", emoji: "👑", name: "365 Day Streak", cat: "Streak" },
  { id: "lc_100", emoji: "💻", name: "100 LeetCode", cat: "LeetCode" },
  { id: "lc_250", emoji: "🧠", name: "250 LeetCode", cat: "LeetCode" },
  { id: "lc_500", emoji: "🏆", name: "500 LeetCode", cat: "LeetCode" },
  { id: "ai_100", emoji: "🤖", name: "100 AI/ML Hrs", cat: "AI/ML" },
  { id: "ai_250", emoji: "🔬", name: "250 AI/ML Hrs", cat: "AI/ML" },
  { id: "ai_500", emoji: "🎓", name: "500 AI/ML Hrs", cat: "AI/ML" },
  { id: "backlog_killer", emoji: "⚔️", name: "Backlog Killer", cat: "Special" },
  { id: "perfect_week", emoji: "🌟", name: "Perfect Week", cat: "Special" },
  { id: "perfect_month", emoji: "🏛️", name: "Perfect Month", cat: "Special" },
];

// Helper Date Functions
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKey(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDaysKey(dk: string, n: number): string {
  const d = parseDateKey(dk);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

function getLogicalDayKey(cutoffHour: number = 1): string {
  const now = new Date();
  if (now.getHours() < cutoffHour) {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return toDateKey(prev);
  }
  return toDateKey(now);
}

function minutesFromTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTimerSeconds(ts: number): string {
  const safeTs = Math.max(0, Math.floor(ts));
  const h = Math.floor(safeTs / 3600);
  const m = Math.floor((safeTs % 3600) / 60);
  const s = safeTs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDisplayDate(key: string): string {
  try {
    return parseDateKey(key).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return key;
  }
}

// ─── Interfaces ──────────────────────────────────────────────
interface SessionItem {
  id: string;
  type: string;
  title: string;
  startTime: string;
  endTime: string;
  status: "pending" | "in_progress" | "completed" | "missed" | "workshop_override";
  notes?: string;
  dbInstanceId?: string;
}

interface BacklogItem {
  id: string;
  sourceSessionId: string;
  sourceDate: string;
  title: string;
  type: string;
  status: "pending" | "completed";
  recoverySunday: string;
  carryCount: number;
  notes?: string;
  completedAt?: string | null;
  isPauseBacklog?: boolean;
  pausedMinutes?: number;
  blockedBy?: string[];
}

interface CommitmentItem {
  id: string;
  title: string;
  type: string;
  startMinute: number;
  endMinute: number;
  durationMinutes: number;
}

// ─── Main Component ──────────────────────────────────────────
export default function Project365LifeOS() {
  // Navigation & Core State
  const [activeTab, setActiveTab] = useState<"today" | "backlog" | "hours" | "calendar" | "settings">("today");
  const [nowMs, setNowMs] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Client-Persistent State
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [days, setDays] = useState<Record<string, { date: string; isHomeDay: boolean; collegeAttended: boolean | null; sessions: SessionItem[] }>>({});
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [leetcodeLogs, setLeetcodeLogs] = useState<Record<string, { solved: number; notes: string }>>({});
  const [aiMlLogs, setAiMlLogs] = useState<Record<string, { hours: number; modules: number; coursePercent: number; projectName: string; skills: string }>>({});
  const [startupLogs, setStartupLogs] = useState<Record<string, { hours: number; meeting: boolean; notes: string }>>({});
  const [collegeWorkLogs, setCollegeWorkLogs] = useState<Record<string, { completed: boolean; notes: string }>>({});
  const [giftsDismissed, setGiftsDismissed] = useState<string[]>([]);
  const [timerPause, setTimerPause] = useState<{ sessionId: string | null; pausedAt: number | null; totalPausedMs: Record<string, number> }>({
    sessionId: null,
    pausedAt: null,
    totalPausedMs: {},
  });
  const [backlogFilter, setBacklogFilter] = useState<"pending" | "completed" | "all">("pending");

  // Calendar Screen State
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarSelectedDay, setCalendarSelectedDay] = useState<string | null>(null);

  // Server Integration State
  const [capacity, setCapacity] = useState<CapacityRemainingResponseDto | null>(null);
  const [serverInstances, setServerInstances] = useState<TaskInstanceResponseDTO[]>([]);
  const [serverCommitments, setServerCommitments] = useState<CommitmentItem[]>([]);
  const [lifeAreas, setLifeAreas] = useState<LifeAreaResponseDTO[]>([]);

  // Dialogs State
  const [activeDialog, setActiveDialog] = useState<"leetcode" | "aiml" | "startup" | "addTask" | "collegeAttendance" | "addBacklog" | null>(null);
  const [targetSessionForDialog, setTargetSessionForDialog] = useState<SessionItem | null>(null);

  // Form states for modals
  const [lcSolved, setLcSolved] = useState("1");
  const [lcNotes, setLcNotes] = useState("");
  const [aiHours, setAiHours] = useState("2");
  const [aiModules, setAiModules] = useState("0");
  const [aiPercent, setAiPercent] = useState("");
  const [aiProject, setAiProject] = useState("");
  const [aiSkills, setAiSkills] = useState("");
  const [suHours, setSuHours] = useState("1");
  const [suMeeting, setSuMeeting] = useState("no");
  const [suNotes, setSuNotes] = useState("");

  // Add Custom Task Modal State
  const [newTitle, setNewTitle] = useState("");
  const [newAreaId, setNewAreaId] = useState("");
  const [newDuration, setNewDuration] = useState(45);
  const [newPriority, setNewPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [newEnergy, setNewEnergy] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [newIsDeepWork, setNewIsDeepWork] = useState(false);
  const [forceOverride, setForceOverride] = useState(false);

  // Add Backlog Item Modal State
  const [newBacklogTitle, setNewBacklogTitle] = useState("");
  const [newBacklogType, setNewBacklogType] = useState("startup");
  const [newBacklogDesc, setNewBacklogDesc] = useState("");
  const [newBacklogDeps, setNewBacklogDeps] = useState<string[]>([]);

  // Settings form states
  const [settingsStartDate, setSettingsStartDate] = useState(DEFAULT_SETTINGS.startDate);
  const [settingsLcGoal, setSettingsLcGoal] = useState(DEFAULT_SETTINGS.leetcodeGoal);
  const [settingsAiPhase, setSettingsAiPhase] = useState(DEFAULT_SETTINGS.aiPhase);
  const [settingsCutoff, setSettingsCutoff] = useState(DEFAULT_SETTINGS.logicalDayCutoffHour);
  const [settingsNotifs, setSettingsNotifs] = useState(DEFAULT_SETTINGS.notificationsEnabled);
  const [settingsWsName, setSettingsWsName] = useState("");
  const [settingsWsStart, setSettingsWsStart] = useState("");
  const [settingsWsEnd, setSettingsWsEnd] = useState("");

  // Live Timer Tick (every second)
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Initial LocalStorage State
  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.settings) {
          setSettings(parsed.settings);
          setSettingsStartDate(parsed.settings.startDate || DEFAULT_SETTINGS.startDate);
          setSettingsLcGoal(parsed.settings.leetcodeGoal || 500);
          setSettingsAiPhase(parsed.settings.aiPhase || "learning");
          setSettingsCutoff(parsed.settings.logicalDayCutoffHour ?? 1);
          setSettingsNotifs(parsed.settings.notificationsEnabled ?? true);
          if (parsed.settings.workshopMode) {
            setSettingsWsName(parsed.settings.workshopMode.name || "");
            setSettingsWsStart(parsed.settings.workshopMode.startDate || "");
            setSettingsWsEnd(parsed.settings.workshopMode.endDate || "");
          }
        }
        if (parsed.days) setDays(parsed.days);
        if (Array.isArray(parsed.backlog)) setBacklog(parsed.backlog);
        if (parsed.leetcode) setLeetcodeLogs(parsed.leetcode);
        if (parsed.aiMl) setAiMlLogs(parsed.aiMl);
        if (parsed.startup) setStartupLogs(parsed.startup);
        if (parsed.collegeWork) setCollegeWorkLogs(parsed.collegeWork);
        if (Array.isArray(parsed.giftsDismissed)) setGiftsDismissed(parsed.giftsDismissed);
        if (parsed.timerPause) setTimerPause(parsed.timerPause);
      }
    } catch (e) {
      console.error("Failed to load local state", e);
    }
  }, []);

  // Save LocalStorage State helper
  function persistClientState(
    newDays = days,
    newBacklog = backlog,
    newSettings = settings,
    newGifts = giftsDismissed,
    newTimerPause = timerPause,
    newLc = leetcodeLogs,
    newAi = aiMlLogs,
    newSu = startupLogs,
    newCw = collegeWorkLogs
  ) {
    try {
      const payload = {
        settings: newSettings,
        days: newDays,
        backlog: newBacklog,
        giftsDismissed: newGifts,
        timerPause: newTimerPause,
        leetcode: newLc,
        aiMl: newAi,
        startup: newSu,
        collegeWork: newCw,
      };
      localStorage.setItem(KEY, JSON.stringify(payload));
    } catch (e) {
      console.error("Failed to persist state", e);
    }
  }

  // Current Logical Day Key
  const todayKey = getLogicalDayKey(settings.logicalDayCutoffHour);

  // Profile Resolution Logic
  const currentProfileState = useMemo(() => {
    // 1. Manual Override Check
    if (settings.overrideProfile && settings.overrideExpiresAt) {
      if (todayKey <= settings.overrideExpiresAt) {
        return {
          profile: settings.overrideProfile,
          source: "MANUAL",
          ruleName: "Manual Override (Expires tomorrow)"
        };
      }
    }

    // 2. Auto Rules Check
    if (settings.autoProfiles && settings.autoProfiles.length > 0) {
      const activeRules = settings.autoProfiles.filter(r => 
        r.startDate <= todayKey && r.endDate >= todayKey
      );
      if (activeRules.length > 0) {
        activeRules.sort((a, b) => b.priority - a.priority); // Highest first
        const winner = activeRules[0];
        return {
          profile: winner.profile,
          source: "AUTO_RULE",
          ruleName: `${winner.name} (${formatDisplayDate(winner.startDate)} - ${formatDisplayDate(winner.endDate)})`
        };
      }
    }

    // 3. Fallback Default
    return {
      profile: settings.activeProfile || "regular",
      source: "DEFAULT",
      ruleName: "Default Settings"
    };
  }, [settings.overrideProfile, settings.overrideExpiresAt, settings.autoProfiles, settings.activeProfile, todayKey]);

  const currentProfile = currentProfileState.profile;

  // Audit Tracker for automatic changes
  useEffect(() => {
    // Only track AUTO_RULE and DEFAULT. MANUAL is logged exactly when clicked.
    if (currentProfileState.source === "MANUAL") return;
    
    const lastLog = settings.auditLogs?.[0];
    // Avoid double-logging if the same rule is already the last log
    if (!lastLog || lastLog.rule !== currentProfileState.ruleName) {
      const newLog = {
        timestamp: new Date().toISOString(),
        event: "PROFILE_ACTIVATED",
        source: currentProfileState.source,
        profile: currentProfileState.profile,
        rule: currentProfileState.ruleName
      };
      const updated = { 
        ...settings, 
        auditLogs: [newLog, ...(settings.auditLogs || [])].slice(0, 50) 
      };
      setSettings(updated);
      persistClientState(days, backlog, updated);
    }
  }, [currentProfileState.ruleName, currentProfileState.source, currentProfileState.profile, settings]);

  // Day Number computation
  function getDayNumber(key: string): number {
    const s = parseDateKey(settings.startDate);
    const c = parseDateKey(key);
    return Math.max(1, Math.min(GOAL_DAYS, Math.floor((c.getTime() - s.getTime()) / 86400000) + 1));
  }

  const currentDayNumber = getDayNumber(todayKey);

  // Check Workshop Mode
  const isWorkshopActive = useMemo(() => {
    const ws = settings.workshopMode;
    return !!(ws && ws.startDate && ws.endDate && todayKey >= ws.startDate && todayKey <= ws.endDate);
  }, [settings.workshopMode, todayKey]);

  // Ensure current day exists in state
  useEffect(() => {
    setDays((prev) => {
      if (prev[todayKey]) return prev;
      const newDay = {
        date: todayKey,
        isHomeDay: false,
        collegeAttended: null,
        sessions: BASE_SCHEDULE.map(([type, title, st, en]) => ({
          id: `${todayKey}-${type}`,
          type,
          title,
          startTime: st,
          endTime: en,
          status: (isWorkshopActive ? "workshop_override" : "pending") as SessionItem["status"],
          notes: "",
        })),
      };
      const updated = { ...prev, [todayKey]: newDay };
      persistClientState(updated);
      return updated;
    });
  }, [todayKey, isWorkshopActive]);

  const currentDay = days[todayKey] || {
    date: todayKey,
    isHomeDay: false,
    collegeAttended: null,
    sessions: BASE_SCHEDULE.map(([type, title, st, en]) => ({
      id: `${todayKey}-${type}`,
      type,
      title,
      startTime: st,
      endTime: en,
      status: (isWorkshopActive ? "workshop_override" : "pending") as SessionItem["status"],
    })),
  };

  // Fetch Server Data (Auth, Capacity, DB Task Instances)
  async function loadServerData() {
    try {
      setLoading(true);
      setErrorMsg(null);

      const [capRes, instRes, commRes, areasRes] = await Promise.all([
        fetch("/api/capacity/remaining"),
        fetch("/api/task-instances/today"),
        fetch("/api/commitments"),
        fetch("/api/life-areas"),
      ]);

      if (
        capRes.status === 401 ||
        instRes.status === 401 ||
        commRes.status === 401 ||
        areasRes.status === 401
      ) {
        window.location.href = "/auth/signin";
        return;
      }

      if (capRes.ok) setCapacity(await capRes.json());
      if (instRes.ok) setServerInstances(await instRes.json());
      if (commRes.ok) setServerCommitments(await commRes.json());
      if (areasRes.ok) {
        const a = await areasRes.json();
        setLifeAreas(a);
        if (a.length > 0 && !newAreaId) setNewAreaId(a[0].id);
      }
    } catch (e: any) {
      console.warn("Server sync notice:", e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadServerData();
  }, []);

  // ─── Time Calculations ──────────────────────────────────────
  // Seconds Remaining in Day (6:00 AM -> 1:00 AM window = 19h = 68400s)
  function secondsRemainingInDay(): number {
    const now = new Date(nowMs);
    const ns = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const cutoff = settings.logicalDayCutoffHour ?? 1;
    const es = cutoff * 3600;
    if (now.getHours() >= 6) return 86400 - ns + es;
    if (now.getHours() < cutoff) return es - ns;
    return 0;
  }

  const dayTotalWindowSec = (24 - 6 + (settings.logicalDayCutoffHour ?? 1)) * 3600;
  const dayRemSec = secondsRemainingInDay();
  const dayProgressPct = Math.max(0, Math.min(100, ((dayTotalWindowSec - dayRemSec) / dayTotalWindowSec) * 100));

  // Determine Active vs Next Up session
  function isWithinTimeWindow(s: SessionItem): boolean {
    const now = new Date(nowMs);
    const nm = now.getHours() * 60 + now.getMinutes();
    let sm = minutesFromTime(s.startTime);
    let em = minutesFromTime(s.endTime);
    if (em <= sm) em += 1440;
    let an = nm;
    if (an < sm && em > 1440) an += 1440;
    return an >= sm && an < em;
  }

  function isSessionFuture(s: SessionItem): boolean {
    const now = new Date(nowMs);
    const nm = now.getHours() * 60 + now.getMinutes();
    const sm = minutesFromTime(s.startTime);
    return sm > nm;
  }

  function secondsRemainingInSession(s: SessionItem): number {
    const now = new Date(nowMs);
    const ns = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    let ss = minutesFromTime(s.startTime) * 60;
    let es = minutesFromTime(s.endTime) * 60;
    if (es <= ss) es += 86400;
    let an = ns;
    if (an < ss && es > 86400) an += 86400;
    const pausedMs = timerPause.totalPausedMs[s.id] || 0;
    const pausedSec = Math.floor(pausedMs / 1000);
    return Math.max(0, es - an + pausedSec);
  }

  function secondsUntilSessionStart(s: SessionItem): number {
    const now = new Date(nowMs);
    const ns = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    let ss = minutesFromTime(s.startTime) * 60;
    if (ss <= ns) ss += 86400;
    return Math.max(0, ss - ns);
  }

  const activeSession = currentDay.sessions.find(
    (s) => isWithinTimeWindow(s) && s.status !== "completed" && s.status !== "missed" && s.status !== "workshop_override"
  );

  const nextUpSession = !activeSession
    ? currentDay.sessions.find((s) => isSessionFuture(s) && (s.status === "pending" || s.status === "in_progress"))
    : null;

  const isSessionPaused = (sid: string) => timerPause.sessionId === sid && timerPause.pausedAt !== null;

  // ─── Global Discipline Score Calculation ─────────────────────
  const disciplineScore = useMemo(() => {
    let score = 0;
    const allDays = Object.values(days);
    allDays.forEach((d) => {
      let allDone = true;
      d.sessions.forEach((s) => {
        if (s.status === "completed") score += 10;
        else if (s.status === "missed") {
          score -= 15;
          allDone = false;
        } else if (s.status === "workshop_override") {
          /* neutral */
        } else {
          allDone = false;
        }
      });
      if (allDone && d.sessions.length > 0 && d.sessions.some((s) => s.status === "completed")) {
        score += 25;
      }
    });

    backlog.forEach((b) => {
      if (b.status === "completed") score += 20;
    });

    return Math.max(0, score);
  }, [days, backlog]);

  const currentLevel =
    DISCIPLINE_LEVELS.find((l) => disciplineScore >= l.min && disciplineScore <= l.max) || DISCIPLINE_LEVELS[0];
  const nextLevelIdx = DISCIPLINE_LEVELS.indexOf(currentLevel);
  const nextLevel = nextLevelIdx < DISCIPLINE_LEVELS.length - 1 ? DISCIPLINE_LEVELS[nextLevelIdx + 1] : null;
  const levelProgressPct = nextLevel
    ? Math.min(100, Math.round(((disciplineScore - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100))
    : 100;

  // ─── Stats & Aggregates ──────────────────────────────────────
  const pendingBacklogList = useMemo(() => {
    const list = backlog.filter((b) => b.status === "pending");
    const profile = currentProfile;
    
    // Configurable profile weights
    const PROFILE_WEIGHTS: Record<string, Record<string, number>> = {
      regular: {},
      exam: { college: 50 },
      hackathon: { startup: 50, aiml: 50 },
      placement: { leetcode: 50, career: 40 },
      vacation: { health: 60, family: 40 }
    };
    
    const currentWeights = PROFILE_WEIGHTS[profile] || {};
    
    // Sort by calculated score descending
    list.sort((a, b) => {
      const getScore = (item: typeof a) => {
        let score = 0;
        
        // 1. Profile Alignment Score
        score += currentWeights[item.type] || 0;
        
        // 2. Deadline Score (Overdue)
        const isOverdue = item.sourceDate < todayKey;
        if (isOverdue) score += 50; // Late task bump
        else if (item.sourceDate === todayKey) score += 20; // Due today bump
        
        // 3. Age / Carry-Forward Score
        score += (item.carryCount || 0) * 10;
        
        // 4. Dependency Score
        const isBlocked = item.blockedBy && item.blockedBy.some((depId) => {
          const dep = backlog.find(b => b.id === depId);
          return dep && dep.status !== "completed";
        });
        
        if (isBlocked) {
          score -= 50; // Blocked penalty
        } else {
          // Calculate recursive descendants unlocked
          const visited = new Set<string>();
          let descendantsCount = 0;
          const queue = [item.id];
          
          while (queue.length > 0) {
            const currId = queue.shift()!;
            const children = list.filter(other => 
              other.blockedBy?.includes(currId) && 
              other.status !== "completed" && 
              !visited.has(other.id)
            );
            
            for (const child of children) {
              visited.add(child.id);
              descendantsCount++;
              queue.push(child.id);
            }
          }
          
          score += Math.min(150, descendantsCount * 15);
        }
        
        return score;
      };
      
      return getScore(b) - getScore(a); // Descending
    });
    
    return list;
  }, [backlog, currentProfile, todayKey]);

  const totalLcSolved = useMemo(() => {
    return Object.values(leetcodeLogs).reduce((s, e) => s + Number(e.solved || 0), 0);
  }, [leetcodeLogs]);

  const totalAiHours = useMemo(() => {
    return Object.values(aiMlLogs).reduce((s, e) => s + Number(e.hours || 0), 0);
  }, [aiMlLogs]);

  const dayStreak = useMemo(() => {
    let s = 0;
    let c = todayKey;
    while (days[c]) {
      const daySessions = days[c].sessions;
      if (!daySessions.every((x) => x.status === "completed" || x.status === "workshop_override")) break;
      s++;
      c = addDaysKey(c, -1);
    }
    return s;
  }, [days, todayKey]);

  // Failure Cost
  const failureCost = useMemo(() => {
    let missedSessions = 0;
    let missedAiMl = 0;
    let missedLeetcode = 0;
    let missedCollegeWork = 0;
    let missedOther = 0;

    Object.values(days).forEach((d) => {
      d.sessions.forEach((s) => {
        if (s.status !== "missed") return;
        missedSessions++;
        const st = minutesFromTime(s.startTime);
        let et = minutesFromTime(s.endTime);
        if (et <= st) et += 1440;
        const durHrs = (et - st) / 60;
        if (s.type === "ai_ml") missedAiMl += durHrs;
        else if (s.type === "leetcode") missedLeetcode += durHrs;
        else if (s.type === "college_work") missedCollegeWork += durHrs;
        else missedOther += durHrs;
      });
    });

    const pendingBacklogHrs = pendingBacklogList.reduce((acc, b) => {
      const base = BASE_SCHEDULE.find((x) => x[0] === b.type);
      if (!base) return acc + 1.5;
      const st = minutesFromTime(base[2]);
      let et = minutesFromTime(base[3]);
      if (et <= st) et += 1440;
      return acc + (et - st) / 60;
    }, 0);

    const totalLost = missedAiMl + missedLeetcode + missedCollegeWork + missedOther + pendingBacklogHrs;
    return { missedSessions, missedAiMl, missedLeetcode, missedCollegeWork, pendingBacklogHrs, totalLost };
  }, [days, pendingBacklogList]);

  // ─── Session Status Change Handlers ──────────────────────────
  function handleSessionAction(sessionId: string, newStatus: "in_progress" | "completed" | "missed") {
    const session = currentDay.sessions.find((s) => s.id === sessionId);
    if (!session) return;

    if (isWorkshopActive) {
      setErrorMsg("Workshop mode active. Sessions are paused.");
      return;
    }

    if (newStatus === "completed") {
      if (session.type === "leetcode") {
        setTargetSessionForDialog(session);
        setActiveDialog("leetcode");
        return;
      }
      if (session.type === "ai_ml") {
        setTargetSessionForDialog(session);
        setActiveDialog("aiml");
        return;
      }
      if (session.type === "college") {
        setActiveDialog("collegeAttendance");
      }
    }

    applySessionStatus(sessionId, newStatus);
  }

  function applySessionStatus(sessionId: string, newStatus: SessionItem["status"], notes: string = "") {
    setDays((prev) => {
      const day = prev[todayKey];
      if (!day) return prev;
      const updatedSessions = day.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        return { ...s, status: newStatus, notes: notes || s.notes };
      });
      const updatedDay = { ...day, sessions: updatedSessions };
      const newDays = { ...prev, [todayKey]: updatedDay };

      // Handle Backlog creation on miss
      if (newStatus === "missed") {
        const s = day.sessions.find((x) => x.id === sessionId);
        if (s && !backlog.some((b) => b.sourceSessionId === s.id)) {
          const nextSun = getNextSunday(todayKey);
          const newB: BacklogItem = {
            id: `backlog-${s.id}`,
            sourceSessionId: s.id,
            sourceDate: todayKey,
            title: s.title,
            type: s.type,
            status: "pending",
            recoverySunday: nextSun,
            carryCount: 0,
            notes: "",
          };
          const updatedBacklog = [newB, ...backlog];
          setBacklog(updatedBacklog);
          persistClientState(newDays, updatedBacklog);
          return newDays;
        }
      }

      persistClientState(newDays);
      return newDays;
    });

    // Mirror to server API if dbInstanceId exists
    const s = currentDay.sessions.find((x) => x.id === sessionId);
    if (s?.dbInstanceId) {
      const serverStatusMap = {
        in_progress: "ACTIVE",
        completed: "COMPLETED",
        missed: "BLOCKED",
        pending: "PENDING",
        workshop_override: "PAUSED",
      };
      fetch(`/api/task-instances/${s.dbInstanceId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: serverStatusMap[newStatus] || "ACTIVE" }),
      }).catch(() => {});
    }

    setSuccessMsg(`Session status updated to ${newStatus}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  function getNextSunday(dateKey: string): string {
    const d = parseDateKey(dateKey);
    const dayOfWeek = d.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    d.setDate(d.getDate() + daysUntilSunday);
    return toDateKey(d);
  }

  // Session Pause / Resume
  function handleTogglePause(session: SessionItem) {
    if (isSessionPaused(session.id)) {
      // Resume
      const pausedAt = timerPause.pausedAt || Date.now();
      const elapsed = Date.now() - pausedAt;
      const prevTotal = timerPause.totalPausedMs[session.id] || 0;
      const updatedPause = {
        sessionId: null,
        pausedAt: null,
        totalPausedMs: { ...timerPause.totalPausedMs, [session.id]: prevTotal + elapsed },
      };
      setTimerPause(updatedPause);
      persistClientState(days, backlog, settings, giftsDismissed, updatedPause);
      setSuccessMsg(`Resumed ${session.title}`);
    } else {
      // Pause
      const updatedPause = {
        ...timerPause,
        sessionId: session.id,
        pausedAt: Date.now(),
      };
      setTimerPause(updatedPause);
      persistClientState(days, backlog, settings, giftsDismissed, updatedPause);
      setSuccessMsg(`Paused ${session.title}`);
    }
    setTimeout(() => setSuccessMsg(null), 2500);
  }

  // Home Day / College Day Toggle
  function handleToggleHomeDay() {
    setDays((prev) => {
      const d = prev[todayKey];
      if (!d) return prev;
      const nextIsHome = !d.isHomeDay;
      const updated = {
        ...prev,
        [todayKey]: {
          ...d,
          isHomeDay: nextIsHome,
          collegeAttended: nextIsHome ? false : d.collegeAttended,
        },
      };
      persistClientState(updated);
      setSuccessMsg(nextIsHome ? "🏠 Home Day! Backlog unlocked." : "🏫 College Day active.");
      setTimeout(() => setSuccessMsg(null), 3000);
      return updated;
    });
  }

  // Gift System
  const todayGift = MILESTONES[currentDayNumber] || GIFTS[(currentDayNumber - 1) % GIFTS.length];
  const isGiftDismissed = giftsDismissed.includes(todayKey);

  function handleDismissGift() {
    const updated = [...giftsDismissed, todayKey];
    setGiftsDismissed(updated);
    persistClientState(days, backlog, settings, updated);
  }

  // Backlog actions
  const isSundayToday = parseDateKey(todayKey).getDay() === 0;
  const canAccessBacklog = isSundayToday || currentDay.isHomeDay;

  function handleCompleteBacklog(bId: string) {
    if (!canAccessBacklog) {
      setErrorMsg("🔒 Backlog can only be resolved on Sundays or Home Days!");
      return;
    }
    setBacklog((prev) => {
      const updated = prev.map((b) =>
        b.id === bId ? { ...b, status: "completed" as const, completedAt: new Date().toISOString() } : b
      );
      persistClientState(days, updated);
      setSuccessMsg("Backlog item resolved! +20 Score points!");
      setTimeout(() => setSuccessMsg(null), 3000);
      return updated;
    });
  }

  function handleDeferBacklog(bId: string) {
    setBacklog((prev) => {
      const updated = prev.map((b) => {
        if (b.id !== bId) return b;
        return {
          ...b,
          recoverySunday: getNextSunday(b.recoverySunday),
          carryCount: (b.carryCount || 0) + 1,
        };
      });
      persistClientState(days, updated);
      setSuccessMsg("Carried over to next Sunday.");
      setTimeout(() => setSuccessMsg(null), 3000);
      return updated;
    });
  }

  // Add Task to DB API
  async function handleCreateServerTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const remainingMin = capacity?.remainingMinutes ?? 0;
    if (newDuration > remainingMin && !forceOverride) {
      setErrorMsg("Capacity Gatekeeper Block: Task exceeds remaining buffer. Check override to proceed.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaId: newAreaId || lifeAreas[0]?.id,
          title: newTitle.trim(),
          durationMinutes: newDuration,
          priority: newPriority,
          energyRequired: newEnergy,
          isDeepWork: newIsDeepWork,
          recurrenceDays: [0, 1, 2, 3, 4, 5, 6],
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create task.");
      }

      setNewTitle("");
      setNewDuration(45);
      setForceOverride(false);
      setActiveDialog(null);
      setSuccessMsg("Task created and scheduled!");
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadServerData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Add Backlog Item
  function handleAddBacklogSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newBacklogTitle.trim()) return;

    const newBId = `backlog-manual-${Date.now()}`;
    const newB: BacklogItem = {
      id: newBId,
      sourceSessionId: `manual-${Date.now()}`,
      sourceDate: todayKey,
      title: newBacklogTitle.trim(),
      type: newBacklogType,
      status: "pending",
      recoverySunday: getNextSunday(todayKey),
      carryCount: 0,
      notes: newBacklogDesc,
      blockedBy: newBacklogDeps,
    };

    setBacklog((prev) => {
      const updated = [...prev, newB];
      persistClientState(days, updated);
      return updated;
    });

    setNewBacklogTitle("");
    setNewBacklogDesc("");
    setNewBacklogDeps([]);
    setActiveDialog(null);
    setSuccessMsg("Backlog item added!");
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  // PDF Export
  function handleExportPDF(type: "monthly" | "quarterly" | "yearly") {
    const w = window.open("", "_blank");
    if (!w) {
      setErrorMsg("Please allow popups to export PDF.");
      return;
    }
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Project365 Report</title>
    <style>body{font-family:'Segoe UI',sans-serif;max-width:700px;margin:0 auto;padding:24px;color:#111;line-height:1.6}
    h1{border-bottom:3px solid #06b6d4;padding-bottom:10px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0}
    .stat{border:1px solid #ddd;border-radius:8px;padding:12px;text-align:center}
    .stat strong{display:block;font-size:24px}
    </style></head><body>
    <h1>📊 Project365 — ${type.toUpperCase()} REPORT</h1>
    <p>Day ${currentDayNumber} / 365 • Discipline Score: <strong>${disciplineScore}</strong> (${currentLevel.name})</p>
    <div class="grid">
      <div class="stat"><strong>${totalLcSolved}</strong><span>LeetCode Solved</span></div>
      <div class="stat"><strong>${totalAiHours.toFixed(1)}h</strong><span>AI/ML Hours</span></div>
      <div class="stat"><strong>${dayStreak}🔥</strong><span>Day Streak</span></div>
      <div class="stat"><strong>${pendingBacklogList.length}</strong><span>Pending Backlog</span></div>
    </div>
    <script>window.print();</script>
    </body></html>`;
    w.document.write(html);
    w.document.close();
  }

  // SVG circular timer math
  const R = 52;
  const C = 2 * Math.PI * R;
  const activeSesRem = activeSession ? secondsRemainingInSession(activeSession) : 0;
  const activeSesTotal = activeSession
    ? (minutesFromTime(activeSession.endTime) - minutesFromTime(activeSession.startTime)) * 60
    : 3600;
  const activeSesProg = Math.max(0, Math.min(100, ((activeSesTotal - activeSesRem) / Math.max(1, activeSesTotal)) * 100));

  // Circular timer colors
  const activeSesUrgency =
    activeSesRem < activeSesTotal * 0.25 ? "urgent" : activeSesRem < activeSesTotal * 0.5 ? "warning" : "safe";
  const strokeColor =
    activeSesUrgency === "urgent" ? "#ef4444" : activeSesUrgency === "warning" ? "#f59e0b" : "#10b981";

  // ─── Render ──────────────────────────────────────────────────
  const profilePriorityMap: Record<string, string[]> = {
    regular: [],
    exam: ["college"],
    hackathon: ["startup", "aiml"],
    placement: ["leetcode", "career"],
    vacation: ["health"]
  };
  const topPriorityTypes = profilePriorityMap[currentProfile] || [];

  return (
    <main data-profile={currentProfile} className="pb-24 pt-2">
      {/* ── Top Bar ── */}
      <header className="topbar rounded-xl mb-4">
        <div>
          <p className="eyebrow">
            DAY {currentDayNumber} / {GOAL_DAYS} • {formatDisplayDate(todayKey)}
          </p>
          <h1>Project365 Life OS</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Smart Attendance Mode Toggle */}
          <button
            type="button"
            onClick={handleToggleHomeDay}
            className={`status cursor-pointer ${currentDay.isHomeDay ? "completed" : "pending"}`}
            title="Toggle Home Day / College Attendance"
          >
            {currentDay.isHomeDay ? "🏠 HOME" : "🏫 COLLEGE"}
          </button>
          <button
            type="button"
            onClick={loadServerData}
            disabled={loading}
            className="btn btn-secondary text-xs py-1 px-2 text-slate-300"
            title="Sync with PostgreSQL"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
              window.location.href = "/auth/signin";
            }}
            className="btn btn-secondary text-xs py-1 px-2 text-slate-400 hover:text-rose-400"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Notifications / Toast Banners */}
      {successMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Workshop Mode Banner */}
      {isWorkshopActive && (
        <div className="workshop-banner mb-4">
          🏫 Workshop Mode Active: {settings.workshopMode?.name} ({settings.workshopMode?.startDate} —{" "}
          {settings.workshopMode?.endDate})
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: TODAY DASHBOARD                                    */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "today" && (
        <div className="space-y-4">
          {/* Daily Gift Card */}
          {!isGiftDismissed && !isWorkshopActive && (
            <div className="gift-card">
              <button
                type="button"
                className="gift-dismiss"
                onClick={handleDismissGift}
                title="Dismiss gift"
              >
                ✕
              </button>
              <span className="gift-emoji">{todayGift.emoji}</span>
              <div className="gift-text">"{todayGift.text}"</div>
              <div className="text-[10px] text-slate-400 mt-2 font-mono">
                Day {currentDayNumber} / 365 Inspiration
              </div>
            </div>
          )}

          {/* Profile Objectives Widget */}
          <article className="panel space-y-2">
            <div className="flex justify-between items-start">
              <h2 className="font-bold text-white text-base">🎯 Profile Objectives</h2>
              <div className="text-right">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                  currentProfileState.source === "AUTO_RULE" ? "bg-purple-500/20 text-purple-400" :
                  currentProfileState.source === "MANUAL" ? "bg-amber-500/20 text-amber-400" :
                  "bg-slate-700 text-slate-300"
                }`}>
                  {currentProfileState.source}
                </span>
                <div className="text-[10px] text-slate-400 mt-0.5 max-w-[120px] truncate" title={currentProfileState.ruleName}>
                  {currentProfileState.ruleName}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {currentProfile === "placement" && (
                <>
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
                    <span className="block text-emerald-400 font-bold mb-1">LeetCode Progress</span>
                    <span className="text-white text-lg">{totalLcSolved} <span className="text-xs text-slate-400 font-normal">problems</span></span>
                  </div>
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded">
                    <span className="block text-emerald-400 font-bold mb-1">Weekly Target</span>
                    <span className="text-white text-lg">{Math.min(totalLcSolved, 25)} <span className="text-xs text-slate-400 font-normal">/ 25</span></span>
                  </div>
                </>
              )}
              
              {currentProfile === "hackathon" && (
                <>
                  <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded">
                    <span className="block text-cyan-400 font-bold mb-1">AI/ML Sprint</span>
                    <span className="text-white text-lg">{totalAiHours.toFixed(1)} <span className="text-xs text-slate-400 font-normal">hours</span></span>
                  </div>
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded">
                    <span className="block text-purple-400 font-bold mb-1">Until Demo</span>
                    <span className="text-white text-lg">{(GOAL_DAYS * 24) - (currentDayNumber * 24)} <span className="text-xs text-slate-400 font-normal">hours</span></span>
                  </div>
                </>
              )}
              
              {currentProfile === "vacation" && (
                <>
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                    <span className="block text-amber-400 font-bold mb-1">Recovery Target</span>
                    <span className="text-white text-lg">Active</span>
                  </div>
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded">
                    <span className="block text-amber-400 font-bold mb-1">Sleep Logged</span>
                    <span className="text-white text-lg">{(settings.sleepHours || 8).toFixed(1)} <span className="text-xs text-slate-400 font-normal">h / day</span></span>
                  </div>
                </>
              )}

              {currentProfile === "exam" && (
                <>
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded">
                    <span className="block text-indigo-400 font-bold mb-1">Study Hours</span>
                    <span className="text-white text-lg">{Math.round((currentDayNumber * 3))} <span className="text-xs text-slate-400 font-normal">hours</span></span>
                  </div>
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded">
                    <span className="block text-indigo-400 font-bold mb-1">Focus Score</span>
                    <span className="text-white text-lg">{disciplineScore} <span className="text-xs text-slate-400 font-normal">pts</span></span>
                  </div>
                </>
              )}

              {currentProfile === "regular" && (
                <>
                  <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded col-span-2 flex justify-between items-center">
                    <div>
                      <span className="block text-blue-400 font-bold mb-1">Regular Routine</span>
                      <span className="text-white text-sm">Discipline System Active</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white text-lg font-bold">{disciplineScore} <span className="text-xs text-slate-400 font-normal">pts</span></span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </article>

          {/* Dual Circular Timers */}
          <div className="timer-container panel">
            {/* Master Day Timer Ring */}
            <div className="timer-ring">
              <svg viewBox="0 0 120 120">
                <circle className="track" cx="60" cy="60" r={R} />
                <circle
                  className="progress"
                  cx="60"
                  cy="60"
                  r={R}
                  strokeDasharray={C}
                  strokeDashoffset={C * (1 - dayProgressPct / 100)}
                  style={{ stroke: "var(--accent-cyan)" }}
                />
              </svg>
              <div className="timer-inner">
                <div className="timer-digits">{formatTimerSeconds(dayRemSec)}</div>
                <div className="timer-label">
                  Until {settings.logicalDayCutoffHour === 0 ? "12:00 AM" : `0${settings.logicalDayCutoffHour}:00 AM`}
                </div>
              </div>
            </div>

            {/* Active Session Timer Ring (if any) */}
            {activeSession ? (
              <div className="timer-ring">
                <svg viewBox="0 0 120 120">
                  <circle className="track" cx="60" cy="60" r={R} />
                  <circle
                    className="progress"
                    cx="60"
                    cy="60"
                    r={R}
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - activeSesProg / 100)}
                    style={{ stroke: strokeColor }}
                  />
                </svg>
                <div className="timer-inner">
                  <div className="timer-digits">{formatTimerSeconds(activeSesRem)}</div>
                  <div className="timer-label">{activeSession.title}</div>
                </div>
              </div>
            ) : (
              <div className="timer-ring opacity-60">
                <svg viewBox="0 0 120 120">
                  <circle className="track" cx="60" cy="60" r={R} />
                </svg>
                <div className="timer-inner">
                  <div className="timer-digits text-slate-500">STANDBY</div>
                  <div className="timer-label">No Active Session</div>
                </div>
              </div>
            )}
          </div>

          {/* Global Discipline Score Hero Card */}
          <div className="score-hero">
            <div className={`level-badge ${currentLevel.css}`}>
              <span>{currentLevel.emoji}</span>
              <span>{currentLevel.name}</span>
            </div>
            <div className="score-value">{disciplineScore}</div>
            <div className="score-progress">
              <div className="progress-bar">
                <span style={{ width: `${levelProgressPct}%` }} />
              </div>
              <div className="score-next">
                {nextLevel
                  ? `Next Level: ${nextLevel.emoji} ${nextLevel.name} (${nextLevel.min} pts)`
                  : "🏆 MAX DISCIPLINE LEVEL!"}
              </div>
            </div>
          </div>

          {/* Active Session Card OR Next Up Card */}
          {activeSession ? (
            <article className="panel current space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="eyebrow text-cyan-400">⚡ Current Active Session</p>
                  <h2 className="text-lg font-bold text-white">{activeSession.title}</h2>
                  <p className="text-xs text-slate-300">
                    {activeSession.startTime} — {activeSession.endTime} •{" "}
                    <span className="capitalize">{activeSession.status}</span>
                  </p>
                </div>
                <span className={`status ${activeSession.status}`}>{activeSession.status}</span>
              </div>

              <div
                className={`session-timer ${activeSesUrgency} ${
                  isSessionPaused(activeSession.id) ? "paused" : ""
                }`}
              >
                <span className="text-xs text-slate-400">Time Left</span>
                <span className="timer-digits font-mono font-bold text-xl text-white">
                  {formatTimerSeconds(activeSesRem)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSessionAction(activeSession.id, "in_progress")}
                  disabled={activeSession.status === "in_progress"}
                  className="btn btn-primary text-xs py-2"
                >
                  <Play className="w-3.5 h-3.5 mr-1" /> Start
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePause(activeSession)}
                  className="btn btn-secondary text-xs py-2"
                >
                  {isSessionPaused(activeSession.id) ? (
                    <>
                      <Play className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 mr-1 text-amber-400" /> Pause
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleSessionAction(activeSession.id, "completed")}
                  className="btn btn-emerald text-xs py-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Done
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSessionAction(activeSession.id, "missed")}
                className="btn btn-secondary text-rose-400 border-rose-500/30 hover:bg-rose-500/10 w-full text-xs py-1.5"
              >
                ✕ Miss &amp; Move to Backlog
              </button>
            </article>
          ) : nextUpSession ? (
            <article className="panel space-y-2 border-purple-500/30">
              <p className="eyebrow text-purple-400">⏳ Next Up</p>
              <h2 className="text-base font-bold text-white">{nextUpSession.title}</h2>
              <p className="text-xs text-slate-400">
                Starts at {nextUpSession.startTime} — {nextUpSession.endTime}
              </p>
              <div className="session-timer safe flex justify-between items-center py-2 px-3">
                <span className="text-xs text-slate-400">Starts In</span>
                <span className="timer-digits text-purple-400 font-mono font-bold text-lg">
                  {formatTimerSeconds(secondsUntilSessionStart(nextUpSession))}
                </span>
              </div>
            </article>
          ) : null}

          {/* 4-Metric Grid */}
          <div className="metric-grid">
            <div className="metric">
              <strong>{dayStreak}🔥</strong>
              <span className="metric-label">Day Streak</span>
            </div>
            <div className="metric">
              <strong>{pendingBacklogList.length}</strong>
              <span className="metric-label">Backlog Items</span>
            </div>
            <div className="metric">
              <strong>
                {totalLcSolved}/{settings.leetcodeGoal}
              </strong>
              <span className="metric-label">LeetCode</span>
            </div>
            <div className="metric">
              <strong>{totalAiHours.toFixed(1)}h</strong>
              <span className="metric-label">AI/ML Hours</span>
            </div>
          </div>

          {/* Capacity Reality Envelope Bar */}
          {capacity && (
            <section className="glass-card p-4 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider">
                  Human Capacity Envelope
                </span>
                <span
                  className={`badge ${
                    capacity.remainingMinutes > 0
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  }`}
                >
                  {capacity.remainingHours}h Buffer Remaining
                </span>
              </div>
              <div className="progress-bar-bg h-2 w-full flex overflow-hidden rounded-full">
                <div
                  style={{ width: `${Math.min(100, (capacity.commitmentMinutes / 1020) * 100)}%` }}
                  className="bg-slate-600 h-full"
                  title="Fixed commitments"
                />
                <div
                  style={{ width: `${Math.min(100, (capacity.plannedMinutes / 1020) * 100)}%` }}
                  className="bg-purple-500 h-full"
                  title="Allocated tasks"
                />
                <div
                  style={{ width: `${Math.max(0, (capacity.remainingMinutes / 1020) * 100)}%` }}
                  className="bg-emerald-500 h-full"
                  title="Discretionary buffer"
                />
              </div>
            </section>
          )}

          {/* Failure Cost Card (if any missed sessions) */}
          {failureCost.missedSessions > 0 && (
            <div className="failure-card">
              <h2 className="text-rose-400 font-bold text-sm mb-2">💀 Failure Cost Counter</h2>
              <div className="failure-stats text-xs space-y-1">
                <div className="failure-stat">
                  <span>{failureCost.missedSessions} Sessions Missed</span>
                  <span className="fail-value">{failureCost.missedSessions}</span>
                </div>
                {failureCost.missedAiMl > 0 && (
                  <div className="failure-stat">
                    <span>AI/ML Hours Lost</span>
                    <span className="fail-value">{failureCost.missedAiMl.toFixed(1)}h</span>
                  </div>
                )}
                {failureCost.missedLeetcode > 0 && (
                  <div className="failure-stat">
                    <span>LeetCode Hours Lost</span>
                    <span className="fail-value">{failureCost.missedLeetcode.toFixed(1)}h</span>
                  </div>
                )}
                {failureCost.pendingBacklogHrs > 0 && (
                  <div className="failure-stat">
                    <span>Backlog Hours Awaiting Sunday</span>
                    <span className="fail-value">{failureCost.pendingBacklogHrs.toFixed(1)}h</span>
                  </div>
                )}
              </div>
              <div className="failure-total mt-2 pt-2 border-t border-rose-500/20 text-xs flex justify-between font-bold">
                <span>TOTAL TIME COMPROMISED</span>
                <span className="fail-value text-rose-400 text-sm">{failureCost.totalLost.toFixed(1)}h</span>
              </div>
            </div>
          )}

          {/* Today's Schedule Timeline */}
          <article className="panel space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-white text-base">Today's Schedule</h2>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentDay.sessions.filter((s) => s.status === "completed").length} /{" "}
                {currentDay.sessions.length} done
              </span>
            </div>

            {currentProfile === "vacation" && (
              <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs mb-2">
                🌴 <strong>Vacation Reset Active:</strong> Backlog is locked. Prioritize your 8-hour sleep floor and basic commitments.
              </div>
            )}
            {currentProfile === "hackathon" && (
              <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs mb-2">
                💻 <strong>Hackathon Sprints Active:</strong> Overload gates disabled. Temporary sprint overrides allowed.
              </div>
            )}

            <div className="session-list">
              {currentDay.sessions.map((s, idx) => {
                // Free Time block calculation
                let freeGapNotice: React.ReactNode = null;
                if (idx > 0) {
                  const prevEnd = minutesFromTime(currentDay.sessions[idx - 1].endTime);
                  const currStart = minutesFromTime(s.startTime);
                  if (currStart > prevEnd) {
                    const diff = currStart - prevEnd;
                    const gh = Math.floor(diff / 60);
                    const gm = diff % 60;
                    freeGapNotice = (
                      <div className="free-time-row my-1" key={`free-${idx}`}>
                        ☕ Free Time • {gh > 0 ? `${gh}h ` : ""}
                        {gm > 0 ? `${gm}m` : ""}
                      </div>
                    );
                  }
                }

                const isActive = activeSession?.id === s.id;
                const isProfileFocus = topPriorityTypes.includes(s.type);

                return (
                  <React.Fragment key={s.id}>
                    {freeGapNotice}
                    <div
                      className={`session-row ${
                        isActive ? "border-cyan-400/50 shadow-lg shadow-cyan-500/10" : ""
                      } ${isProfileFocus && !isActive ? "border-amber-400/30 bg-amber-400/5" : ""}`}
                    >
                      <div>
                        <div className="session-title flex items-center gap-1.5">
                          <span>{s.title}</span>
                          {isProfileFocus && (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded ml-1 border border-amber-400/20">★ PROFILE FOCUS</span>
                          )}
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                          )}
                        </div>
                        <div className="session-meta">
                          {s.startTime} — {s.endTime}
                        </div>
                      </div>

                      <div className="session-actions">
                        <span className={`status ${s.status}`}>{s.status}</span>
                        {(s.status === "pending" || s.status === "in_progress") && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSessionAction(s.id, "completed")}
                              className="btn btn-emerald text-[10px] py-1 px-2 h-7"
                              title="Mark Done"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSessionAction(s.id, "missed")}
                              className="btn btn-secondary text-rose-400 text-[10px] py-1 px-2 h-7"
                              title="Mark Missed"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </article>

          {/* Quick Entry Actions */}
          <article className="panel space-y-2">
            <h2 className="font-bold text-white text-base">Quick Entry & Task Logging</h2>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetSessionForDialog(null);
                  setActiveDialog("leetcode");
                }}
                className={`btn text-xs py-2 flex-col gap-1 ${currentProfile === "placement" ? "btn-primary order-first ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20" : "btn-secondary"}`}
              >
                <span>💻</span>
                <span>LeetCode</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetSessionForDialog(null);
                  setActiveDialog("aiml");
                }}
                className={`btn text-xs py-2 flex-col gap-1 ${currentProfile === "hackathon" ? "btn-primary order-first ring-2 ring-cyan-500 shadow-lg shadow-cyan-500/20" : "btn-secondary"}`}
              >
                <span>🤖</span>
                <span>AI/ML</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDialog("startup")}
                className={`btn text-xs py-2 flex-col gap-1 ${currentProfile === "hackathon" ? "btn-primary order-2 ring-2 ring-purple-500 shadow-lg shadow-purple-500/20" : "btn-secondary"}`}
              >
                <span>🚀</span>
                <span>Startup</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDialog("addTask")}
                className={`btn text-xs py-2 flex-col gap-1 ${currentProfile === "exam" ? "btn-primary order-first ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20" : "btn-primary order-last"}`}
              >
                <span>+</span>
                <span>Add Task</span>
              </button>
            </div>
          </article>

          {/* Daily Review Card */}
          {currentProfile !== "hackathon" && (
            <article className="panel space-y-2">
              <h2 className="font-bold text-white text-base">📝 Daily Review & Tomorrow</h2>
              <div className="review-section text-xs">
                <div className="review-item good">
                  <strong>✅ Completed Today: </strong>
                  {currentDay.sessions
                    .filter((s) => s.status === "completed")
                    .map((s) => s.title)
                    .join(", ") || "None yet"}
                </div>
                <div className="review-item attention">
                  <strong>❌ Missed → Backlog: </strong>
                  {currentDay.sessions
                    .filter((s) => s.status === "missed")
                    .map((s) => s.title)
                    .join(", ") || "None"}
                </div>
                <div className="review-item tomorrow">
                  <strong>📋 Tomorrow's Protocol: </strong>
                  {BASE_SCHEDULE.map((s) => s[1]).join(", ")}
                </div>
              </div>
            </article>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: BACKLOG                                            */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "backlog" && (
        <div className="space-y-4">
          {currentProfile === "vacation" ? (
            <article className="panel text-center py-12 space-y-3">
              <div className="text-4xl">🔒</div>
              <h2 className="text-amber-400 font-bold">Hidden by Vacation Mode</h2>
              <p className="text-sm text-slate-400">Your current profile prevents viewing long-term backlogs to enforce recovery.</p>
            </article>
          ) : (
            <>
              {/* Recovery Plan Card */}
              {pendingBacklogList.length > 0 && (
            <div
              className={`recovery-card ${
                pendingBacklogList.length >= 10
                  ? "risk-critical"
                  : pendingBacklogList.length >= 5
                  ? "risk-high"
                  : "risk-medium"
              }`}
            >
              <div className="recovery-header">
                <h2 className="font-bold text-sm">⚠️ Emergency Recovery Plan</h2>
                <span
                  className={`risk-badge ${
                    pendingBacklogList.length >= 10
                      ? "critical"
                      : pendingBacklogList.length >= 5
                      ? "high"
                      : "medium"
                  }`}
                >
                  {pendingBacklogList.length >= 10
                    ? "CRITICAL RISK"
                    : pendingBacklogList.length >= 5
                    ? "HIGH RISK"
                    : "MODERATE"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-2">
                {pendingBacklogList.length} items • ~
                {(pendingBacklogList.length * 1.75).toFixed(1)} hours awaiting resolution.
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="recovery-plan-item">
                  <span>Saturday Deep Work (AI/ML &amp; Dev)</span>
                  <span className="plan-day">Saturday • 4.0h</span>
                </div>
                <div className="recovery-plan-item">
                  <span>Sunday Recovery Sprint (College Work &amp; LC)</span>
                  <span className="plan-day">Sunday • 4.5h</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Est. recovery: ~{Math.ceil((pendingBacklogList.length * 1.75) / 8)} Sunday(s) needed.
              </p>
            </div>
          )}

          {/* Backlog Segmented List */}
          <article className="panel space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-white text-base">
                {isSundayToday ? "☀️ Sunday Recovery Active" : "📦 Backlog Depot"}
              </h2>
              <button
                type="button"
                className="btn-primary py-1 px-3 text-xs"
                onClick={() => setActiveDialog("addBacklog")}
              >
                + Add Item
              </button>
            </div>

            {/* Segmented filter */}
            <div className="segmented">
              <button
                type="button"
                className={backlogFilter === "pending" ? "active" : "secondary"}
                onClick={() => setBacklogFilter("pending")}
              >
                Pending ({pendingBacklogList.length})
              </button>
              <button
                type="button"
                className={backlogFilter === "completed" ? "active" : "secondary"}
                onClick={() => setBacklogFilter("completed")}
              >
                Done ({backlog.filter((b) => b.status === "completed").length})
              </button>
              <button
                type="button"
                className={backlogFilter === "all" ? "active" : "secondary"}
                onClick={() => setBacklogFilter("all")}
              >
                All ({backlog.length})
              </button>
            </div>

            {/* Access Lock Notice */}
            {!canAccessBacklog && backlogFilter === "pending" ? (
              <div className="backlog-locked-msg">
                <span className="lock-icon">🔒</span>
                <p className="font-bold text-slate-300">
                  Backlog is locked on College Days
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Backlog clearing is strictly reserved for <strong>Sundays</strong> or <strong>Home Days</strong>.
                  Toggle "🏠 HOME" in the top bar if you are studying from home today.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {backlog
                  .filter((b) => {
                    if (backlogFilter === "pending") return b.status === "pending";
                    if (backlogFilter === "completed") return b.status === "completed";
                    return true;
                  })
                  .map((item) => {
                    const isDone = item.status === "completed";
                    const urgClass =
                      item.carryCount >= 3
                        ? "urgent-high"
                        : item.carryCount >= 1
                        ? "urgent-medium"
                        : "urgent-low";

                    // Calculate recursive descendants unlocked
                    const visited = new Set<string>();
                    let descendantsCount = 0;
                    const queue = [item.id];
                    while (queue.length > 0) {
                      const currId = queue.shift()!;
                      const children = backlog.filter(other => 
                        other.blockedBy?.includes(currId) && 
                        other.status !== "completed" && 
                        !visited.has(other.id)
                      );
                      for (const child of children) {
                        visited.add(child.id);
                        descendantsCount++;
                        queue.push(child.id);
                      }
                    }
                    const isBlockedBy = item.blockedBy?.filter(depId => {
                      const dep = backlog.find(b => b.id === depId);
                      return dep && dep.status !== "completed";
                    }) || [];
                    
                    const firstBlocker = isBlockedBy.length > 0 
                      ? backlog.find(b => b.id === isBlockedBy[0]) 
                      : null;

                    return (
                      <div key={item.id} className={`backlog-row ${urgClass}`}>
                        <div className="backlog-top">
                          <div>
                            <strong className="text-sm text-white">{item.title}</strong>
                            {firstBlocker && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                🔒 Waiting for: {firstBlocker.title}
                              </span>
                            )}
                            {!firstBlocker && descendantsCount >= 1 && (
                              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                🔑 Key Task (Unlocks {descendantsCount})
                              </span>
                            )}
                            {item.isPauseBacklog && (
                              <span className="pause-tag">⏸ Paused time</span>
                            )}
                            <div className="session-meta text-xs">
                              {formatDisplayDate(item.sourceDate)} → Sun{" "}
                              {formatDisplayDate(item.recoverySunday)}
                              {item.carryCount > 0 && ` • Carried ${item.carryCount}x`}
                            </div>
                          </div>
                          <span className={`status ${isDone ? "completed" : "pending"}`}>
                            {isDone ? "Done" : item.carryCount >= 3 ? "🔴 Critical" : "Pending"}
                          </span>
                        </div>

                        {!isDone && canAccessBacklog && (
                          <div className="backlog-actions mt-1">
                            <button
                              type="button"
                              onClick={() => handleCompleteBacklog(item.id)}
                              className="btn btn-emerald text-xs py-1.5"
                            >
                              ✓ Done
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeferBacklog(item.id)}
                              className="btn btn-secondary text-xs py-1.5 text-slate-300"
                            >
                              → Next Sun
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {backlog.length === 0 && (
                  <p className="text-center text-slate-500 py-6 text-sm">
                    Backlog is completely empty! You are 100% disciplined! 🎉
                  </p>
                )}
              </div>
            )}
          </article>
            </>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: HOURS                                              */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "hours" && (
        <div className="space-y-4">
          {currentProfile === "vacation" ? (
            <article className="panel text-center py-12 space-y-3">
              <div className="text-4xl">🔒</div>
              <h2 className="text-amber-400 font-bold">Hidden by Vacation Mode</h2>
              <p className="text-sm text-slate-400">Your current profile hides long-term workload metrics to enforce recovery.</p>
            </article>
          ) : (
            <>
              {/* Total 365 Days Progress */}
              <article className="panel space-y-2">
                <h2 className="font-bold text-white text-base">📊 Total 365-Day Hours Commitment</h2>
                <div className="metric-grid">
                  <div className="metric">
                    <strong>{(GOAL_DAYS * 9.5).toFixed(0)}h</strong>
                    <span className="metric-label">365-Day Target</span>
                  </div>
                  <div className="metric">
                    <strong>{(currentDayNumber * 8.2).toFixed(1)}h</strong>
                    <span className="metric-label">Completed Hours</span>
                  </div>
                </div>
                <div className="progress-bar mt-2">
                  <span style={{ width: `${Math.min(100, (currentDayNumber / GOAL_DAYS) * 100)}%` }} />
                </div>
              </article>

              {/* Category Hours Cards */}
              <div className="hours-grid">
                {BASE_SCHEDULE.map(([type, title, st, en]) => {
                  const sm = minutesFromTime(st);
                  let em = minutesFromTime(en);
                  if (em <= sm) em += 1440;
                  const sH = (em - sm) / 60;
                  const targetH = sH * GOAL_DAYS;

                  // Count completed sessions
                  let completedCount = 0;
                  Object.values(days).forEach((d) => {
                    const f = d.sessions.find((ss) => ss.type === type && ss.status === "completed");
                    if (f) completedCount++;
                  });
                  const doneH = completedCount * sH;
                  const pendingH = pendingBacklogList.filter((b) => b.type === type).length * sH;
                  const pct = Math.min(100, Math.round((doneH / targetH) * 100));

                  return (
                    <div key={type} className="hours-card">
                      <div className="hours-title text-white font-bold">{title}</div>
                      <div className="hours-numbers">
                        <div>
                          <div className="hours-value">{doneH.toFixed(1)}</div>
                          <div className="hours-label">Done (h)</div>
                        </div>
                        <div>
                          <div className="hours-value text-amber-400">{pendingH.toFixed(1)}</div>
                          <div className="hours-label">Backlog (h)</div>
                        </div>
                        <div>
                          <div className="hours-value text-slate-500">
                            {Math.max(0, targetH - doneH).toFixed(0)}
                          </div>
                          <div className="hours-label">Remaining</div>
                        </div>
                      </div>
                      <div className="hours-bar">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {sH.toFixed(1)}h/day × {GOAL_DAYS} = {targetH.toFixed(0)}h total
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Weekly Reality Report Card */}
              {currentProfile !== "placement" && (
                <article className="panel space-y-2">
                  <h2 className="font-bold text-white text-base">📋 Weekly Reality Reports</h2>
                  <div className="space-y-2">
                    <div className="report-card">
                      <div className="report-header">
                        <h3>Week {Math.max(1, Math.ceil(currentDayNumber / 7))} Report</h3>
                        <span className="report-score-change positive">+85 pts</span>
                      </div>
                      <div className="session-meta mb-2">
                        Current Evaluation Window • Evaluation in Progress
                      </div>
                      <div className="report-stats">
                        <div className="report-stat">
                          Sessions: <strong>{currentDay.sessions.filter((s) => s.status === "completed").length} Done</strong>
                        </div>
                        <div className="report-stat">
                          LC Solved: <strong>{totalLcSolved}</strong>
                        </div>
                        <div className="report-stat">
                          AI/ML: <strong>{totalAiHours.toFixed(1)}h</strong>
                        </div>
                        <div className="report-stat">
                          Score: <strong>{disciplineScore} pts</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )}
            </>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 4: CALENDAR                                           */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          <article className="panel space-y-3">
            {/* Month Header Navigation */}
            <div className="calendar-nav">
              <button
                type="button"
                className="btn btn-secondary py-1 px-2.5"
                onClick={() => {
                  let nm = calendarMonth - 1;
                  let ny = calendarYear;
                  if (nm < 0) {
                    nm = 11;
                    ny--;
                  }
                  setCalendarMonth(nm);
                  setCalendarYear(ny);
                  setCalendarSelectedDay(null);
                }}
              >
                ◀
              </button>
              <span className="cal-month font-bold text-base text-white">
                {new Date(calendarYear, calendarMonth).toLocaleString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <button
                type="button"
                className="btn btn-secondary py-1 px-2.5"
                onClick={() => {
                  let nm = calendarMonth + 1;
                  let ny = calendarYear;
                  if (nm > 11) {
                    nm = 0;
                    ny++;
                  }
                  setCalendarMonth(nm);
                  setCalendarYear(ny);
                  setCalendarSelectedDay(null);
                }}
              >
                ▶
              </button>
            </div>

            {/* 7-Day Heatmap Grid */}
            <div className="calendar-grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                <div key={dayName} className="calendar-header">
                  {dayName}
                </div>
              ))}

              {/* Leading blanks */}
              {Array.from({
                length: new Date(calendarYear, calendarMonth, 1).getDay(),
              }).map((_, i) => (
                <div key={`blank-${i}`} className="calendar-day other-month" />
              ))}

              {/* Days of Month */}
              {Array.from({
                length: new Date(calendarYear, calendarMonth + 1, 0).getDate(),
              }).map((_, i) => {
                const dayNum = i + 1;
                const dKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(
                  dayNum
                ).padStart(2, "0")}`;
                const isToday = dKey === todayKey;
                const dData = days[dKey];
                const dayBacklog = backlog.filter((b) => b.sourceDate === dKey);
                const hasPendingBacklog = dayBacklog.some((b) => b.status === "pending");

                let heatClass = "no-data";
                if (dData) {
                  const compCount = dData.sessions.filter((s) => s.status === "completed").length;
                  if (compCount === 0) heatClass = "heat-0";
                  else if (compCount <= 3) heatClass = "heat-1";
                  else if (compCount <= 6) heatClass = "heat-2";
                  else heatClass = "heat-3";
                }
                if (hasPendingBacklog) heatClass = "has-backlog";

                return (
                  <div
                    key={dKey}
                    onClick={() =>
                      setCalendarSelectedDay(calendarSelectedDay === dKey ? null : dKey)
                    }
                    className={`calendar-day ${heatClass} ${isToday ? "today" : ""} ${
                      calendarSelectedDay === dKey ? "ring-2 ring-cyan-400" : ""
                    }`}
                  >
                    <span className="day-num">{dayNum}</span>
                    {hasPendingBacklog && <span className="day-dot" />}
                  </div>
                );
              })}
            </div>

            {/* Selected Day Inspector */}
            {calendarSelectedDay && (
              <div className="calendar-day-detail space-y-1">
                <h3 className="font-bold text-sm text-cyan-400">
                  {formatDisplayDate(calendarSelectedDay)}
                </h3>
                {days[calendarSelectedDay] ? (
                  <div className="text-xs text-slate-300">
                    Sessions Completed:{" "}
                    <strong>
                      {
                        days[calendarSelectedDay].sessions.filter((s) => s.status === "completed")
                          .length
                      }{" "}
                      / {days[calendarSelectedDay].sessions.length}
                    </strong>
                    <div className="mt-1 space-y-1">
                      {days[calendarSelectedDay].sessions.map((s) => (
                        <div key={s.id} className="flex justify-between text-slate-400">
                          <span>{s.title}</span>
                          <span className={`status ${s.status}`}>{s.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No session records logged for this day.</p>
                )}
              </div>
            )}
          </article>

          {/* Achievement Badges Grid */}
          <article className="panel space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-white text-base">🏅 Achievement Badges</h2>
              <span className="text-xs text-slate-400">
                {
                  BADGES.filter((b) => {
                    if (b.id === "streak_7") return dayStreak >= 7;
                    if (b.id === "streak_30") return dayStreak >= 30;
                    if (b.id === "lc_100") return totalLcSolved >= 100;
                    if (b.id === "ai_100") return totalAiHours >= 100;
                    return false;
                  }).length
                }{" "}
                / {BADGES.length} Unlocked
              </span>
            </div>

            <div className="badge-grid">
              {BADGES.map((b) => {
                let isUnlocked = false;
                if (b.id === "streak_7") isUnlocked = dayStreak >= 7;
                else if (b.id === "streak_30") isUnlocked = dayStreak >= 30;
                else if (b.id === "lc_100") isUnlocked = totalLcSolved >= 100;
                else if (b.id === "ai_100") isUnlocked = totalAiHours >= 100;

                return (
                  <div
                    key={b.id}
                    className={`badge-card ${isUnlocked ? "unlocked" : "locked"}`}
                    title={b.name}
                  >
                    <span className="badge-emoji">{isUnlocked ? b.emoji : "🔒"}</span>
                    <span className="badge-name">{b.name}</span>
                  </div>
                );
              })}
            </div>
          </article>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 5: SETTINGS & PROFILES                                */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="space-y-4">
          <div className="settings-list">
            {/* Life Profiles Switcher */}
            <div className="setting-row">
              <strong className="text-white text-sm">🎛️ Active Life Profile</strong>
              <p className="text-xs text-slate-400">
                Adapts session weights, capacity limits, and routine priorities
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {[
                  { id: "regular", label: "🏫 Regular Semester" },
                  { id: "exam", label: "📚 Exam Prep" },
                  { id: "hackathon", label: "💻 Hackathon Mode" },
                  { id: "placement", label: "🚀 Placement Prep" },
                  { id: "vacation", label: "🏖️ Vacation Reset" },
                ].map((prof) => (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={async () => {
                      const newLog = {
                        timestamp: new Date().toISOString(),
                        event: "PROFILE_OVERRIDE",
                        source: "MANUAL",
                        profile: prof.id,
                      };
                      const updated = { 
                        ...settings, 
                        overrideProfile: prof.id, 
                        overrideExpiresAt: todayKey,
                        auditLogs: [newLog, ...(settings.auditLogs || [])].slice(0, 50) // keep last 50 logs
                      };
                      setSettings(updated);
                      persistClientState(days, backlog, updated);

                      try {
                        const res = await fetch("/api/users/profile", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ activeProfile: prof.id }),
                        });
                        if (res.ok) {
                          const capRes = await fetch("/api/capacity/remaining");
                          if (capRes.ok) {
                            const newCap = await capRes.json();
                            setCapacity(newCap);
                          }
                          setSuccessMsg(`Manual Override: ${prof.label} (Until tomorrow)`);
                        } else {
                          setErrorMsg("Failed to sync profile to server.");
                        }
                      } catch (err) {
                        setErrorMsg("Error syncing profile to server.");
                      }

                      setTimeout(() => {
                        setSuccessMsg(null);
                        setErrorMsg(null);
                      }, 3000);
                    }}
                    className={`btn text-xs py-2 ${
                      currentProfile === prof.id
                        ? "btn-primary font-bold shadow-lg shadow-purple-500/20"
                        : "btn-secondary"
                    }`}
                  >
                    {prof.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Profiles Section */}
            <div className="panel space-y-3">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="font-bold text-white">🤖 Auto-Profiles</h3>
                  <p className="text-xs text-slate-400">Rules apply automatically based on dates. Highest priority wins.</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary text-xs py-1 px-2"
                  onClick={() => {
                    const newRule = {
                      id: `rule-${Date.now()}`,
                      name: "New Rule",
                      profile: "placement",
                      startDate: todayKey,
                      endDate: todayKey,
                      priority: 10
                    };
                    const updated = { ...settings, autoProfiles: [...(settings.autoProfiles || []), newRule] };
                    setSettings(updated);
                    persistClientState(days, backlog, updated);
                  }}
                >
                  + Add Rule
                </button>
              </div>
              
              <div className="space-y-2">
                {(settings.autoProfiles || []).map((rule, idx) => (
                  <div key={rule.id} className="bg-slate-800 p-2 rounded border border-slate-700 flex flex-wrap gap-2 items-center text-xs">
                    <input 
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 flex-1 min-w-[100px]"
                      value={rule.name}
                      onChange={(e) => {
                        const newRules = [...settings.autoProfiles];
                        newRules[idx].name = e.target.value;
                        const updated = { ...settings, autoProfiles: newRules };
                        setSettings(updated);
                        persistClientState(days, backlog, updated);
                      }}
                    />
                    <select
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1"
                      value={rule.profile}
                      onChange={(e) => {
                        const newRules = [...settings.autoProfiles];
                        newRules[idx].profile = e.target.value;
                        const updated = { ...settings, autoProfiles: newRules };
                        setSettings(updated);
                        persistClientState(days, backlog, updated);
                      }}
                    >
                      <option value="regular">Regular</option>
                      <option value="exam">Exam</option>
                      <option value="hackathon">Hackathon</option>
                      <option value="placement">Placement</option>
                      <option value="vacation">Vacation</option>
                    </select>
                    <input 
                      type="date"
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-[115px]"
                      value={rule.startDate}
                      onChange={(e) => {
                        const newRules = [...settings.autoProfiles];
                        newRules[idx].startDate = e.target.value;
                        const updated = { ...settings, autoProfiles: newRules };
                        setSettings(updated);
                        persistClientState(days, backlog, updated);
                      }}
                    />
                    <span className="text-slate-500">-</span>
                    <input 
                      type="date"
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-[115px]"
                      value={rule.endDate}
                      onChange={(e) => {
                        const newRules = [...settings.autoProfiles];
                        newRules[idx].endDate = e.target.value;
                        const updated = { ...settings, autoProfiles: newRules };
                        setSettings(updated);
                        persistClientState(days, backlog, updated);
                      }}
                    />
                    <input 
                      type="number"
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-16"
                      placeholder="Pri"
                      title="Priority (Higher wins)"
                      value={rule.priority}
                      onChange={(e) => {
                        const newRules = [...settings.autoProfiles];
                        newRules[idx].priority = Number(e.target.value);
                        const updated = { ...settings, autoProfiles: newRules };
                        setSettings(updated);
                        persistClientState(days, backlog, updated);
                      }}
                    />
                    <button
                      className="text-red-400 hover:text-red-300 px-2"
                      onClick={() => {
                        const newRules = settings.autoProfiles.filter(r => r.id !== rule.id);
                        const updated = { ...settings, autoProfiles: newRules };
                        setSettings(updated);
                        persistClientState(days, backlog, updated);
                      }}
                    >✕</button>
                  </div>
                ))}
                {(!settings.autoProfiles || settings.autoProfiles.length === 0) && (
                  <p className="text-slate-500 text-center py-2 text-xs">No auto-profiles configured.</p>
                )}
              </div>
            </div>

            {/* Profile Activation Audit Timeline */}
            <div className="panel space-y-3">
              <h3 className="font-bold text-white mb-2">📜 Profile Activation Audit Timeline</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {(settings.auditLogs || []).length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-2">No profile switches recorded yet.</p>
                ) : (
                  (settings.auditLogs || []).map((log, i) => {
                    const date = new Date(log.timestamp);
                    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                    return (
                      <div key={i} className="flex gap-3 text-xs bg-slate-800 p-2 rounded border border-slate-700/50">
                        <div className="text-slate-400 shrink-0 w-24 text-right">
                          <div className="font-bold">{formattedDate}</div>
                          <div>{formattedTime}</div>
                        </div>
                        <div className="w-px bg-slate-700 shrink-0 mx-1"></div>
                        <div className="flex-1">
                          <div className="font-bold text-white">
                            {log.source === "MANUAL" ? (
                              <span className="text-amber-400">MANUAL OVERRIDE</span>
                            ) : (
                              <span className="text-purple-400">{log.source}</span>
                            )}
                          </div>
                          <div className="text-slate-300 mt-0.5">
                            → Switched to <span className="uppercase font-bold text-emerald-400">{log.profile}</span>
                          </div>
                          {log.rule && (
                            <div className="text-[10px] text-slate-500 mt-1">Rule: {log.rule}</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* General Settings */}
            <div className="setting-row">
              <strong className="text-white text-sm">📅 Start Date</strong>
              <input
                type="date"
                value={settingsStartDate}
                onChange={(e) => setSettingsStartDate(e.target.value)}
              />
            </div>

            <div className="setting-row">
              <strong className="text-white text-sm">💻 LeetCode Target Goal</strong>
              <input
                type="number"
                value={settingsLcGoal}
                onChange={(e) => setSettingsLcGoal(Number(e.target.value))}
              />
            </div>

            <div className="setting-row">
              <strong className="text-white text-sm">🤖 AI/ML Curriculum Phase</strong>
              <select
                value={settingsAiPhase}
                onChange={(e) => setSettingsAiPhase(e.target.value)}
              >
                <option value="learning">Phase 1: Foundations &amp; Math</option>
                <option value="implementation">Phase 2: PyTorch &amp; Projects</option>
                <option value="deployment">Phase 3: Production &amp; Agents</option>
              </select>
            </div>

            <div className="setting-row">
              <strong className="text-white text-sm">🌙 Logical Day Cutoff</strong>
              <select
                value={settingsCutoff}
                onChange={(e) => setSettingsCutoff(Number(e.target.value))}
              >
                <option value={0}>Midnight (12:00 AM)</option>
                <option value={1}>01:00 AM (Recommended for Night Owl)</option>
                <option value={2}>02:00 AM</option>
              </select>
            </div>

            {/* Workshop Mode Setting */}
            <div className="setting-row border-l-2 border-purple-500">
              <strong className="text-white text-sm">🏫 Workshop &amp; Event Mode</strong>
              <p className="text-xs text-slate-400">
                Pauses strict penalty expirations during hackathons or college symposiums
              </p>
              <input
                type="text"
                placeholder="Event / Workshop Name"
                value={settingsWsName}
                onChange={(e) => setSettingsWsName(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={settingsWsStart}
                  onChange={(e) => setSettingsWsStart(e.target.value)}
                />
                <input
                  type="date"
                  value={settingsWsEnd}
                  onChange={(e) => setSettingsWsEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Save Settings Button */}
            <button
              type="button"
              onClick={() => {
                const updated = {
                  ...settings,
                  startDate: settingsStartDate,
                  leetcodeGoal: settingsLcGoal,
                  aiPhase: settingsAiPhase,
                  logicalDayCutoffHour: settingsCutoff,
                  notificationsEnabled: settingsNotifs,
                  workshopMode:
                    settingsWsName && settingsWsStart && settingsWsEnd
                      ? {
                          name: settingsWsName,
                          startDate: settingsWsStart,
                          endDate: settingsWsEnd,
                        }
                      : null,
                };
                setSettings(updated);
                persistClientState(days, backlog, updated);
                setSuccessMsg("Settings updated successfully!");
                setTimeout(() => setSuccessMsg(null), 3000);
              }}
              className="btn btn-primary w-full py-2.5 font-bold"
            >
              💾 Save Settings
            </button>

            {/* PDF Reports Export */}
            <div className="setting-row border-l-2 border-cyan-400">
              <strong className="text-white text-sm">📊 Generate PDF Reports</strong>
              <p className="text-xs text-slate-400">
                Print or export verified discipline records
              </p>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => handleExportPDF("monthly")}
                  className="btn btn-secondary text-xs py-2"
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPDF("quarterly")}
                  className="btn btn-secondary text-xs py-2"
                >
                  Quarterly
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPDF("yearly")}
                  className="btn btn-secondary text-xs py-2"
                >
                  Full 365
                </button>
              </div>
            </div>

            {/* Backup & Data Reset */}
            <div className="setting-row">
              <strong className="text-white text-sm">💾 Data Backup &amp; Recovery</strong>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    const payload = {
                      settings,
                      days,
                      backlog,
                      leetcode: leetcodeLogs,
                      aiMl: aiMlLogs,
                      startup: startupLogs,
                      collegeWork: collegeWorkLogs,
                    };
                    const blob = new Blob([JSON.stringify(payload, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `project365-backup-${todayKey}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    setSuccessMsg("Backup downloaded!");
                    setTimeout(() => setSuccessMsg(null), 3000);
                  }}
                  className="btn btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export JSON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm("Reset all local Project365 data?")) return;
                    localStorage.removeItem(KEY);
                    window.location.reload();
                  }}
                  className="btn btn-secondary text-rose-400 text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Local Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODALS & DIALOGS                                          */}
      {/* ────────────────────────────────────────────────────────── */}

      {/* LeetCode Dialog */}
      {activeDialog === "leetcode" && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full p-5 space-y-4 animate-scale-in">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>💻</span>
              <span>Log LeetCode Progress</span>
            </h2>
            <div className="space-y-3">
              <div className="field">
                <label className="text-xs text-slate-400 uppercase font-bold">Problems Solved</label>
                <input
                  type="number"
                  min="1"
                  value={lcSolved}
                  onChange={(e) => setLcSolved(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded p-2 text-white w-full"
                />
              </div>
              <div className="field">
                <label className="text-xs text-slate-400 uppercase font-bold">Notes / Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Dynamic Programming, Two Pointers"
                  value={lcNotes}
                  onChange={(e) => setLcNotes(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded p-2 text-white w-full"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const solvedCount = Number(lcSolved) || 1;
                  const ex = leetcodeLogs[todayKey] || { solved: 0, notes: "" };
                  const updated = {
                    ...leetcodeLogs,
                    [todayKey]: {
                      solved: ex.solved + solvedCount,
                      notes: lcNotes ? `${ex.notes} | ${lcNotes}` : ex.notes,
                    },
                  };
                  setLeetcodeLogs(updated);
                  if (targetSessionForDialog) {
                    applySessionStatus(targetSessionForDialog.id, "completed");
                  }
                  persistClientState(
                    days,
                    backlog,
                    settings,
                    giftsDismissed,
                    timerPause,
                    updated
                  );
                  setActiveDialog(null);
                  setSuccessMsg(`Logged +${solvedCount} LeetCode problem(s)!`);
                  setTimeout(() => setSuccessMsg(null), 3000);
                }}
                className="btn btn-primary text-xs font-bold"
              >
                Save LeetCode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI/ML Dialog */}
      {activeDialog === "aiml" && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full p-5 space-y-4 animate-scale-in">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🤖</span>
              <span>Log AI/ML Deep Work</span>
            </h2>
            <div className="space-y-3">
              <div className="field">
                <label className="text-xs text-slate-400 uppercase font-bold">Hours Invested</label>
                <input
                  type="number"
                  step="0.5"
                  value={aiHours}
                  onChange={(e) => setAiHours(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded p-2 text-white w-full"
                />
              </div>
              <div className="field">
                <label className="text-xs text-slate-400 uppercase font-bold">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. Life OS Engine, RAG Pipeline"
                  value={aiProject}
                  onChange={(e) => setAiProject(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded p-2 text-white w-full"
                />
              </div>
              <div className="field">
                <label className="text-xs text-slate-400 uppercase font-bold">Skills / Models</label>
                <input
                  type="text"
                  placeholder="e.g. Transformers, FastHTML, PyTorch"
                  value={aiSkills}
                  onChange={(e) => setAiSkills(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded p-2 text-white w-full"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const hrs = Number(aiHours) || 2;
                  const ex = aiMlLogs[todayKey] || {
                    hours: 0,
                    modules: 0,
                    coursePercent: 0,
                    projectName: "",
                    skills: "",
                  };
                  const updated = {
                    ...aiMlLogs,
                    [todayKey]: {
                      hours: ex.hours + hrs,
                      modules: ex.modules + (Number(aiModules) || 0),
                      coursePercent: Number(aiPercent) || ex.coursePercent,
                      projectName: aiProject || ex.projectName,
                      skills: aiSkills || ex.skills,
                    },
                  };
                  setAiMlLogs(updated);
                  if (targetSessionForDialog) {
                    applySessionStatus(targetSessionForDialog.id, "completed");
                  }
                  persistClientState(
                    days,
                    backlog,
                    settings,
                    giftsDismissed,
                    timerPause,
                    leetcodeLogs,
                    updated
                  );
                  setActiveDialog(null);
                  setSuccessMsg(`Logged +${hrs}h AI/ML deep work!`);
                  setTimeout(() => setSuccessMsg(null), 3000);
                }}
                className="btn btn-primary text-xs font-bold"
              >
                Save AI/ML
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Startup Dialog */}
      {activeDialog === "startup" && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full p-5 space-y-4 animate-scale-in">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🚀</span>
              <span>Log Startup Execution</span>
            </h2>
            <div className="space-y-3">
              <div className="field">
                <label className="text-xs text-slate-400 uppercase font-bold">Hours Worked</label>
                <input
                  type="number"
                  step="0.5"
                  value={suHours}
                  onChange={(e) => setSuHours(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded p-2 text-white w-full"
                />
              </div>
              <div className="field">
                <label className="text-xs text-slate-400 uppercase font-bold">Key Output / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. User interviews, auth deployment"
                  value={suNotes}
                  onChange={(e) => setSuNotes(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded p-2 text-white w-full"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const hrs = Number(suHours) || 1;
                  const ex = startupLogs[todayKey] || { hours: 0, meeting: false, notes: "" };
                  const updated = {
                    ...startupLogs,
                    [todayKey]: {
                      hours: ex.hours + hrs,
                      meeting: suMeeting === "yes",
                      notes: suNotes || ex.notes,
                    },
                  };
                  setStartupLogs(updated);
                  persistClientState(
                    days,
                    backlog,
                    settings,
                    giftsDismissed,
                    timerPause,
                    leetcodeLogs,
                    aiMlLogs,
                    updated
                  );
                  setActiveDialog(null);
                  setSuccessMsg(`Logged +${hrs}h startup execution!`);
                  setTimeout(() => setSuccessMsg(null), 3000);
                }}
                className="btn btn-primary text-xs font-bold"
              >
                Save Startup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Backlog Modal */}
      {activeDialog === "addBacklog" && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full p-5 space-y-4 animate-scale-in">
            <h2 className="text-lg font-bold text-white flex justify-between items-center">
              <span>📦 Add Backlog Item</span>
              <button onClick={() => setActiveDialog(null)} className="text-slate-400 hover:text-white">✕</button>
            </h2>
            <form onSubmit={handleAddBacklogSubmit} className="space-y-3">
              <div className="field">
                <label>Title</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newBacklogTitle}
                  onChange={(e) => setNewBacklogTitle(e.target.value)}
                  className="input-primary"
                  placeholder="e.g. Draft Patent Architecture"
                />
              </div>
              <div className="field">
                <label>Type / Life Area</label>
                <select
                  value={newBacklogType}
                  onChange={(e) => setNewBacklogType(e.target.value)}
                  className="input-primary"
                >
                  {BASE_SCHEDULE.map(([t, title]) => (
                    <option key={t} value={t as string}>{title as string}</option>
                  ))}
                  <option value="other">Other / Custom</option>
                </select>
              </div>
              <div className="field">
                <label>Dependencies (Required Before Starting)</label>
                <select
                  multiple
                  value={newBacklogDeps}
                  onChange={(e) => {
                    const vals = Array.from(e.target.selectedOptions, o => o.value);
                    setNewBacklogDeps(vals);
                  }}
                  className="input-primary h-24 text-xs"
                >
                  {backlog.filter(b => b.status === "pending").map(b => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Hold Ctrl/Cmd to select multiple.</p>
              </div>
              <button type="submit" className="btn-primary w-full py-2.5">
                Add to Backlog
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Reality Gatekeeper Modal */}
      {activeDialog === "addTask" && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full p-5 space-y-4 animate-scale-in">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>+</span>
              <span>Schedule New Task (Reality Checked)</span>
            </h2>
            <form onSubmit={handleCreateServerTask} className="space-y-3">
              <div className="field">
                <label className="text-xs text-slate-400 uppercase font-bold">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Review Distributed Locks"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="bg-slate-800 border border-slate-700 rounded p-2 text-white w-full text-xs"
                />
              </div>

              <div className="field">
                <label className="text-xs text-slate-400 uppercase font-bold">Duration (Minutes)</label>
                <input
                  type="number"
                  step="15"
                  min="15"
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  required
                  className="bg-slate-800 border border-slate-700 rounded p-2 text-white w-full text-xs"
                />
              </div>

              {capacity && newDuration > capacity.remainingMinutes && (
                <div className="p-2.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                  ⚠️ <strong>Over Capacity!</strong> Exceeds available discretionary buffer (
                  {capacity.remainingMinutes}m left).
                  <label className="flex items-center gap-2 mt-1.5 cursor-pointer text-white font-bold">
                    <input
                      type="checkbox"
                      checked={forceOverride}
                      onChange={(e) => setForceOverride(e.target.checked)}
                      className="rounded"
                    />
                    Force override human buffer
                  </label>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveDialog(null)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs font-bold">
                  Schedule Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* College Attendance Dialog */}
      {activeDialog === "collegeAttendance" && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full p-5 space-y-4 animate-scale-in">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🎓</span>
              <span>College Attendance Check</span>
            </h2>
            <p className="text-xs text-slate-300">
              Did you physically attend college lectures and labs today?
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDays((prev) => {
                    const d = prev[todayKey];
                    if (!d) return prev;
                    const updated = {
                      ...prev,
                      [todayKey]: { ...d, isHomeDay: true, collegeAttended: false },
                    };
                    persistClientState(updated);
                    return updated;
                  });
                  setActiveDialog(null);
                  setSuccessMsg("🏠 Recorded as Home Day! Backlog unlocked.");
                  setTimeout(() => setSuccessMsg(null), 3000);
                }}
                className="btn btn-secondary text-rose-400 text-xs py-2 font-bold"
              >
                No, I'm Home
              </button>
              <button
                type="button"
                onClick={() => {
                  setDays((prev) => {
                    const d = prev[todayKey];
                    if (!d) return prev;
                    const updated = {
                      ...prev,
                      [todayKey]: { ...d, isHomeDay: false, collegeAttended: true },
                    };
                    persistClientState(updated);
                    return updated;
                  });
                  setActiveDialog(null);
                  setSuccessMsg("🎓 College attendance recorded!");
                  setTimeout(() => setSuccessMsg(null), 3000);
                }}
                className="btn btn-primary text-xs py-2 font-bold"
              >
                Yes, Attended
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* BOTTOM 5-TAB STICKY NAVIGATION                            */}
      {/* ────────────────────────────────────────────────────────── */}
      <nav className="bottom-nav">
        <button
          type="button"
          className={`nav-button ${activeTab === "today" ? "active" : ""}`}
          onClick={() => setActiveTab("today")}
        >
          <span className="nav-icon">📋</span>
          <span>Today</span>
          <span className="nav-dot" />
        </button>
        <button
          type="button"
          className={`nav-button ${activeTab === "backlog" ? "active" : ""}`}
          onClick={() => setActiveTab("backlog")}
        >
          <span className="nav-icon">📦</span>
          <span>Backlog</span>
          <span className="nav-dot" />
        </button>
        <button
          type="button"
          className={`nav-button ${activeTab === "hours" ? "active" : ""}`}
          onClick={() => setActiveTab("hours")}
        >
          <span className="nav-icon">⏱️</span>
          <span>Hours</span>
          <span className="nav-dot" />
        </button>
        <button
          type="button"
          className={`nav-button ${activeTab === "calendar" ? "active" : ""}`}
          onClick={() => setActiveTab("calendar")}
        >
          <span className="nav-icon">📅</span>
          <span>Calendar</span>
          <span className="nav-dot" />
        </button>
        <button
          type="button"
          className={`nav-button ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <span className="nav-icon">⚙️</span>
          <span>Settings</span>
          <span className="nav-dot" />
        </button>
      </nav>
    </main>
  );
}
