import express from "express"; // Import Express framework to create server and routes
import cors from "cors"; // Import CORS to allow requests from React frontend
import bodyParser from "body-parser"; // Parse JSON body from requests
import bcrypt from "bcryptjs"; // Library to hash passwords
import dotenv from "dotenv"; // Load environment variables from .env

dotenv.config(); // Initialize dotenv so we can use process.env

const app = express(); // Create Express app
const PORT = process.env.PORT || 5000; // Set port from env or default 5000

app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json()); // Parse JSON request bodies

// TEMP: In-memory users array (later replace with a database)
const users = [];

/* --------------------- SIGN-UP ROUTE --------------------- */
app.post("/signup", async (req, res) => {
  const { username, password } = req.body; // Grab username & password from frontend request

  // Check if user already exists
  const userExists = users.find(u => u.username === username);
  if (userExists) {
    return res.status(400).json({ message: "Username already taken!" });
  }

  const hashedPassword = await bcrypt.hash(password, 10); 
  // Hash password for security (10 is salt rounds)

  users.push({ username, password: hashedPassword }); 
  // Save user in in-memory array

  res.json({ message: "User registered successfully!" }); 
  // Respond to frontend
});

/* --------------------- START SERVER --------------------- */
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
