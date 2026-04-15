# 🎬 ChaiCode Cinema

A full-stack movie seat booking web app. Users can register, log in, browse movies, and book seats in real time.

---

## Features

- Browse currently showing movies with posters, ratings, and details
- Visual seat map with live availability per movie
- User registration and login with hashed passwords and JWT auth
- Seat booking is protected — login required
- Race-condition safe booking using PostgreSQL transactions

---

## Tech Stack

- **Backend:** Node.js, Express v5
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt
- **Frontend:** Vanilla HTML, CSS, JavaScript

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/chaicode-cinema.git
cd chaicode-cinema
npm install
```

### 2. Configure environment

Create a `.env` file in the root — refer to `.env.example` for the required variables.

### 3. Set up the database

Run the SQL in `db.sql` (included in the repo) to create the tables and seed initial data.

### 4. Start the server

```bash
node index.mjs
```

App runs on `http://localhost:8080` by default.

---

## Pages

| Route | Page |
|---|---|
| `/movies` | Movies listing |
| `/login` | Login |
| `/register` | Register |
| `/seats-page` | Seat booking |

---

## License

ISC
