/**
 * mann.cool Leaderboard Integration for Meelode
 *
 * This module handles:
 * - Submitting scores to the mann.cool leaderboard API
 * - Fetching global high scores
 * - Caching and displaying global vs local scores
 */

// Configuration
var LEADERBOARD_API_URL = 'https://mann.cool/api/leaderboard';
var LEADERBOARD_GAME_SLUG = 'meelode';

// Cache for global scores
var globalLeaderboardCache = {
	classic: null,
	generated: null,
	lastFetch: 0
};

var CACHE_DURATION = 60000; // 1 minute cache

/**
 * Get the variant string based on play mode and data
 */
function getLeaderboardVariant(playData, playMode) {
	if (playMode === PLAY_GENERATED) {
		return 'generated';
	}

	// Map playData to game version names
	var variants = {
		1: 'classic',
		2: 'professional',
		3: 'revenge',
		4: 'fanbook',
		5: 'championship'
	};

	return variants[playData] || 'classic';
}

/**
 * Submit a score to the mann.cool leaderboard
 *
 * @param {string} playerName - Player's name
 * @param {number} score - Final score
 * @param {number} level - Level reached
 * @param {number} playData - Game version (1=classic, etc)
 * @param {number} playMode - Play mode
 * @param {boolean} isWinner - Whether player completed all levels
 * @param {function} callback - Called with {success, rank} or {error}
 */
function submitToLeaderboard(playerName, score, level, playData, playMode, isWinner, callback) {
	if (!playerName || playerName.length < 2) {
		if (callback) callback({ error: 'Invalid player name' });
		return;
	}

	if (score <= 0) {
		if (callback) callback({ error: 'Score must be positive' });
		return;
	}

	var variant = getLeaderboardVariant(playData, playMode);

	var payload = {
		game: LEADERBOARD_GAME_SLUG,
		variant: variant,
		name: playerName,
		score: score,
		level: level,
		winner: isWinner ? 1 : 0
	};

	console.log('Submitting to leaderboard:', payload);

	// Use XMLHttpRequest for broader compatibility
	var xhr = new XMLHttpRequest();
	xhr.open('POST', LEADERBOARD_API_URL, true);
	xhr.setRequestHeader('Content-Type', 'application/json');

	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				try {
					var response = JSON.parse(xhr.responseText);
					console.log('Leaderboard response:', response);

					// Invalidate cache since we just submitted
					globalLeaderboardCache[variant] = null;

					if (callback) {
						callback({
							success: true,
							rank: response.rank,
							entry: response.entry
						});
					}
				} catch (e) {
					console.error('Failed to parse leaderboard response:', e);
					if (callback) callback({ error: 'Invalid response' });
				}
			} else {
				console.error('Leaderboard submit failed:', xhr.status, xhr.responseText);
				if (callback) callback({ error: 'Submit failed: ' + xhr.status });
			}
		}
	};

	xhr.onerror = function() {
		console.error('Leaderboard network error');
		if (callback) callback({ error: 'Network error' });
	};

	try {
		xhr.send(JSON.stringify(payload));
	} catch (e) {
		console.error('Failed to send leaderboard request:', e);
		if (callback) callback({ error: 'Send failed' });
	}
}

/**
 * Fetch global leaderboard scores
 *
 * @param {number} playData - Game version
 * @param {number} playMode - Play mode
 * @param {number} limit - Max entries to fetch (default 10)
 * @param {function} callback - Called with {success, entries} or {error}
 */
function fetchGlobalLeaderboard(playData, playMode, limit, callback) {
	var variant = getLeaderboardVariant(playData, playMode);
	limit = limit || 10;

	// Check cache
	var now = Date.now();
	if (globalLeaderboardCache[variant] &&
		(now - globalLeaderboardCache.lastFetch) < CACHE_DURATION) {
		console.log('Using cached leaderboard for', variant);
		if (callback) {
			callback({
				success: true,
				entries: globalLeaderboardCache[variant],
				cached: true
			});
		}
		return;
	}

	var url = LEADERBOARD_API_URL +
		'?game=' + encodeURIComponent(LEADERBOARD_GAME_SLUG) +
		'&variant=' + encodeURIComponent(variant) +
		'&limit=' + limit;

	console.log('Fetching global leaderboard:', url);

	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);

	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				try {
					var response = JSON.parse(xhr.responseText);
					console.log('Global leaderboard:', response);

					// Update cache
					globalLeaderboardCache[variant] = response.entries || [];
					globalLeaderboardCache.lastFetch = now;

					if (callback) {
						callback({
							success: true,
							entries: response.entries || []
						});
					}
				} catch (e) {
					console.error('Failed to parse leaderboard:', e);
					if (callback) callback({ error: 'Invalid response', entries: [] });
				}
			} else {
				console.error('Leaderboard fetch failed:', xhr.status);
				if (callback) callback({ error: 'Fetch failed', entries: [] });
			}
		}
	};

	xhr.onerror = function() {
		console.error('Leaderboard network error');
		if (callback) callback({ error: 'Network error', entries: [] });
	};

	try {
		xhr.send();
	} catch (e) {
		console.error('Failed to fetch leaderboard:', e);
		if (callback) callback({ error: 'Request failed', entries: [] });
	}
}

/**
 * Format a score entry for display
 */
function formatLeaderboardEntry(entry, rank) {
	return {
		rank: rank || entry.rank,
		name: entry.name || '???',
		score: entry.score || 0,
		level: entry.level || 0,
		winner: entry.winner || false,
		timestamp: entry.timestamp
	};
}

/**
 * Check if we're online and can reach the leaderboard
 */
function isLeaderboardAvailable(callback) {
	if (!navigator.onLine) {
		if (callback) callback(false);
		return;
	}

	// Quick ping to check if API is reachable
	var xhr = new XMLHttpRequest();
	xhr.open('GET', LEADERBOARD_API_URL + '?game=ping&limit=1', true);
	xhr.timeout = 3000; // 3 second timeout

	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (callback) callback(xhr.status === 200);
		}
	};

	xhr.onerror = function() {
		if (callback) callback(false);
	};

	xhr.ontimeout = function() {
		if (callback) callback(false);
	};

	try {
		xhr.send();
	} catch (e) {
		if (callback) callback(false);
	}
}

// Export for use by other modules
window.meelodeLeaderboard = {
	submit: submitToLeaderboard,
	fetch: fetchGlobalLeaderboard,
	isAvailable: isLeaderboardAvailable,
	getVariant: getLeaderboardVariant
};

console.log('Meelode leaderboard module loaded');
