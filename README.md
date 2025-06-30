
# 🎬 Movie Booking & Theatre Management System

A full-featured web application enabling movie-goers to browse and book shows, theatre hosts to manage their theatres/screens/shows via request workflows, and admins to approve or reject those requests. Built with **Node.js**, **Express**, **MySQL**, and **EJS**.

---

## 🚀 Core Features

### 🧑‍🎬 Users
- Sign‑up, login, logout using email/password (hashed with bcrypt)
- Password reset using OTP emailed to the registered address
- Set preferred location to view available shows
- Browse all movies and filter by city & state
- View movie details with cast, reviews, average rating
- Post and delete own reviews
- Book tickets (select seats, confirm availability)
- View past bookings and cancel upcoming bookings
- Profile settings for updating username/password/email, and account deletion

### 🏛️ Hosts
- Login/logout for theatre hosts
- View owned theatres, screens, and scheduled shows
- Submit requests to:  
  - Add/update/delete theatres, screens, shows  
  - Cancel pending requests
- View request statuses and detailed request info

### 🛡️ Admins
- Secure login/logout for admin users
- View pending host requests
- Approve or reject requests; actions are applied in the system when approved (e.g., creating a show)

---

## 🏗️ Tech Stack

| Category        | Technologies                                |
|----------------|---------------------------------------------|
| Backend         | Node.js, Express.js                         |
| Database        | MySQL                                       |
| View Engine     | EJS with `ejs-mate` layouts                  |
| Auth & Security | bcrypt, express-session, connect-flash      |
| Misc            | nodemailer (OTP), method-override           |
| Error Handling  | Custom `AppError`, `catchAsync` wrapper     |

---

## 📁 Project Structure

```
.
├── config/
│   └── db.js                  # MySQL connector
├── routes/
│   ├── users.js               # Authentication, booking, profile, reviews
│   ├── movies.js              # Browse movies, show details, movie APIs
│   ├── host.js                # Host panel & request workflow
│   └── admin.js               # Admin approvals/rejections
├── views/
│   ├── users/                 # Login, register, forgot/reset password, profile
│   ├── movies/                # Movie list, detail, book, shows
│   ├── host/                  # Host dashboard, requests
│   └── admin/                 # Admin dashboard
├── public/                    # CSS, JS, images
├── AppError.js                # Custom error class
├── catchAsync.js              # Async wrapper for preventing unhandled rejections
├── server.js                  # App entrypoint
└── .env                       # Credentials & secrets
```

---

## ⚙️ Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/movie-theatre-system.git
cd movie-theatre-system
npm install
```

### 2. Configure `.env`

Create a `.env` file in the root directory:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_pass
DB_NAME=movie_system

SESSION_SECRET=some_secret_phrase

EMAIL_USER=youremail@gmail.com
EMAIL_PASS=your_app_password
```

> 💡 Use a Gmail App Password if you have 2FA enabled.

### 3. Setup Database

Load your schema and sample data (create tables like `USERS`, `MOVIE`, `ACTORS`, `ROLES`, `SHOWS`, `SCREEN`, `THEATRE`, `HOST`, `ADMIN`, `HOST_REQUESTS`, `REVIEWS`, `TICKET`).

Ensure foreign keys match route logic.

### 4. Run the Server

```bash
npm start
```

Browse:
- User interface: http://localhost:3000/
- Host panel: http://localhost:3000/host/login
- Admin panel: http://localhost:3000/admin/login

### 🔐 Seed Credentials (for testing)

Use `bcrypt` to hash passwords:

```js
const bcrypt = require('bcrypt');
bcrypt.hash('password123', 12).then(console.log);
```

Insert into database:

```sql
-- Admin
INSERT INTO ADMIN (EMAIL, PASSWORD, ADMIN_NAME)
VALUES ('admin@example.com', '<hashed>', 'Admin One');

-- Host
INSERT INTO HOST (EMAIL, PASSWORD, HOST_NAME)
VALUES ('host@example.com', '<hashed>', 'Host One');
```

### 🧩 API Endpoints (movies.js routes)

- `GET /movies/all` – Return JSON with movies for the session location
- `GET /movies/search?searchTerm=` – Case-insensitive search
- `GET /movies/:id` – Movie detail with cast, reviews, ratings
- `POST /movies/:id/reviews` – Add a review (authenticated users only)
- `DELETE /movies/:movieId/reviews/:reviewId` – Remove own review

Booking flow:
- `GET /movies/book/movies/:movieId` – Select show
- `GET /movies/book/shows/:showId` – Confirm booking details
- `POST /movies/book/:showId` – Create tickets, update show, send email
