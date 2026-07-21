-- ============================================
-- STAR RIDE BIKE RENTAL SYSTEM - DATABASE
-- ============================================

-- Create Database
CREATE DATABASE IF NOT EXISTS starride;
USE starride;

-- ============================================
-- TABLE 1: USERS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    profile_pic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE 2: BIKES
-- ============================================
CREATE TABLE IF NOT EXISTS bikes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price INT NOT NULL,
    img VARCHAR(500),
    description VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE 3: BOOKINGS
-- ============================================
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
);

-- ============================================
-- INSERT DEFAULT BIKES DATA
-- ============================================
INSERT INTO bikes (name, price, img, description) VALUES
('Hero Cycle', 100, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZXqoCZk4ZDruBIMQX7xqLkJLMgjgSFFaQ7Q&s', 'Lightweight and perfect for city rides'),
('Yamaha FZ', 350, 'https://shop.yamaha-motor-india.com/cdn/shop/files/MicrosoftTeams-image_11_600x.jpg?v=1698824600', 'Powerful performance with smooth handling'),
('Royal Enfield GT 650', 850, 'https://ssmotocorp.com/cdn/shop/files/IMG_2459.jpg?v=1763374073&width=1946', 'Classic British cafe racer style'),
('Honda CB350RS', 550, 'https://www.team-bhp.com/sites/default/files/styles/amp_high_res/public/honda-cb350rs-3.jpg', 'Modern neo-retro cafe racer'),
('TVS Ronin', 450, 'https://5.imimg.com/data5/SELLER/Default/2024/2/394226471/DN/PI/TF/40982059/tvs-ronin-bike.jpg', 'Sporty bobber with premium features'),
('Ather 450X', 400, 'https://assets.otocapital.in/production/space-grey-ather-450x-image.webp', 'Premium electric scooter'),
('OLA S1 Pro', 380, 'https://imgd.aeplcdn.com/1280x720/n/5xn4bfb_1811597.jpg', 'Long range electric scooter'),
('X-Pulse 200', 350, 'https://cdn.bikedekho.com/processedimages/hero/xpulse-200/source/xpulse-2006464cccde5281.jpg', 'Adventure-ready on-road motorcycle'),
('V-Strom 250 SX', 500, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZVmpaxDCN97dCaGX92lX14F7tsYeY3ljg7w&s', 'Adventure touring motorcycle');

-- ============================================
-- DATABASE QUERIES FOR EXAM
-- ============================================

-- 1. VIEW ALL USERS
SELECT * FROM users;

-- 2. VIEW ALL BIKES
SELECT * FROM bikes;

-- 3. VIEW ALL BOOKINGS
SELECT * FROM bookings;

-- 4. VIEW USERS WITH SPECIFIC COLUMNS
SELECT id, name, email, created_at FROM users;

-- 5. VIEW BIKES WITH SPECIFIC COLUMNS
SELECT name, price, description FROM bikes;

-- 6. INSERT NEW USER
INSERT INTO users (name, email, password) VALUES ('John Doe', 'john@email.com', 'hashed_password_here');

-- 7. INSERT NEW BIKE
INSERT INTO bikes (name, price, img, description) VALUES ('KTM Duke 390', 700, 'https://example.com/bike.jpg', 'Sport bike');

-- 8. INSERT NEW BOOKING
INSERT INTO bookings (user_id, bike_name, hours, total_price, transaction_id) VALUES (1, 'Yamaha FZ', 3, 1050, 'UPI123456');

-- 9. UPDATE USER NAME
UPDATE users SET name = 'New Name' WHERE id = 1;

-- 10. UPDATE BIKE PRICE
UPDATE bikes SET price = 400 WHERE id = 2;

-- 11. DELETE A USER
DELETE FROM users WHERE id = 1;

-- 12. DELETE A BIKE
DELETE FROM bikes WHERE id = 1;

-- 13. DELETE A BOOKING
DELETE FROM bookings WHERE id = 1;

-- 14. SEARCH USER BY EMAIL
SELECT * FROM users WHERE email = 'test@email.com';

-- 15. SEARCH BIKES BY PRICE RANGE
SELECT * FROM bikes WHERE price BETWEEN 300 AND 600;

-- 16. COUNT TOTAL USERS
SELECT COUNT(*) AS total_users FROM users;

-- 17. COUNT TOTAL BIKES
SELECT COUNT(*) AS total_bikes FROM bikes;

-- 18. COUNT TOTAL BOOKINGS
SELECT COUNT(*) AS total_bookings FROM bookings;

-- 19. VIEW BOOKINGS WITH USER DETAILS
SELECT b.id, b.bike_name, b.hours, b.total_price, b.created_at, u.name, u.email 
FROM bookings b 
JOIN users u ON b.user_id = u.id;

-- 20. VIEW MOST EXPENSIVE BOOKINGS
SELECT * FROM bookings ORDER BY total_price DESC;

-- 21. VIEW RECENT BOOKINGS
SELECT * FROM bookings ORDER BY created_at DESC;

-- 22. VIEW BIKES BY PRICE (ASCENDING)
SELECT * FROM bikes ORDER BY price ASC;

-- 23. VIEW BIKES BY PRICE (DESCENDING)
SELECT * FROM bikes ORDER BY price DESC;

-- 24. VIEW BOOKINGS BY SPECIFIC USER
SELECT * FROM bookings WHERE user_id = 1;

-- 25. VIEW USER PROFILE WITH BOOKING COUNT
SELECT u.id, u.name, u.email, COUNT(b.id) AS total_bookings 
FROM users u 
LEFT JOIN bookings b ON u.id = b.user_id 
GROUP BY u.id;

-- 26. VIEW TOTAL REVENUE
SELECT SUM(total_price) AS total_revenue FROM bookings;

-- 27. VIEW REVENUE BY BIKE
SELECT bike_name, SUM(total_price) AS revenue, COUNT(*) AS total_rentals 
FROM bookings 
GROUP BY bike_name;

-- 28. ADD PROFILE PICTURE TO USER
UPDATE users SET profile_pic = 'data:image/png;base64,...' WHERE id = 1;

-- 29. CHANGE USER PASSWORD
UPDATE users SET password = 'new_hashed_password' WHERE id = 1;

-- 30. VIEW USERS JOINED IN LAST 7 DAYS
SELECT * FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- ============================================
-- END OF DATABASE CODE
-- ============================================