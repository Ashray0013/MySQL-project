# 🚀 Smart Campus — Optimization Report

A comprehensive review of [server.js](file:///c:/Users/Samsung/Desktop/MySql-proj/server.js) and the frontend HTML pages.

---

## 1. 🔴 Critical Security Issues

### 1.1 No Authentication / Authorization Middleware

Your API has **zero authentication**. Any person who knows the endpoint can call it. The `userId` is trusted straight from `req.body` / `req.params`, so anyone can impersonate any user.

> [!CAUTION]
> You already have `jsonwebtoken` in `package.json` but never use it. Every mutating endpoint is wide open.

**Fix:** Add JWT middleware and protect all routes.

```js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-strong-secret';

// Middleware
function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// Usage
app.get('/api/profile/:userId', authenticate, (req, res) => { ... });
```

### 1.2 Hardcoded Database Credentials

```js
// ❌ Current — line 12-18
const db = mysql.createConnection({
    host: '0.0.0.0',
    user: 'root',
    password: 'root',
    ...
});
```

**Fix:** Use environment variables via `dotenv`.

```js
require('dotenv').config();
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});
```

### 1.3 No Input Validation / Sanitization

Endpoints trust whatever the client sends. There's no length check, format validation, or sanitization on fields like `email`, `bio`, `title`, etc.

**Fix:** Add a validation library like `express-validator` or `joi`.

```js
const { body, validationResult } = require('express-validator');

app.post('/api/signup', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('roll_no').notEmpty().trim(),
    body('first_name').notEmpty().trim().escape(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    // ...proceed
});
```

### 1.4 SQL Injection via Search — `multipleStatements: true`

```js
// ❌ Line 17 — this enables batch injection attacks if any query is ever built unsafely
multipleStatements: true
```

**Fix:** Remove `multipleStatements: true`. You don't use multi-statement queries anywhere.

---

## 2. ⚡ Database & Performance

### 2.1 Single Connection → Connection Pool

You use `mysql.createConnection()` which opens **one** connection. Under concurrent load, all requests queue behind each other. If the connection drops, the server crashes.

> [!IMPORTANT]
> This is the single biggest performance bottleneck in your app.

**Fix:**

```js
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
// Use pool.promise() for async/await
const db = pool.promise();
```

### 2.2 Callback Hell → async/await with Promises

Almost every endpoint has 3-5 levels of nested callbacks. This is hard to read, debug, and error-handle.

**Before** (lines 90-142 — **52 lines**, 3 nested queries):
```js
app.get('/api/profile/:userId', (req, res) => {
    db.query(userSql, [userId], (err, userResults) => {
        db.query(clubsSql, [userId], (err, clubsResults) => {
            db.query(eventsSql, [userId, userId, userId], (err, eventsResults) => {
                res.json({ ... });
            });
        });
    });
});
```

**After** (clean, flat, ~20 lines):
```js
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const [users] = await db.query(userSql, [req.params.userId]);
        if (!users.length) return res.status(404).json({ error: 'User not found' });

        const [clubs] = await db.query(clubsSql, [req.params.userId]);
        const [events] = await db.query(eventsSql, [req.params.userId, req.params.userId, req.params.userId]);

        res.json({ ...users[0], clubs, events, club_count: clubs.length, event_count: events.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
```

### 2.3 Parallelize Independent Queries

When multiple queries don't depend on each other, run them in parallel with `Promise.all()`.

```js
// Profile endpoint — 3 independent queries
const [[users], [clubs], [events]] = await Promise.all([
    db.query(userSql, [userId]),
    db.query(clubsSql, [userId]),
    db.query(eventsSql, [userId, userId, userId])
]);
```

This can cut response time by **2-3x** for endpoints like `/api/profile`, `/api/clubs/:clubId`, `/api/fests/:festId`, `/api/stats/:userId`.

### 2.4 Missing Database Indexes

Queries filter on `club_members.user_id`, `club_members.club_id`, `event_registrations.user_id`, `event_registrations.event_id`, `events.club_id`, `events.fest_id`, `events.date_time`. If these don't have indexes, every query does a full table scan.

**Fix:** Add composite indexes:

```sql
ALTER TABLE club_members ADD INDEX idx_cm_user (user_id);
ALTER TABLE club_members ADD INDEX idx_cm_club (club_id);
ALTER TABLE event_registrations ADD INDEX idx_er_user_event (user_id, event_id);
ALTER TABLE event_registrations ADD INDEX idx_er_event (event_id);
ALTER TABLE events ADD INDEX idx_events_club (club_id);
ALTER TABLE events ADD INDEX idx_events_fest (fest_id);
ALTER TABLE events ADD INDEX idx_events_datetime (date_time);
ALTER TABLE users ADD INDEX idx_users_email (email);
```

### 2.5 Duplicate & Redundant Queries

Several endpoints perform nearly identical logic:

| Redundant Pair | Lines |
|---|---|
| `/api/club-activities/:clubId` == `/api/events/club/:clubId` | 238-254 vs 656-676 |
| `/api/profile/:userId` duplicates `/api/visit-profile/:userId` | 90-142 vs 1162-1277 |
| Members query in `/api/clubs/:clubId` == `/api/club-members/:clubId` | 184-197 vs 954-967 |

**Fix:** Consolidate into shared query helpers or reuse endpoint handlers.

---

## 3. 🏗️ Code Architecture

### 3.1 Split the Monolith (1,296 lines → modular files)

[server.js](file:///c:/Users/Samsung/Desktop/MySql-proj/server.js) is a single 1,296-line file with everything mixed together.

**Recommended structure:**
```
├── server.js              # App setup, middleware, listen
├── config/
│   └── db.js              # Pool creation + export
├── middleware/
│   └── auth.js            # JWT auth middleware
├── routes/
│   ├── auth.js            # /api/signup, /api/login
│   ├── users.js           # /api/profile, /api/visit-profile
│   ├── clubs.js           # /api/clubs, /api/joinClub, etc.
│   ├── events.js          # /api/events, /api/events/register, etc.
│   ├── fests.js           # /api/fests
│   └── search.js          # /api/search
```

### 3.2 Centralized Error Handling

Every endpoint has its own `if (err) return res.status(500).json(...)` pattern (repeated **50+ times**). Add a global error handler:

```js
// Global async handler wrapper
const asyncHandler = (fn) => (req, res, next) => 
    Promise.resolve(fn(req, res, next)).catch(next);

// Global error middleware (add at the end)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ 
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message 
    });
});
```

### 3.3 Remove Excessive `console.log` Statements

There are **20+** `console.log` calls scattered throughout. Use a proper logger like `winston` or `pino` with log levels.

---

## 4. 🔌 API Design Issues

### 4.1 Inconsistent Route Naming

| Current (Inconsistent) | Suggested (RESTful) |
|---|---|
| `POST /api/joinClub` | `POST /api/clubs/:clubId/members` |
| `DELETE /api/leaveClub` | `DELETE /api/clubs/:clubId/members/:userId` |
| `POST /api/events/register` | `POST /api/events/:eventId/registrations` |
| `DELETE /api/register` | `DELETE /api/events/:eventId/registrations/:userId` |
| `PUT /api/events/attendance` | `PATCH /api/events/:eventId/registrations/:userId` |
| `PUT /api/club-members/position` | `PATCH /api/clubs/:clubId/members/:userId` |

### 4.2 DELETE Endpoints Using `req.body`

`DELETE /api/leaveClub` and `DELETE /api/register` read from `req.body`. Many HTTP clients and proxies strip the body from DELETE requests.

**Fix:** Use URL parameters instead: `DELETE /api/clubs/:clubId/members/:userId`

### 4.3 No Rate Limiting

Any client can spam your API. Add `express-rate-limit`:

```js
const rateLimit = require('express-rate-limit');
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
```

### 4.4 CORS Hardcoded to One Origin

```js
// ❌ Line 7
app.use(cors({ origin: 'http://127.0.0.1:5500', credentials: true }));
```

This will break in production. Use environment variables.

---

## 5. 🎨 Frontend Optimizations

### 5.1 Inline CSS → External Stylesheet

Every HTML file has **500+ lines** of CSS duplicated inline. Extract to a shared `styles.css` file. This enables browser caching and reduces page sizes by ~60%.

### 5.2 No Content Security Policy

Add CSP headers to prevent XSS:

```js
const helmet = require('helmet');
app.use(helmet());
```

### 5.3 Static File Serving

You're serving HTML from a separate file server (Live Server at `127.0.0.1:5500`). Consider serving static files from Express:

```js
app.use(express.static('public'));
```

---

## 6. 🚀 Production Readiness

### 6.1 No Graceful Shutdown

If the server crashes, the DB connection leaks. Add shutdown handlers:

```js
process.on('SIGTERM', () => {
    console.log('Shutting down...');
    pool.end(() => process.exit(0));
});
```

### 6.2 No Request Logging

Add `morgan` for HTTP request logging:

```js
const morgan = require('morgan');
app.use(morgan('combined'));
```

### 6.3 Unused Dependency

`"cros": "^1.1.0"` in [package.json](file:///c:/Users/Samsung/Desktop/MySql-proj/package.json) — this is likely a typo of `cors` and is unused. Remove it.

---

## Priority Roadmap

| Priority | Item | Impact | Effort |
|---|---|---|---|
| 🔴 P0 | Connection Pool (2.1) | Prevents crashes under load | 10 min |
| 🔴 P0 | JWT Authentication (1.1) | All routes are unprotected | 1 hr |
| 🔴 P0 | Environment variables (1.2) | Leaked credentials | 15 min |
| 🔴 P0 | Remove `multipleStatements` (1.4) | SQL injection risk | 1 min |
| 🟡 P1 | async/await refactor (2.2+2.3) | 2-3x faster responses | 2 hrs |
| 🟡 P1 | Database indexes (2.4) | Faster queries at scale | 15 min |
| 🟡 P1 | Input validation (1.3) | Prevents bad data | 1 hr |
| 🟢 P2 | Modularize routes (3.1) | Maintainability | 2 hrs |
| 🟢 P2 | External CSS (5.1) | Page load speed | 1 hr |
| 🟢 P2 | Rate limiting (4.3) | DDoS prevention | 10 min |

---

> [!TIP]
> The **highest-ROI change** you can make right now is switching from `mysql.createConnection()` to `mysql.createPool().promise()` and converting a few key endpoints to `async/await`. This alone will make your server significantly more robust and your code much cleaner.

Would you like me to implement any of these changes?
