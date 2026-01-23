const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { auth, requiredScopes } = require('express-oauth2-jwt-bearer'); // Import auth and requiredScopes

const app = express();
const PORT = process.env.PORT || 3001;
const MOVIES_FILE = path.join(__dirname, 'data', 'movies.json');

// --- Auth0 Configuration ---
// This middleware will check for a valid JWT in the Authorization header.
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE || 'https://movies.example.com', // The identifier of your Auth0 API
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || 'https://movies-demo.us.auth0.com' // Your Auth0 domain
});

// Custom middleware to check permissions from the token's permissions array
const checkPermissions = (req, res, next) => {
    const permissions = req.auth?.payload?.permissions || [];
    if (!permissions.includes('manage:movies')) {
        return res.status(403).send('Insufficient scope for this resource');
    }
    next();
};


// --- Middleware ---
app.use(express.json());
app.use(cors());


// --- Helper Functions (No Change) ---
const readMovies = async () => {
    try {
        const data = await fs.readFile(MOVIES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
};
const writeMovies = async (movies) => {
    await fs.writeFile(MOVIES_FILE, JSON.stringify(movies, null, 2), 'utf-8');
};


// --- API Endpoints ---

// GET /api/movies - Publicly accessible for any authenticated user
// We apply 'checkJwt' to ensure the user is logged in, but no specific permissions are needed.
app.get('/api/movies', checkJwt, async (req, res) => {
    try {
        const movies = await readMovies();
        res.json(movies);
    } catch (error) {
        res.status(500).send('Error reading movie data.');
    }
});

// POST /api/movies - PROTECTED: Requires 'manage:movies' permission
app.post('/api/movies', checkJwt, checkPermissions, async (req, res) => {
    // ... function content is the same ...
    try {
        const { title } = req.body;
        if (!title) return res.status(400).send('Movie title is required.');
        const movies = await readMovies();
        const newMovie = { id: movies.length > 0 ? Math.max(...movies.map(m => m.id)) + 1 : 1, title, watched: false };
        movies.push(newMovie);
        await writeMovies(movies);
        res.status(201).json(newMovie);
    } catch (error) { res.status(500).send('Error saving new movie.'); }
});

// PUT /api/movies/:id - PROTECTED: Requires 'manage:movies' permission
app.put('/api/movies/:id', checkJwt, checkPermissions, async (req, res) => {
    // ... function content is the same ...
    try {
        const movies = await readMovies();
        const movieIndex = movies.findIndex(m => m.id === parseInt(req.params.id));
        if (movieIndex === -1) return res.status(404).send('Movie not found.');
        movies[movieIndex].watched = !movies[movieIndex].watched;
        await writeMovies(movies);
        res.json(movies[movieIndex]);
    } catch (error) { res.status(500).send('Error updating movie.'); }
});

// DELETE /api/movies/:id - PROTECTED: Requires 'manage:movies' permission
app.delete('/api/movies/:id', checkJwt, checkPermissions, async (req, res) => {
    // ... function content is the same ...
    try {
        let movies = await readMovies();
        const filteredMovies = movies.filter(m => m.id !== parseInt(req.params.id));
        if (movies.length === filteredMovies.length) return res.status(404).send('Movie not found.');
        await writeMovies(filteredMovies);
        res.status(204).send();
    } catch (error) { res.status(500).send('Error deleting movie.'); }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
