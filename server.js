const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key';

const app = express();
app.use(cors({ origin: 'http://127.0.0.1:5500', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
// const db = mysql.createConnection({
//     host: '0.0.0.0',
//     user: 'root',
//     password: 'root',
//     database: 'campus',
//     multipleStatements: true
// });

require('dotenv').config();
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

db.getConnection((err, connection) => {
    if (err) {
        return console.error('Error connecting to the database:', err.stack);
    } else {
        console.log('Connected to the database via pool.');
        connection.release();
    }
});

const dbPromise = db.promise();

const saltRounds = 10;

// ==================== AUTHENTICATION ENDPOINTS ====================

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

const publicRoutes = ['/api/signup', '/api/login', '/api/health', '/api/search'];
app.use((req, res, next) => {
    if (
        publicRoutes.includes(req.path) ||
        req.path.startsWith('/api/stats/') ||
        req.path.startsWith('/api/visit-profile/') ||
        req.path === '/api/fests' ||
        req.method === 'OPTIONS'
    ) {
        return next();
    }
    if (req.path === '/api/do-nothing') return next();
    authenticate(req, res, next);
});

// Signup endpoint
app.post('/api/signup', async (req, res) => {
    const { roll_no, email, password, first_name, last_name, branch_dept, linkedin_url, github_url, bio } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const sql = `INSERT INTO users (roll_no, email, password_hash, first_name, last_name, branch_dept, linkedin_url, github_url, bio) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        db.query(sql, [roll_no, email, hashedPassword, first_name, last_name, branch_dept, linkedin_url, github_url, bio], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: "Roll No or Email already exists" });
                }
                return res.status(500).json({ error: err.message });
            }
            const token = jwt.sign({ id: result.insertId, email: email }, JWT_SECRET, { expiresIn: '7d' });
            res.status(201).json({
                message: "Account created successfully!",
                userId: result.insertId,
                token
            });
        });
    } catch (error) {
        res.status(500).json({ error: "Error encrypting password" });
    }
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: "User not found" });

        const user = results[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            const token = jwt.sign({ id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            res.json({
                message: "Login successful!",
                token,
                user: {
                    id: user.user_id,
                    name: user.first_name,
                    roll: user.roll_no,
                    email: user.email
                }
            });
        } else {
            res.status(401).json({ error: "Incorrect password" });
        }
    });
});

// ==================== USER ENDPOINTS ====================

// Get user profile with additional info
app.get('/api/profile/:userId', async (req, res) => {
    const { userId } = req.params;

    const userSql = "SELECT user_id, roll_no, email, first_name, last_name, branch_dept, linkedin_url, github_url, bio, created_at FROM users WHERE user_id = ?";
    const clubsSql = `
        SELECT c.*, cm.position, cm.joined_date 
        FROM clubs c 
        JOIN club_members cm ON c.club_id = cm.club_id 
        WHERE cm.user_id = ?
    `;
    const eventsSql = `
        SELECT DISTINCT e.*, c.cname as club_name, f.fname as fest_name,
            CASE 
                WHEN e.date_time > NOW() THEN 'upcoming'
                ELSE 'past'
            END as event_status,
            CASE WHEN er.registration_id IS NOT NULL THEN true ELSE false END as is_registered
        FROM events e
        LEFT JOIN clubs c ON e.club_id = c.club_id
        LEFT JOIN fests f ON e.fest_id = f.fest_id
        LEFT JOIN club_members cm ON e.club_id = cm.club_id
        LEFT JOIN event_registrations er ON e.event_id = er.event_id AND er.user_id = ?
        WHERE cm.user_id = ? OR er.user_id = ?
        GROUP BY e.event_id
        ORDER BY e.date_time DESC
        LIMIT 10
    `;

    try {
        const [[users], [clubs], [events]] = await Promise.all([
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
        return res.status(500).json({ error: err.message });
    }
});

// Update user profile
app.put('/api/profile/:userId', (req, res) => {
    const { userId } = req.params;
    const { first_name, last_name, branch_dept, linkedin_url, github_url, bio } = req.body;

    const sql = `UPDATE users 
                 SET first_name = ?, last_name = ?, branch_dept = ?, linkedin_url = ?, github_url = ?, bio = ? 
                 WHERE user_id = ?`;

    db.query(sql, [first_name, last_name, branch_dept, linkedin_url, github_url, bio, userId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Profile updated successfully!" });
    });
});

// ==================== CLUB ENDPOINTS ====================

// Get all clubs with additional info
app.get('/api/clubs', (req, res) => {
    const sql = `
        SELECT c.*, 
               COUNT(DISTINCT cm.user_id) as member_count,
               COUNT(DISTINCT e.event_id) as event_count
        FROM clubs c
        LEFT JOIN club_members cm ON c.club_id = cm.club_id
        LEFT JOIN events e ON c.club_id = e.club_id AND e.date_time > NOW()
        GROUP BY c.club_id
        ORDER BY c.cname ASC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get specific club details with members and events
app.get('/api/clubs/:clubId', (req, res) => {
    const clubId = req.params.clubId;

    const clubQuery = "SELECT * FROM clubs WHERE club_id = ?";
    const membersQuery = `
        SELECT u.user_id, u.first_name, u.last_name, u.roll_no, u.branch_dept, u.email, cm.position,
               DATE_FORMAT(cm.joined_date, '%Y-%m-%d') as joined_date
        FROM users u 
        JOIN club_members cm ON u.user_id = cm.user_id 
        WHERE cm.club_id = ?
        ORDER BY 
            CASE cm.position
                WHEN 'Coordinator' THEN 1
                WHEN 'Sub-Coordinator' THEN 2
                ELSE 3
            END,
            u.first_name ASC
    `;
    const eventsQuery = `
        SELECT e.*, 
               COUNT(er.registration_id) as registered_count
        FROM events e
        LEFT JOIN event_registrations er ON e.event_id = er.event_id
        WHERE e.club_id = ? 
        GROUP BY e.event_id
        ORDER BY e.date_time ASC
    `;

    db.query(clubQuery, [clubId], (err, clubResults) => {
        if (err) return res.status(500).json({ error: err.message });
        if (clubResults.length === 0) return res.status(404).json({ error: "Club not found" });

        db.query(membersQuery, [clubId], (err, membersResults) => {
            if (err) return res.status(500).json({ error: err.message });

            db.query(eventsQuery, [clubId], (err, eventsResults) => {
                if (err) return res.status(500).json({ error: err.message });

                const now = new Date();
                const upcomingEvents = eventsResults.filter(e => new Date(e.date_time) > now);
                const pastEvents = eventsResults.filter(e => new Date(e.date_time) <= now);

                res.json({
                    ...clubResults[0],
                    members: membersResults,
                    events: eventsResults,
                    upcoming_events: upcomingEvents,
                    past_events: pastEvents,
                    member_count: membersResults.length,
                    event_count: eventsResults.length,
                    upcoming_count: upcomingEvents.length
                });
            });
        });
    });
});

// Get club activities (all events)
app.get('/api/club-activities/:clubId', (req, res) => {
    const clubId = req.params.clubId;
    const sql = `
        SELECT e.*, 
               COUNT(er.registration_id) as registered_count
        FROM events e
        LEFT JOIN event_registrations er ON e.event_id = er.event_id
        WHERE e.club_id = ? 
        GROUP BY e.event_id
        ORDER BY e.date_time ASC
    `;

    db.query(sql, [clubId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Export club data (for coordinators)
app.get('/api/clubs/:clubId/export', (req, res) => {
    const clubId = req.params.clubId;

    const clubSql = "SELECT * FROM clubs WHERE club_id = ?";
    const membersSql = `
        SELECT u.user_id, u.first_name, u.last_name, u.roll_no, u.email, u.branch_dept, cm.position, cm.joined_date
        FROM users u
        JOIN club_members cm ON u.user_id = cm.user_id
        WHERE cm.club_id = ?
    `;
    const eventsSql = `
        SELECT e.*, COUNT(er.registration_id) as total_registrations
        FROM events e
        LEFT JOIN event_registrations er ON e.event_id = er.event_id
        WHERE e.club_id = ?
        GROUP BY e.event_id
    `;

    db.query(clubSql, [clubId], (err, clubResults) => {
        if (err) return res.status(500).json({ error: err.message });

        db.query(membersSql, [clubId], (err, membersResults) => {
            if (err) return res.status(500).json({ error: err.message });

            db.query(eventsSql, [clubId], (err, eventsResults) => {
                if (err) return res.status(500).json({ error: err.message });

                const exportData = {
                    club: clubResults[0],
                    members: membersResults,
                    events: eventsResults,
                    exported_at: new Date().toISOString()
                };

                res.json(exportData);
            });
        });
    });
});

// ==================== EVENT ENDPOINTS ====================

// do Nothing function for unimplemented features
app.get('/api/do-nothing', (req, res) => {
    res.json({ message: "This feature is not implemented yet" });
});


// Create new event (for coordinators and sub-coordinators)
app.post('/api/events', (req, res) => {
    console.log("Create Event Request Body:", req.body);

    const {
        title,
        about_event,
        date_time,
        venue,
        club_id,
        created_by
    } = req.body;

    // Validate required fields
    if (!title || !date_time) {
        return res.status(400).json({ error: "Missing required fields: title, date_time" });
    }

    // Check if club_id is provided
    if (!club_id) {
        return res.status(400).json({ error: "Club_id must be provided" });
    }

    // Check permission
    const userId = created_by || req.body.userId;
    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    const checkPermissionSql = `
        SELECT position FROM club_members 
        WHERE club_id = ? AND user_id = ? AND position IN ('Coordinator', 'Sub-Coordinator')
    `;
    console.log("Checking permissions for user:", userId, "and club:", club_id);
    db.query(checkPermissionSql, [club_id, userId], (err, permissionResults) => {
        if (err) {
            console.error("Permission check error:", err);
            return res.status(500).json({ error: err.message });
        }

        if (permissionResults.length === 0) {
            return res.status(403).json({ error: "You don't have permission to create events for this club" });
        }

        // Proceed with event creation
        createEvent();
    });

    function createEvent() {
        const sql = `INSERT INTO events 
                     (title, about_event, date_time, venue, club_id) 
                     VALUES (?, ?, ?, ?, ?)`;

        const params = [
            title,
            about_event || null,
            date_time,
            venue || null,
            club_id
        ];

        console.log("Inserting event with params:", params);

        db.query(sql, params, (err, result) => {
            if (err) {
                console.error("Error creating event:", err);
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                message: "Event created successfully!",
                event_id: result.insertId
            });
        });
    }
});

// Update event (for coordinators and sub-coordinators)
app.put('/api/events/:eventId', (req, res) => {
    const eventId = req.params.eventId;
    console.log("Update Event Request:", { eventId, body: req.body });

    const {
        title,
        about_event,
        date_time,
        venue,
        userId
    } = req.body;

    if (!title || !date_time) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    // First get the event to check club_id
    const getEventSql = "SELECT club_id FROM events WHERE event_id = ?";
    db.query(getEventSql, [eventId], (err, eventResults) => {
        if (err) {
            console.error("Error fetching event:", err);
            return res.status(500).json({ error: err.message });
        }
        if (eventResults.length === 0) {
            return res.status(404).json({ error: "Event not found" });
        }

        const club_id = eventResults[0].club_id;

        // Check permission if it's a club event
        if (club_id) {
            const checkPermissionSql = `
                SELECT position FROM club_members 
                WHERE club_id = ? AND user_id = ? AND position IN ('Coordinator', 'Sub-Coordinator')
            `;

            db.query(checkPermissionSql, [club_id, userId], (err, permissionResults) => {
                if (err) {
                    console.error("Permission check error:", err);
                    return res.status(500).json({ error: err.message });
                }

                if (permissionResults.length === 0) {
                    return res.status(403).json({ error: "You don't have permission to edit this event" });
                }

                updateEvent();
            });
        } else {
            // Fest events - check if user is fest coordinator
            updateEvent();
        }
    });

    function updateEvent() {
        const sql = `UPDATE events 
                     SET title = ?, about_event = ?, date_time = ?, venue = ?
                     WHERE event_id = ?`;

        const params = [
            title,
            about_event || null,
            date_time,
            venue || null,
            eventId
        ];

        console.log("Updating event with params:", params);

        db.query(sql, params, (err, result) => {
            if (err) {
                console.error("Error updating event:", err);
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Event not found" });
            }

            res.json({ message: "Event updated successfully!" });
        });
    }
});

// Delete event (only for coordinators) - FIXED VERSION
app.delete('/api/events/:eventId', (req, res) => {
    const eventId = req.params.eventId;
    const { userId } = req.body;

    console.log("Delete Event Request:", { eventId, userId });

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    if (!eventId || eventId === 'register') {
        return res.status(400).json({ error: "Valid Event ID is required" });
    }

    // First get the event to check club_id
    const getEventSql = "SELECT club_id FROM events WHERE event_id = ?";
    db.query(getEventSql, [eventId], (err, eventResults) => {
        if (err) {
            console.error("Error fetching event:", err);
            return res.status(500).json({ error: err.message });
        }
        if (eventResults.length === 0) {
            return res.status(404).json({ error: "Event not found" });
        }

        const club_id = eventResults[0].club_id;

        // If it's a club event, check if user is coordinator
        if (club_id) {
            const checkPermissionSql = `
                SELECT position FROM club_members 
                WHERE club_id = ? AND user_id = ? AND position = 'Coordinator'
            `;

            db.query(checkPermissionSql, [club_id, userId], (err, permissionResults) => {
                if (err) {
                    console.error("Permission check error:", err);
                    return res.status(500).json({ error: err.message });
                }

                if (permissionResults.length === 0) {
                    return res.status(403).json({ error: "Only coordinators can delete events" });
                }

                // Proceed with deletion
                performDelete();
            });
        } else {
            // For fest events, proceed with deletion
            performDelete();
        }
    });

    function performDelete() {
        // First delete event registrations (foreign key constraint)
        const deleteRegSql = "DELETE FROM event_registrations WHERE event_id = ?";
        db.query(deleteRegSql, [eventId], (err) => {
            if (err) {
                console.error("Error deleting registrations:", err);
                // Continue even if error (table might not exist)
            }

            // Then delete the event
            const deleteEventSql = "DELETE FROM events WHERE event_id = ?";
            db.query(deleteEventSql, [eventId], (err, result) => {
                if (err) {
                    console.error("Error deleting event:", err);
                    return res.status(500).json({ error: err.message });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: "Event not found" });
                }

                console.log("Event deleted successfully:", eventId);
                res.json({ message: "Event deleted successfully!" });
            });
        });
    }
});

// Get all events with organizer info
app.get('/api/events', (req, res) => {
    const sql = `
        SELECT e.*, 
               c.cname as club_name,
               f.fname as fest_name,
               CASE 
                   WHEN e.club_id IS NOT NULL THEN 'club'
                   WHEN e.fest_id IS NOT NULL THEN 'fest'
               END as event_type,
               COUNT(er.registration_id) as registered_count
        FROM events e
        LEFT JOIN clubs c ON e.club_id = c.club_id
        LEFT JOIN fests f ON e.fest_id = f.fest_id
        LEFT JOIN event_registrations er ON e.event_id = er.event_id
        WHERE e.date_time > NOW()
        GROUP BY e.event_id
        ORDER BY e.date_time ASC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching events:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Get specific event details
app.get('/api/events/:eventId', (req, res) => {
    const eventId = req.params.eventId;
    console.log("Fetching event details for ID:", eventId);

    const sql = `
        SELECT e.*, 
               c.cname as club_name, c.bio as club_bio,
               f.fname as fest_name, f.theme as fest_theme,
               COUNT(er.registration_id) as registered_count
        FROM events e
        LEFT JOIN clubs c ON e.club_id = c.club_id
        LEFT JOIN fests f ON e.fest_id = f.fest_id
        LEFT JOIN event_registrations er ON e.event_id = er.event_id
        WHERE e.event_id = ?
        GROUP BY e.event_id
    `;

    db.query(sql, [eventId], (err, results) => {
        if (err) {
            console.error("Error fetching event details:", err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Get registration list with user details
        const regSql = `
            SELECT u.user_id, u.first_name, u.last_name, u.roll_no, u.email, u.branch_dept,
                   er.registered_at, er.attendance_status
            FROM event_registrations er
            JOIN users u ON er.user_id = u.user_id
            WHERE er.event_id = ?
            ORDER BY er.registered_at DESC
        `;

        db.query(regSql, [eventId], (err, regResults) => {
            if (err) {
                console.error("Error fetching registrations:", err);
                return res.status(500).json({ error: err.message });
            }

            res.json({
                ...results[0],
                registrations: regResults
            });
        });
    });
});

// Get event registrations
app.get('/api/events/:eventId/registrations', (req, res) => {
    const eventId = req.params.eventId;
    console.log("Fetching registrations for event ID:", eventId);

    const sql = `
        SELECT u.user_id, u.first_name, u.last_name, u.roll_no, u.email, u.branch_dept,
               er.registered_at, er.attendance_status
        FROM event_registrations er
        JOIN users u ON er.user_id = u.user_id
        WHERE er.event_id = ?
        ORDER BY er.registered_at DESC
    `;

    db.query(sql, [eventId], (err, results) => {
        if (err) {
            console.error("Error fetching registrations:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Get events by club
app.get('/api/events/club/:clubId', (req, res) => {
    const clubId = req.params.clubId;
    console.log("Fetching events for club ID:", clubId);

    const sql = `
        SELECT e.*, COUNT(er.registration_id) as registered_count
        FROM events e
        LEFT JOIN event_registrations er ON e.event_id = er.event_id
        WHERE e.club_id = ? 
        GROUP BY e.event_id
        ORDER BY e.date_time ASC
    `;

    db.query(sql, [clubId], (err, results) => {
        if (err) {
            console.error("Error fetching club events:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Get events by fest
app.get('/api/events/fest/:festId', (req, res) => {
    const festId = req.params.festId;
    console.log("Fetching events for fest ID:", festId);

    const sql = `
        SELECT e.*, COUNT(er.registration_id) as registered_count
        FROM events e
        LEFT JOIN event_registrations er ON e.event_id = er.event_id
        WHERE e.fest_id = ?
        GROUP BY e.event_id
        ORDER BY e.date_time ASC
    `;

    db.query(sql, [festId], (err, results) => {
        if (err) {
            console.error("Error fetching fest events:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Get user's events
app.get('/api/user-events/:userId', (req, res) => {
    const userId = req.params.userId;
    console.log("Fetching events for user ID:", userId);

    const sql = `
        SELECT DISTINCT e.*, c.cname as club_name, f.fname as fest_name,
               CASE 
                   WHEN e.date_time > NOW() THEN 'upcoming'
                   ELSE 'past'
               END as status,
               CASE WHEN er.registration_id IS NOT NULL THEN true ELSE false END as is_registered,
               er.attendance_status
        FROM events e
        LEFT JOIN clubs c ON e.club_id = c.club_id
        LEFT JOIN fests f ON e.fest_id = f.fest_id
        LEFT JOIN club_members cm ON e.club_id = cm.club_id
        LEFT JOIN event_registrations er ON e.event_id = er.event_id AND er.user_id = ?
        WHERE cm.user_id = ? OR er.user_id = ?
        GROUP BY e.event_id
        ORDER BY e.date_time DESC
    `;

    db.query(sql, [userId, userId, userId], (err, results) => {
        if (err) {
            console.error("Error fetching user events:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Register for event
app.post('/api/events/register', (req, res) => {
    const { userId, eventId } = req.body;
    console.log("Register for event:", { userId, eventId });

    if (!userId || !eventId) {
        return res.status(400).json({ error: "User ID and Event ID are required" });
    }

    // Check if event exists
    const checkEventSql = "SELECT * FROM events WHERE event_id = ?";
    db.query(checkEventSql, [eventId], (err, eventResults) => {
        if (err) {
            console.error("Error checking event:", err);
            return res.status(500).json({ error: err.message });
        }
        if (eventResults.length === 0) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Check if already registered
        const checkRegSql = "SELECT * FROM event_registrations WHERE user_id = ? AND event_id = ?";
        db.query(checkRegSql, [userId, eventId], (err, regResults) => {
            if (err) {
                console.error("Error checking registration:", err);
                return res.status(500).json({ error: err.message });
            }

            if (regResults.length > 0) {
                return res.status(400).json({ error: "Already registered for this event" });
            }

            // Insert registration
            const sql = "INSERT INTO event_registrations (user_id, event_id, registered_at) VALUES (?, ?, NOW())";
            db.query(sql, [userId, eventId], (err, result) => {
                if (err) {
                    console.error("Error inserting registration:", err);
                    return res.status(500).json({ error: err.message });
                }

                res.json({
                    message: "Successfully registered for event!",
                    registration_id: result.insertId
                });
            });
        });
    });
});

// Cancel event registration
app.delete('/api/register', (req, res) => {
    const { userId, eventId } = req.body;
    console.log("Cancel registration:", { userId, eventId });

    if (!userId || !eventId) {
        return res.status(400).json({ error: "User ID and Event ID are required" });
    }

    const sql = "DELETE FROM event_registrations WHERE user_id = ? AND event_id = ?";
    db.query(sql, [userId, eventId], (err, result) => {
        if (err) {
            console.error("Error canceling registration:", err);
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Registration not found" });
        }

        res.json({ message: "Registration cancelled successfully" });
    });
});

// Update attendance status (for coordinators)
app.put('/api/events/attendance', (req, res) => {
    const { userId, eventId, status, updatedBy } = req.body;
    console.log("Update attendance:", { userId, eventId, status, updatedBy });

    if (!userId || !eventId || !status) {
        return res.status(400).json({ error: "User ID, Event ID, and status are required" });
    }

    // Check if updater is coordinator
    const getEventSql = "SELECT club_id FROM events WHERE event_id = ?";
    db.query(getEventSql, [eventId], (err, eventResults) => {
        if (err) return res.status(500).json({ error: err.message });
        if (eventResults.length === 0) return res.status(404).json({ error: "Event not found" });

        const club_id = eventResults[0].club_id;

        const checkCoordinatorSql = "SELECT position FROM club_members WHERE club_id = ? AND user_id = ? AND position = 'Coordinator'";
        db.query(checkCoordinatorSql, [club_id, updatedBy], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            if (results.length === 0) {
                return res.status(403).json({ error: "Only coordinators can update attendance" });
            }

            const sql = "UPDATE event_registrations SET attendance_status = ? WHERE user_id = ? AND event_id = ?";
            db.query(sql, [status, userId, eventId], (err, result) => {
                if (err) {
                    console.error("Error updating attendance:", err);
                    return res.status(500).json({ error: err.message });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: "Registration not found" });
                }

                res.json({ message: "Attendance status updated successfully!" });
            });
        });
    });
});

// Check if user is registered for an event
app.get('/api/events/check-registration/:userId/:eventId', (req, res) => {
    const { userId, eventId } = req.params;
    console.log("Checking registration:", { userId, eventId });

    const sql = "SELECT * FROM event_registrations WHERE user_id = ? AND event_id = ?";
    db.query(sql, [userId, eventId], (err, results) => {
        if (err) {
            console.error("Error checking registration:", err);
            return res.status(500).json({ error: err.message });
        }

        res.json({
            is_registered: results.length > 0,
            registration: results[0] || null
        });
    });
});

// ==================== FEST ENDPOINTS ====================

// Get all fests
app.get('/api/fests', (req, res) => {
    const sql = "SELECT * FROM fests WHERE is_active = 1 ORDER BY fname ASC";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get specific fest details with events
app.get('/api/fests/:festId', (req, res) => {
    const festId = req.params.festId;

    const festSql = "SELECT * FROM fests WHERE fest_id = ?";
    const eventsSql = `
        SELECT e.*, COUNT(er.registration_id) as registered_count
        FROM events e
        LEFT JOIN event_registrations er ON e.event_id = er.event_id
        WHERE e.fest_id = ?
        GROUP BY e.event_id
        ORDER BY e.date_time ASC
    `;
    const coordinatorsSql = `
        SELECT u.user_id, u.first_name, u.last_name, fc.role
        FROM fest_coordinators fc
        JOIN users u ON fc.user_id = u.user_id
        WHERE fc.fest_id = ?
    `;

    db.query(festSql, [festId], (err, festResults) => {
        if (err) return res.status(500).json({ error: err.message });
        if (festResults.length === 0) return res.status(404).json({ error: "Fest not found" });

        db.query(eventsSql, [festId], (err, eventsResults) => {
            if (err) return res.status(500).json({ error: err.message });

            db.query(coordinatorsSql, [festId], (err, coordResults) => {
                if (err) return res.status(500).json({ error: err.message });

                res.json({
                    ...festResults[0],
                    events: eventsResults,
                    coordinators: coordResults,
                    event_count: eventsResults.length
                });
            });
        });
    });
});

// ==================== MEMBERSHIP ENDPOINTS ====================

// Get user memberships (clubs user has joined)
app.get('/api/user-memberships/:userId', (req, res) => {
    const userId = req.params.userId;
    const sql = "SELECT club_id FROM club_members WHERE user_id = ?";

    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const membershipIds = results.map(row => row.club_id);
        res.json(membershipIds);
    });
});

// Get detailed user memberships with club info
app.get('/api/user-memberships-detailed/:userId', (req, res) => {
    const userId = req.params.userId;
    const sql = `
        SELECT c.*, cm.position, 
               DATE_FORMAT(cm.joined_date, '%Y-%m-%d') as joined_date
        FROM clubs c 
        JOIN club_members cm ON c.club_id = cm.club_id 
        WHERE cm.user_id = ?
        ORDER BY cm.joined_date DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Get club members
app.get('/api/club-members/:clubId', (req, res) => {
    const clubId = req.params.clubId;
    const sql = `
        SELECT u.user_id, u.first_name, u.last_name, u.roll_no, u.branch_dept, u.email, cm.position,
               DATE_FORMAT(cm.joined_date, '%Y-%m-%d') as joined_date
        FROM users u 
        JOIN club_members cm ON u.user_id = cm.user_id 
        WHERE cm.club_id = ?
        ORDER BY 
            CASE cm.position
                WHEN 'Coordinator' THEN 1
                WHEN 'Sub-Coordinator' THEN 2
                ELSE 3
            END,
            u.first_name ASC
    `;

    db.query(sql, [clubId], (err, results) => {
        if (err) {
            console.error("Member Fetch Error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Join a club
app.post('/api/joinClub', (req, res) => {
    const { userId, clubId } = req.body;

    const checkSql = "SELECT * FROM club_members WHERE club_id = ? AND user_id = ?";
    db.query(checkSql, [clubId, userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            return res.status(400).json({ error: "Already a member of this club" });
        }

        const sql = "INSERT INTO club_members (club_id, user_id, position, joined_date) VALUES (?, ?, 'Member', NOW())";

        db.query(sql, [clubId, userId], (err, result) => {
            if (err) {
                console.error("SQL ERROR:", err);
                return res.status(500).json({ error: err.message });
            }

            const clubSql = "SELECT * FROM clubs WHERE club_id = ?";
            db.query(clubSql, [clubId], (err, clubResults) => {
                if (err) return res.status(500).json({ error: err.message });

                res.status(201).json({
                    message: "Successfully joined the club!",
                    club: clubResults[0]
                });
            });
        });
    });
});

// Leave a club
app.delete('/api/leaveClub', (req, res) => {
    const { userId, clubId } = req.body;

    const sql = "DELETE FROM club_members WHERE user_id = ? AND club_id = ?";

    db.query(sql, [userId, clubId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Membership not found." });
        }

        res.json({ message: "Successfully left the club." });
    });
});

// Update member position (for club coordinators)
app.put('/api/club-members/position', (req, res) => {
    const { userId, clubId, position, updatedBy } = req.body;

    // Check if updater is coordinator
    const checkCoordinatorSql = "SELECT position FROM club_members WHERE club_id = ? AND user_id = ?";
    db.query(checkCoordinatorSql, [clubId, updatedBy], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length === 0 || results[0].position !== 'Coordinator') {
            return res.status(403).json({ error: "Only coordinators can update member positions" });
        }

        const sql = "UPDATE club_members SET position = ? WHERE user_id = ? AND club_id = ?";
        db.query(sql, [position, userId, clubId], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Membership not found" });
            }

            res.json({ message: "Position updated successfully!" });
        });
    });
});

// Check if user is member of a club
app.get('/api/check-membership/:userId/:clubId', (req, res) => {
    const { userId, clubId } = req.params;

    const sql = "SELECT * FROM club_members WHERE user_id = ? AND club_id = ?";
    db.query(sql, [userId, clubId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
            is_member: results.length > 0,
            membership: results[0] || null
        });
    });
});

// ==================== DASHBOARD STATS ENDPOINTS ====================

// Get dashboard statistics
app.get('/api/stats/:userId', (req, res) => {
    const userId = req.params.userId;

    const stats = {
        totalClubs: 0,
        totalEvents: 0,
        joinedClubs: 0,
        upcomingEvents: 0,
        registeredEvents: 0
    };

    db.query("SELECT COUNT(*) as count FROM clubs", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalClubs = results[0].count;

        db.query("SELECT COUNT(*) as count FROM events WHERE date_time > NOW()", (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.totalEvents = results[0].count;

            db.query("SELECT COUNT(*) as count FROM club_members WHERE user_id = ?", [userId], (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.joinedClubs = results[0].count;

                const eventsSql = `
                    SELECT COUNT(*) as count 
                    FROM events e
                    JOIN club_members cm ON e.club_id = cm.club_id
                    WHERE cm.user_id = ? AND e.date_time > NOW()
                `;
                db.query(eventsSql, [userId], (err, results) => {
                    if (err) return res.status(500).json({ error: err.message });
                    stats.upcomingEvents = results[0].count;

                    const regSql = "SELECT COUNT(*) as count FROM event_registrations WHERE user_id = ?";
                    db.query(regSql, [userId], (err, results) => {
                        if (err) return res.status(500).json({ error: err.message });
                        stats.registeredEvents = results[0].count;

                        res.json(stats);
                    });
                });
            });
        });
    });
});

// ==================== SEARCH ENDPOINTS ====================

// Search clubs, events, and users
app.get('/api/search', (req, res) => {
    const { q } = req.query;
    const searchTerm = `%${q}%`;

    const results = {
        clubs: [],
        events: [],
        users: []
    };

    db.query(
        "SELECT club_id, cname as name, bio as description, 'club' as type FROM clubs WHERE cname LIKE ? OR bio LIKE ? LIMIT 5",
        [searchTerm, searchTerm],
        (err, clubResults) => {
            if (err) return res.status(500).json({ error: err.message });
            results.clubs = clubResults;

            db.query(
                "SELECT event_id, title as name, about_event as description, 'event' as type FROM events WHERE title LIKE ? OR about_event LIKE ? LIMIT 5",
                [searchTerm, searchTerm],
                (err, eventResults) => {
                    if (err) return res.status(500).json({ error: err.message });
                    results.events = eventResults;

                    db.query(
                        "SELECT user_id, CONCAT(first_name, ' ', last_name) as name, roll_no as description, 'user' as type FROM users WHERE first_name LIKE ? OR last_name LIKE ? OR roll_no LIKE ? LIMIT 5",
                        [searchTerm, searchTerm, searchTerm],
                        (err, userResults) => {
                            if (err) return res.status(500).json({ error: err.message });
                            results.users = userResults;
                            res.json(results);
                        }
                    );
                }
            );
        }
    );
});

// ==================== VISIT PROFILE ENDPOINT ====================
// Get user profile for public viewing (visit profile)
app.get('/api/visit-profile/:userId', (req, res) => {
    const { userId } = req.params;

    console.log("Visit profile request for user ID:", userId);

    // Validate userId
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
    }

    // Get user basic info (excluding sensitive data)
    const userSql = `
        SELECT user_id, roll_no, email, first_name, last_name, branch_dept, 
               linkedin_url, github_url, bio, created_at 
        FROM users 
        WHERE user_id = ?
    `;

    db.query(userSql, [userId], (err, userResults) => {
        if (err) {
            console.error("Error fetching user:", err);
            return res.status(500).json({ error: "Database error" });
        }

        if (userResults.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const user = userResults[0];

        // Get user's club memberships with club details
        const clubsSql = `
            SELECT c.club_id, c.cname, c.bio as club_bio, cm.position, 
                   DATE_FORMAT(cm.joined_date, '%Y-%m-%d') as joined_date
            FROM clubs c 
            JOIN club_members cm ON c.club_id = cm.club_id 
            WHERE cm.user_id = ?
            ORDER BY cm.joined_date DESC
        `;

        db.query(clubsSql, [userId], (err, clubsResults) => {
            if (err) {
                console.error("Error fetching user clubs:", err);
                // Still return user data even if clubs fail
                return res.json({
                    ...user,
                    clubs: [],
                    events: [],
                    stats: {
                        club_count: 0,
                        event_count: 0,
                        upcoming_count: 0,
                        past_count: 0
                    }
                });
            }

            // Get user's events (events they're registered for or from their clubs)
            const eventsSql = `
                SELECT DISTINCT e.event_id, e.title, e.about_event, e.date_time, e.venue,
                       c.cname as club_name, c.club_id,
                       f.fname as fest_name, f.fest_id,
                       CASE 
                           WHEN e.date_time > NOW() THEN 'upcoming'
                           ELSE 'past'
                       END as event_status,
                       CASE WHEN er.user_id IS NOT NULL THEN true ELSE false END as is_registered
                FROM events e
                LEFT JOIN clubs c ON e.club_id = c.club_id
                LEFT JOIN fests f ON e.fest_id = f.fest_id
                LEFT JOIN club_members cm ON e.club_id = cm.club_id AND cm.user_id = ?
                LEFT JOIN event_registrations er ON e.event_id = er.event_id AND er.user_id = ?
                WHERE cm.user_id = ? OR er.user_id = ?
                ORDER BY e.date_time DESC
                LIMIT 20
            `;

            db.query(eventsSql, [userId, userId, userId, userId], (err, eventsResults) => {
                if (err) {
                    console.error("Error fetching user events:", err);
                    return res.json({
                        ...user,
                        clubs: clubsResults || [],
                        events: [],
                        stats: {
                            club_count: clubsResults ? clubsResults.length : 0,
                            event_count: 0,
                            upcoming_count: 0,
                            past_count: 0
                        }
                    });
                }

                // Calculate stats
                const now = new Date();
                const upcomingEvents = eventsResults.filter(e => new Date(e.date_time) > now);
                const pastEvents = eventsResults.filter(e => new Date(e.date_time) <= now);

                const stats = {
                    club_count: clubsResults ? clubsResults.length : 0,
                    event_count: eventsResults.length,
                    upcoming_count: upcomingEvents.length,
                    past_count: pastEvents.length
                };

                // Send combined response
                res.json({
                    ...user,
                    clubs: clubsResults || [],
                    events: eventsResults || [],
                    stats: stats
                });
            });
        });
    });
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
    db.query('SELECT 1', (err) => {
        if (err) {
            res.status(500).json({ status: 'Database connection failed' });
        } else {
            res.json({ status: 'OK', message: 'Server is running' });
        }
    });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});