require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// MySQL connection config — env-driven so it works locally and on managed hosts.
// SIMPLEST for cloud: set ONE variable, DATABASE_URL, to your host's full
// connection URI (e.g. Aiven's "Service URI"). Otherwise set individual MYSQL_* vars.
const DB_URL = process.env.DATABASE_URL || process.env.MYSQL_URL || '';
const useSSL = /^(true|require|required|1)$/i.test(process.env.MYSQL_SSL || '')
    || /ssl-?mode=required/i.test(DB_URL);

let baseDbConfig, DB_NAME;
if (DB_URL) {
    try {
        const u = new URL(DB_URL);
        DB_NAME = decodeURIComponent(u.pathname.replace(/^\//, '')) || 'defaultdb';
        baseDbConfig = {
            host: u.hostname,
            port: Number(u.port) || 3306,
            user: decodeURIComponent(u.username),
            password: decodeURIComponent(u.password),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {})
        };
    } catch (e) {
        console.log('Invalid DATABASE_URL, falling back to MYSQL_* vars:', e.message);
    }
}
if (!baseDbConfig) {
    DB_NAME = process.env.MYSQL_DATABASE || 'starride';
    baseDbConfig = {
        host: process.env.MYSQL_HOST || 'localhost',
        port: Number(process.env.MYSQL_PORT) || 3306,
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {})
    };
}

// MySQL Connection Pool
const pool = mysql.createPool({ ...baseDbConfig, database: DB_NAME });

// Initialize Database
async function initDatabase() {
    try {
        // On self-hosted MySQL we can create the database; managed hosts pre-create
        // it and often forbid this, so don't let a failure here abort table setup.
        try {
            const tempPool = mysql.createPool(baseDbConfig);
            await tempPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
            await tempPool.end();
        } catch (e) {
            console.log('Skipping CREATE DATABASE (using existing DB):', e.message);
        }

        // Create tables
        const conn = await pool.getConnection();
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                profile_pic TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS bikes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                price INT NOT NULL,
                img VARCHAR(500),
                description VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await conn.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                bike_name VARCHAR(100) NOT NULL,
                hours INT NOT NULL,
                total_price INT NOT NULL,
                transaction_id VARCHAR(100),
                status VARCHAR(50) DEFAULT 'confirmed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
        
        // Insert default bikes if empty
        const [bikes] = await conn.query('SELECT COUNT(*) as count FROM bikes');
        if (bikes[0].count === 0) {
            await conn.query(`
                INSERT INTO bikes (name, price, img, description) VALUES
                ('Hero Cycle', 100, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZXqoCZk4ZDruBIMQX7xqLkJLMgjgSFFaQ7Q&s', 'Lightweight and perfect for city rides'),
                ('Yamaha FZ', 350, 'https://shop.yamaha-motor-india.com/cdn/shop/files/MicrosoftTeams-image_11_600x.jpg?v=1698824600', 'Powerful performance with smooth handling'),
                ('Royal Enfield GT 650', 850, 'https://ssmotocorp.com/cdn/shop/files/IMG_2459.jpg?v=1763374073&width=1946', 'Classic British cafe racer style'),
                ('Honda CB350RS', 550, 'https://www.team-bhp.com/sites/default/files/styles/amp_high_res/public/honda-cb350rs-3.jpg', 'Modern neo-retro cafe racer'),
                ('TVS Ronin', 450, 'https://5.imimg.com/data5/SELLER/Default/2024/2/394226471/DN/PI/TF/40982059/tvs-ronin-bike.jpg', 'Sporty bobber with premium features'),
                ('Ather 450X', 400, 'https://assets.otocapital.in/production/space-grey-ather-450x-image.webp', 'Premium electric scooter'),
                ('OLA S1 Pro', 380, 'https://imgd.aeplcdn.com/1280x720/n/5xn4bfb_1811597.jpg', 'Long range electric scooter'),
                ('X-Pulse 200', 350, 'https://cdn.bikedekho.com/processedimages/hero/xpulse-200/source/xpulse-2006464cccde5281.jpg', 'Adventure-ready on-road motorcycle'),
                ('V-Strom 250 SX', 500, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZVmpaxDCN97dCaGX92lX14F7tsYeY3ljg7w&s', 'Adventure touring motorcycle')
            `);
            console.log('Default bikes added');
        }
        
        conn.release();
        console.log('MySQL connected - Database ready');
    } catch (error) {
        console.log('MySQL init error:', error.message);
    }
}

// SIGN UP
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }
        
        const conn = await pool.getConnection();
        const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
        
        if (existing.length > 0) {
            conn.release();
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await conn.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
        conn.release();
        
        res.json({ success: true, message: 'Account created successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Signup failed' });
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }
        
        const conn = await pool.getConnection();
        const [users] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
        conn.release();
        
        if (users.length === 0) {
            return res.status(400).json({ error: 'Email not registered' });
        }
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect password' });
        }
        
        res.json({ 
            success: true, 
            user: { id: user.id.toString(), name: user.name, email: user.email } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET BIKES
app.get('/api/bikes', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [bikes] = await conn.query('SELECT id, name, price, img, description FROM bikes');
        conn.release();
        res.json(bikes);
    } catch (error) {
        console.error('Bikes error:', error);
        res.status(500).json({ error: 'Failed to fetch bikes' });
    }
});

// TEMP diagnostic — remove after deployment is verified. Reports DB config
// presence and the real connection error, without exposing the password.
app.get('/api/_dbcheck', async (req, res) => {
    const info = {
        via: DB_URL ? 'DATABASE_URL' : 'MYSQL_* vars',
        host: baseDbConfig.host,
        port: baseDbConfig.port,
        user: baseDbConfig.user,
        database: DB_NAME,
        passwordSet: !!baseDbConfig.password,
        ssl: useSSL
    };
    try {
        const conn = await pool.getConnection();
        try {
            const [t] = await conn.query('SELECT COUNT(*) AS n FROM bikes');
            res.json({ ok: true, ...info, bikeCount: t[0].n });
        } finally { conn.release(); }
    } catch (e) {
        res.json({ ok: false, ...info, code: e.code, errno: e.errno, message: e.message });
    }
});

// GET ALL USERS
app.get('/api/users', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [users] = await conn.query('SELECT id, name, email, created_at as createdAt FROM users');
        conn.release();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// ADD BIKE
app.post('/api/bikes', async (req, res) => {
    try {
        const { name, price, img, desc } = req.body;
        const conn = await pool.getConnection();
        await conn.query('INSERT INTO bikes (name, price, img, description) VALUES (?, ?, ?, ?)', [name, price, img, desc]);
        conn.release();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add bike' });
    }
});

// CREATE BOOKING
app.post('/api/bookings', async (req, res) => {
    try {
        const { userId, bikeName, hours, totalPrice, transactionId } = req.body;
        
        if (!userId || !bikeName || !hours || !totalPrice) {
            return res.status(400).json({ error: 'All fields required' });
        }
        
        if (!transactionId) {
            return res.status(400).json({ error: 'Transaction ID required for verification' });
        }
        
        const conn = await pool.getConnection();
        await conn.query(
            'INSERT INTO bookings (user_id, bike_name, hours, total_price, transaction_id) VALUES (?, ?, ?, ?, ?)',
            [userId, bikeName, hours, totalPrice, transactionId]
        );
        conn.release();
        res.json({ success: true });
    } catch (error) {
        console.error('Booking error:', error);
        res.status(500).json({ error: 'Booking failed' });
    }
});

// GET USER BOOKINGS
app.get('/api/bookings/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const conn = await pool.getConnection();
        const [bookings] = await conn.query('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        conn.release();
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// FORGOT PASSWORD - Check Email
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }
        
        const conn = await pool.getConnection();
        const [users] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
        conn.release();
        
        if (users.length === 0) {
            return res.status(400).json({ error: 'Email not registered' });
        }
        
        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        res.json({ success: true, message: 'Email verified', otp: otp });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// RESET PASSWORD
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const conn = await pool.getConnection();
        await conn.query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email]);
        conn.release();
        
        res.json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ error: 'Reset failed' });
    }
});

// CHANGE PASSWORD (logged in user)
app.post('/api/change-password', async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        console.log('Change password request for user:', userId);
        
        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'All fields required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be 6+ characters' });
        }
        
        const userIdNum = parseInt(userId);
        
        const conn = await pool.getConnection();
        const [users] = await conn.query('SELECT id, password FROM users WHERE id = ?', [userIdNum]);
        
        if (users.length === 0) {
            conn.release();
            console.log('User not found:', userId);
            return res.status(400).json({ success: false, error: 'User not found. Try logging out and in again.' });
        }
        
        const isMatch = await bcrypt.compare(currentPassword, users[0].password);
        console.log('Password match:', isMatch);
        
        if (!isMatch) {
            conn.release();
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await conn.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userIdNum]);
        conn.release();
        
        console.log('Password updated for user:', userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, error: 'Failed to change password: ' + error.message });
    }
});

// UPDATE USER PROFILE
app.post('/api/update-profile', async (req, res) => {
    try {
        const { userId, name, profilePic } = req.body;
        
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID required' });
        }
        
        const conn = await pool.getConnection();
        
        // Build update query based on what's provided
        let updates = [];
        let values = [];
        
        if (name && name.trim()) {
            updates.push('name = ?');
            values.push(name.trim());
        }
        
        if (profilePic && profilePic.startsWith('data:')) {
            updates.push('profile_pic = ?');
            values.push(profilePic);
        }
        
        if (updates.length === 0) {
            conn.release();
            return res.status(400).json({ success: false, error: 'No data to update' });
        }
        
        values.push(userId);
        await conn.query('UPDATE users SET ' + updates.join(', ') + ' WHERE id = ?', values);
        
        conn.release();
        res.json({ success: true, message: 'Profile updated' });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ success: false, error: 'Update failed: ' + error.message });
    }
});

// GET USER PROFILE
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const conn = await pool.getConnection();
        const [users] = await conn.query('SELECT id, name, email, profile_pic, created_at FROM users WHERE id = ?', [userId]);
        
        const [bookings] = await conn.query('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        conn.release();
        
        if (users.length > 0) {
            res.json({ success: true, user: users[0], bookings: bookings });
        } else {
            res.status(400).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Fetch failed' });
    }
});

// CLEAR USER BOOKINGS
app.delete('/api/bookings/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const conn = await pool.getConnection();
        await conn.query('DELETE FROM bookings WHERE user_id = ?', [userId]);
        conn.release();
        res.json({ success: true, message: 'Booking history cleared' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear bookings' });
    }
});

// PAYMENT (Simplified)
app.post('/api/create-payment', async (req, res) => {
    const { amount } = req.body;
    res.json({ orderId: 'ORDER_' + Date.now(), amount });
});

app.post('/api/verify-payment', async (req, res) => {
    res.json({ success: true });
});

// CATCH ALL
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initDatabase();
});