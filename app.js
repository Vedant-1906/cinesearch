const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const resultsGrid = document.getElementById('results-grid');
const loader = document.getElementById('loader');
const randomBtn = document.getElementById('random-btn');

// Surprise list of popular Indian movies and TV series
const randomSuprisePool = [
    "Sacred Games", "Mirzapur", "RRR", "Gangs of Wasseypur", 
    "3 Idiots", "Sholay", "Tumbbad", "Kalki 2898 AD", 
    "Super Deluxe", "The Family Man", "Lagaan", "Kantara"
];

// Handle search submission
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
        searchIndianAndGlobalMovies(query);
    }
});

// Human Feature: Clicking a trending shortcut pill instantly searches
document.querySelectorAll('.shortcut-tag').forEach(tag => {
    tag.addEventListener('click', () => {
        const query = tag.getAttribute('data-query');
        searchInput.value = query;
        searchIndianAndGlobalMovies(query);
    });
});

// Human Feature: Random "Surprise Me" search selector
randomBtn.addEventListener('click', () => {
    const randomIndex = Math.floor(Math.random() * randomSuprisePool.length);
    const selectedMovie = randomSuprisePool[randomIndex];
    searchInput.value = selectedMovie;
    searchIndianAndGlobalMovies(selectedMovie);
});

// Fetch movies/shows globally using Wikipedia's API
async function searchIndianAndGlobalMovies(query) {
    showLoader();
    resultsGrid.innerHTML = ''; 

    // Query Wikipedia focusing on cinematic and television keywords
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query + " film OR television series")}&utf8=&format=json&origin=*`;

    try {
        const response = await fetch(wikiUrl);
        const data = await response.json();

        if (data.query && data.query.search.length > 0) {
            const searchResults = data.query.search.slice(0, 8); // Grab top 8 results
            const detailedMovies = [];

            for (let item of searchResults) {
                const details = await fetchMovieDetails(item.title);
                detailedMovies.push({
                    title: cleanWikiTitle(item.title),
                    year: details.year,
                    poster: details.poster,
                    type: details.type,
                    cast: details.cast
                });
            }

            hideLoader();
            displayMovies(detailedMovies);
        } else {
            hideLoader();
            showError(`Could not find anything for "${query}". Check your spelling or try another keyword!`);
        }
    } catch (error) {
        hideLoader();
        showError('Network error. Check your internet connection.');
        console.error('Fetch error:', error);
    }
}

// Extract thumbnail details and parse cast
async function fetchMovieDetails(pageTitle) {
    const pageUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
    try {
        const response = await fetch(pageUrl);
        const data = await response.json();

        const poster = (data.originalimage && data.originalimage.source) 
            ? data.originalimage.source 
            : 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=600';

        const desc = data.description || "";
        const yearMatch = desc.match(/\b(19\d\d|20\d\d)\b/);
        const year = yearMatch ? yearMatch[0] : 'Released';

        let type = 'Movie';
        if (desc.toLowerCase().includes('series') || desc.toLowerCase().includes('television')) {
            type = 'TV Series';
        }

        const extract = data.extract || "";
        const cast = extractCastFromText(extract);

        return { poster, year, type, cast };
    } catch (e) {
        return {
            poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&q=80&w=600',
            year: 'N/A',
            type: 'Movie',
            cast: 'Cast details unavailable'
        };
    }
}

// Scrape actor structures out of sentences
function extractCastFromText(text) {
    const castPatterns = [
        /starring\s+([^.]+)/i,
        /stars\s+([^.]+)/i,
        /features\s+([^.]+)/i,
        /cast\s+includes\s+([^.]+)/i
    ];

    for (let pattern of castPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            let castList = match[1]
                .replace(/as\s+[A-Z][a-zA-Z]*/gi, '') // Cleans "as [Character]" tag lines
                .split(/,\s+|and\s+/)
                .map(name => name.trim())
                .filter(name => name.length > 2 && /^[A-Z]/.test(name))
                .slice(0, 3); // Top 3 billed cast members

            if (castList.length > 0) {
                return castList.join(', ');
            }
        }
    }
    return 'Lead Cast members';
}

function cleanWikiTitle(title) {
    return title.replace(/\s\((film|television|TV series|.*film.*|.*series.*)\)/gi, '');
}

// Render the final movie UI
function displayMovies(movies) {
    resultsGrid.innerHTML = movies.map(movie => `
        <div class="movie-card">
            <div class="poster-container">
                <img src="${movie.poster}" alt="${movie.title}" loading="lazy">
            </div>
            <div class="movie-info">
                <div>
                    <h3 class="movie-title">${movie.title}</h3>
                    <div class="movie-meta">
                        <span>${movie.year}</span>
                        <span class="type-tag">${movie.type}</span>
                    </div>
                </div>
                <div class="movie-cast">
                    <strong>Starring:</strong> ${movie.cast}
                </div>
            </div>
        </div>
    `).join('');
}

function showLoader() { loader.classList.remove('hidden'); }
function hideLoader() { loader.classList.add('hidden'); }
function showError(message) {
    resultsGrid.innerHTML = `<div class="message"><i class="fa-solid fa-circle-info"></i> ${message}</div>`;
}