const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors'); // Import the cors package

const app = express();
const PORT = 3001;
const MOVIES_FILE = path.join(__dirname, 'data', 'movies.json');

// --- Middleware ---
app.use(express.json()); // To parse JSON bodies
app.use(cors()); // Enable CORS for all routes

// --- Helper Functions ---
const readMovies = async () => {
    try {
        const data = await fs.readFile(MOVIES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If the file doesn't exist, start with an empty array
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
};

const writeMovies = async (movies) => {
    await fs.writeFile(MOVIES_FILE, JSON.stringify(movies, null, 2), 'utf-8');
};

// --- API Endpoints ---

// GET /api/movies - Get all movies
app.get('/api/movies', async (req, res) => {
    try {
        const movies = await readMovies();
        res.json(movies);
    } catch (error) {
        res.status(500).send('Error reading movie data.');
    }
});

// POST /api/movies - Add a new movie
app.post('/api/movies', async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).send('Movie title is required.');
        }

        const movies = await readMovies();
        const newMovie = {
            id: movies.length > 0 ? Math.max(...movies.map(m => m.id)) + 1 : 1, // Generate a new ID
            title,
            watched: false,
        };
        
        movies.push(newMovie);
        await writeMovies(movies);
        
        res.status(201).json(newMovie);
    } catch (error) {
        res.status(500).send('Error saving new movie.');
    }
});

// PUT /api/movies/:id - Toggle the 'watched' status of a movie
app.put('/api/movies/:id', async (req, res) => {
    try {
        const movies = await readMovies();
        const movieIndex = movies.findIndex(m => m.id === parseInt(req.params.id));
        
        if (movieIndex === -1) {
            return res.status(404).send('Movie not found.');
        }

        // Toggle the watched status
        movies[movieIndex].watched = !movies[movieIndex].watched;

        await writeMovies(movies);
        res.json(movies[movieIndex]);
    } catch (error) {
        res.status(500).send('Error updating movie.');
    }
});

// DELETE /api/movies/:id - Delete a movie
app.delete('/api/movies/:id', async (req, res) => {
    try {
        let movies = await readMovies();
        const filteredMovies = movies.filter(m => m.id !== parseInt(req.params.id));

        if (movies.length === filteredMovies.length) {
            return res.status(404).send('Movie not found.');
        }

        await writeMovies(filteredMovies);
        res.status(204).send(); // 204 No Content for successful deletion
    } catch (error) {
        res.status(500).send('Error deleting movie.');
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
