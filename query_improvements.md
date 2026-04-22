# ⚡ Query Optimization & Refactoring Showcase

To showcase how we reduce query resolution time and eliminate runtime bottlenecks during heavy loads, I have refactored one of the heaviest endpoints in your application: the `/api/profile/:userId` endpoint. 

## The Problem: Callback Hell & Waterfalling

Previously, your queries were nested inside **Callbacks**, leading to a waterfall execution structure:
1. Fetch User Data -> Wait for completion.
2. Fetch User Clubs -> Wait for completion.
3. Fetch User Events -> Wait for completion.

Because node natively executes things synchronously in a callback nesting (`db.query(..., (err, res) => { db.query(...) })`), these three independent queries were forced to execute one after the other. Total resolution time = Time(Query A) + Time(Query B) + Time(Query C).

## The Solution: Async/Await & `Promise.all()`

By enabling the `promise()` wrapper on our MySQL pool (`const dbPromise = db.promise()`), we can rewrite the database calls into sleek, modern, non-blocking `async/await` syntax. 

Even better, since the User, Club, and Event data do **not** depend on each other (they all just depend on `userId`), we can fire all three queries at the exact same time into the database pipeline using **`Promise.all()`**.

### Code Comparison

#### ❌ Before: Nested Callbacks (Waterfall)
```javascript
app.get('/api/profile/:userId', (req, res) => {
    // Query 1 starts
    db.query(userSql, [userId], (err, userResults) => {
        // Query 2 waits for Query 1
        db.query(clubsSql, [userId], (err, clubsResults) => {
            // Query 3 waits for Query 2
            db.query(eventsSql, [userId], (err, eventsResults) => {
                res.json({ ...userResults[0], clubsResults, eventsResults });
            });
        });
    });
});
```

#### ✅ After: Parallel Promise Resolution (Optimized)
```javascript
app.get('/api/profile/:userId', async (req, res) => {
    try {
        // Fire all 3 queries to the DB Engine simultaneously!
        const [ [users], [clubs], [events] ] = await Promise.all([
            dbPromise.query(userSql, [userId]),
            dbPromise.query(clubsSql, [userId]),
            dbPromise.query(eventsSql, [userId, userId, userId])
        ]);

        if (users.length === 0) return res.status(404).json({ error: "User not found" });

        res.json({
            ...users[0],
            clubs: clubs,
            events: events,
            club_count: clubs.length,
            event_count: events.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
```

> [!TIP]
> Combined with the B-Tree indexes you created (like `idx_cm_user` and `idx_events_datetime`), running these targeted queries concurrently reduces response times by up to **3x**, entirely eliminating the N+1 waiting issues and producing much cleaner, maintainable code!
