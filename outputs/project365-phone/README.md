# Project365 — 365 Day Discipline Tracker

A premium, offline-first discipline tracker that enforces strict time-based routine adherence across 365 days.

## Features

- **Dual Timers**: Master day timer (6 AM → 1 AM) + active session timer, both live-updating
- **Time-Locked Sessions**: Can only submit a session during its scheduled window — no cheating
- **Auto-Expiry**: Missed sessions automatically move to backlog
- **Backlog Rules**: Backlog can only be cleared on Sundays or Home Days
- **College Attendance**: Dialog checks if you attended; "No" unlocks backlog access
- **Workshop Mode**: Pause routine during events without generating false backlog
- **Notifications**: Day start, session start, and 5-minute expiry warnings
- **Hours Tracking**: Total / completed / remaining hours per session type
- **Calendar View**: Monthly backlog heatmap with day-detail drill-down
- **Daily Surprise Gift**: Motivational quotes + milestone celebrations
- **Daily Review**: Auto-generated summary of completed / missed / pending sessions
- **Discipline Score**: 0–100 daily score + consecutive day streak
- **Dark Glassmorphism UI**: Premium design with glow effects and micro-animations

## Screens

| Tab | Description |
|-----|-------------|
| Today | Dashboard with timers, current session, gift, metrics, review |
| Backlog | Pending/completed backlog with urgency levels |
| Hours | Session hours tracker (done / backlog / remaining) |
| Calendar | Monthly grid with backlog color-coding |
| Settings | Start date, notifications, workshop mode, backup |

## Open On This Computer

Open `index.html` directly in your browser.

## Serve Locally (for phone access)

```powershell
python -m http.server 4173 --bind 0.0.0.0
```

Then find your IP (`ipconfig`) and open `http://YOUR_IP:4173` on your phone.

## Install on Android

1. Open in Chrome on your phone
2. Menu → Add to Home Screen
3. App works offline after first load

## Data

- Stored in browser `localStorage`
- Use **Settings → Export** regularly to back up
- Use **Settings → Import** to restore

## Schedule

| Session | Time |
|---------|------|
| Morning Routine | 06:00 – 07:00 |
| Breakfast + Prayer | 07:00 – 07:20 |
| College | 09:00 – 15:00 |
| College Work | 18:00 – 20:30 |
| Dinner | 20:30 – 21:00 |
| Walking | 21:00 – 21:30 |
| AI/ML | 21:30 – 23:30 |
| LeetCode | 23:30 – 01:00 |

## Tech Stack

- Vanilla HTML / CSS / JavaScript
- No framework, no backend, no login
- Service Worker for offline caching
- Web Notifications API
- localStorage for persistence
