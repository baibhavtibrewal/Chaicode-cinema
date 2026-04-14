//  CREATE TABLE seats (
//      id SERIAL PRIMARY KEY,
//      name VARCHAR(255),
//      isbooked INT DEFAULT 0
//  );
// INSERT INTO seats (isbooked)
// SELECT 0 FROM generate_series(1, 20);

//  CREATE TABLE users (
//      id SERIAL PRIMARY KEY,
//      username VARCHAR(255) UNIQUE NOT NULL,
//      password VARCHAR(255) NOT NULL
//  );

// ALTER TABLE seats ADD COLUMN movie_id INT DEFAULT 1;
// INSERT INTO seats (isbooked, movie_id) SELECT 0, 2 FROM generate_series(1, 20);
// INSERT INTO seats (isbooked, movie_id) SELECT 0, 3 FROM generate_series(1, 20);

import "dotenv/config";
import express from "express";
import pg from "pg";
import { dirname } from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// Auth middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).send({ error: "Access denied. Please login first." });
  }
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (ex) {
    res.status(401).send({ error: "Invalid or expired token. Please login again." });
  }
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 8080;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect()
  .then(() => {
    console.log("✅ DB Connected");
  })
  .catch((err) => {
    console.error("❌ DB Connection Error:", err);
  });
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname, { index: false }));

// Register a new user
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send({ error: "Username and password are required" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
      [username, hashedPassword]
    );
    res.status(201).send({ message: "User registered successfully", user: result.rows[0] });
  } catch (ex) {
    if (ex.code === "23505") {
      return res.status(400).send({ error: "Username already exists" });
    }
    res.status(500).send({ error: "Something went wrong" });
  }
});

// Login user
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send({ error: "Username and password are required" });
    }
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (result.rowCount === 0) {
      return res.status(401).send({ error: "Invalid username or password" });
    }
    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ error: "Invalid username or password" });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.send({ message: "Login successful", token });
  } catch (ex) {
    console.log(ex);
    res.status(500).send({ error: "Something went wrong" });
  }
});

// Mock movie data API
const movies = [
  { id: 1, title: "Dhurandhar The Revenge", language: "Hindi", duration: "3h 49m", genre: "Action", rating: 9.5, poster: "/dhurandhar.avif" },
  { id: 2, title: "KGF Chapter 3", language: "Kannada", duration: "2h 45m", genre: "Action", rating: 9.0, poster: "/kgf.jpg" },
  { id: 3, title: "Pushpa 3", language: "Telugu", duration: "2h 20m", genre: "Thriller", rating: 8.8, poster: "/pushpa.jpg" },
];

app.get("/api/movies", (req, res) => {
  res.send(movies);
});

// Get seats by movie
app.get("/seats/:movieId", async (req, res) => {
  const movieId = req.params.movieId;
  const result = await pool.query(
    "SELECT * FROM seats WHERE movie_id = $1 ORDER BY id",
    [movieId]
  );
  res.send(result.rows);
});

// Keep old /seats endpoint so nothing breaks
app.get("/seats", async (req, res) => {
  const result = await pool.query("SELECT * FROM seats WHERE movie_id = 1 ORDER BY id");
  res.send(result.rows);
});

// Book a seat
app.put("/:id/:name", authenticate, async (req, res) => {
  try {
    const id = req.params.id;
    const name = req.params.name;
    const conn = await pool.connect();
    await conn.query("BEGIN");
    const sql = "SELECT * FROM seats WHERE id = $1 AND isbooked = 0 FOR UPDATE";
    const result = await conn.query(sql, [id]);
    if (result.rowCount === 0) {
      res.send({ error: "Seat already booked" });
      return;
    }
    const sqlU = "UPDATE seats SET isbooked = 1, name = $2, user_id = $3 WHERE id = $1";
    await conn.query(sqlU, [id, name, req.user.id]);
    await conn.query("COMMIT");
    conn.release();
    res.send({ message: "Seat booked successfully", seatId: id, bookedBy: req.user.username });
  } catch (ex) {
    console.log(ex);
    res.status(500).send({ error: "Something went wrong" });
  }
});

// Serve HTML pages
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});

app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/register.html");
});

app.get("/movies", (req, res) => {
  res.sendFile(__dirname + "/movies.html");
});

app.get("/seats-page", (req, res) => {
  res.sendFile(__dirname + "/seats.html");
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/movies.html");
});

app.listen(port, "0.0.0.0", () => {
  console.log("🚀 Server running on port:", port);
});