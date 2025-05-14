const express = require("express");
const app = express();
const path = require("path");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const { searchGitHubRepositories } = require("./search");

// Configure logging with morgan
app.use(morgan("dev")); // 'dev' format for development: :method :url :status :response-time ms

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Add rate limiting to prevent abuse
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: "Too many requests, please try again later." },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false   // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to search endpoint
app.use("/search", apiLimiter);

// Search endpoint
app.get("/search", async (req, res) => {
    try {
        // Execute search with query parameters
        const result = await searchGitHubRepositories(req.query, process.env.GITHUB_TOKEN);
        
        // Send repositories to frontend
        res.json(result);
    } catch (error) {
        console.error("Error fetching projects:", error);
        
        const statusCode = error.message.includes("GitHub API Error") ? 503 : 400;
        res.status(statusCode).json({ error: `Failed to fetch repositories: ${error.message}` });
    }
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ 
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Fallback route
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));