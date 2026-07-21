# STAR RIDE - Bike Rental Website

A full-stack bike rental website built with Node.js, Express, and MySQL.

## Features
- User registration & login (secure password hashing with bcrypt)
- Bike listing with images (seeded automatically on first run)
- Booking system with transaction records
- User profile with editable name/photo and booking history
- Forgot / reset / change password flows
- Admin dashboard (view users, add bikes)
- Neobrutalist dark theme with a starry-night background

## Tech Stack
- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **Database**: MySQL (via `mysql2`)
- **Auth**: bcryptjs password hashing

## Prerequisites
- Node.js (v14 or higher)
- MySQL server running locally (or reachable via the values in `.env`)

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Set your MySQL host, user, password, and database name
   ```bash
   cp .env.example .env
   ```
   The app creates the database, tables, and seed bikes automatically on first start —
   you only need a running MySQL server and valid credentials.

3. Start the server:
   ```bash
   npm start
   ```

4. Open in the browser:
   ```
   http://localhost:3000
   ```

## Database

The schema is defined in [`database_code.sql`](database_code.sql). On startup, `server.js`
also runs `CREATE DATABASE IF NOT EXISTS` and creates the tables automatically:

- **users** — id, name, email, password (hashed), profile_pic, created_at
- **bikes** — id, name, price, img, description, created_at
- **bookings** — id, user_id (FK → users), bike_name, hours, total_price, transaction_id, status, created_at

## Project Structure
```
/DBMS
  ├── server.js            # Express server + all API routes
  ├── database_code.sql    # MySQL schema
  ├── package.json         # Dependencies
  ├── .env.example         # Env var template (copy to .env)
  ├── Index.html           # Landing page
  ├── login.html           # Login page
  ├── signup.html          # Signup page
  ├── Bikes.html           # Bike listing & booking
  ├── profile.html         # User profile & booking history
  ├── contact.html         # Contact page
  ├── forgot.html          # Forgot/reset password
  ├── Admin.html           # Admin dashboard
  ├── Admin-login.html     # Admin login
  ├── Style.css            # All styling
  └── logo.png             # Site logo
```

## API Endpoints

### Authentication
- `POST /api/signup` — Register a new user
- `POST /api/login` — User login
- `POST /api/forgot-password` — Verify email and issue an OTP
- `POST /api/reset-password` — Reset password by email
- `POST /api/change-password` — Change password for a logged-in user

### Bikes
- `GET /api/bikes` — Get all bikes
- `POST /api/bikes` — Add a new bike (admin)

### Bookings
- `POST /api/bookings` — Create a booking
- `GET /api/bookings/:userId` — Get a user's bookings
- `DELETE /api/bookings/:userId` — Clear a user's booking history

### Profile
- `GET /api/profile/:userId` — Get a user's profile and bookings
- `POST /api/update-profile` — Update name / profile picture
- `GET /api/users` — List all users (admin)

### Payments (simplified / mock)
- `POST /api/create-payment` — Create a mock order id
- `POST /api/verify-payment` — Mock verification (returns success)

## Security Features
- Passwords hashed using bcrypt
- Persistent MySQL storage (not localStorage)
- Server-side input validation
