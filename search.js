const fetch = require("node-fetch");
const NodeCache = require("node-cache");

// Cache configuration (10 minute TTL, check every 5 mins for expired items)
const searchCache = new NodeCache({ stdTTL: 600, checkperiod: 300 });

// GitHub API configuration
const GITHUB_API_URL = "https://api.github.com/search/repositories";

/**
 * Builds a GitHub search query from provided parameters
 * @param {Object} params - Search parameters
 * @returns {String} Formatted GitHub search query
 */
function buildGitHubQuery(params) {
    const {
        query,
        language,
        minStars,
        goodFirstIssues,
        recentlyActive
    } = params;
    
    // Start with basic query
    let searchQuery = query ? `${query} in:name,description,readme` : "";
    
    // Add language filter
    if (language && language.trim() !== "") {
        searchQuery += ` language:${language.trim()}`;
    }
    
    // Add stars filter
    if (minStars && !isNaN(parseInt(minStars))) {
        searchQuery += ` stars:>=${parseInt(minStars)}`;
    }
    
    // Add good first issues filter
    if (goodFirstIssues === "true") {
        searchQuery += " help-wanted-issues:>0";
    }
    
    // Add recently active filter
    if (recentlyActive === "true") {
        // Repositories updated in the last month
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const formattedDate = thirtyDaysAgo.toISOString().split('T')[0];
        searchQuery += ` pushed:>${formattedDate}`;
    }
    
    return searchQuery.trim();
}

/**
 * Validates search parameters
 * @param {Object} params - Search parameters
 * @returns {Object} Validation result
 */
function validateSearchParams(params) {
    const { query, language } = params;
    
    // Check if there's at least some search criteria
    if (!query && !language) {
        return { 
            isValid: false, 
            error: "Please provide at least a query or language" 
        };
    }
    
    return { isValid: true };
}

/**
 * Get normalized sort and order parameters
 * @param {String} sortOption - Sort option from frontend
 * @returns {Object} Sort and order parameters
 */
function getSortParams(sortOption) {
    let sortParam = "stars";
    let orderParam = "desc";
    
    switch (sortOption) {
        case "updated":
            sortParam = "updated";
            break;
        case "forks":
            sortParam = "forks";
            break;
        case "help-wanted-issues":
            sortParam = "help-wanted-issues";
            break;
        default:
            sortParam = "stars";
    }
    
    return { sortParam, orderParam };
}

/**
 * Search for repositories on GitHub
 * @param {Object} params - Search parameters
 * @param {String} githubToken - Optional GitHub API token
 * @returns {Promise<Object>} Search results
 */
async function searchGitHubRepositories(params, githubToken) {
    // Extract and validate parameters
    const {
        query,
        language,
        minStars = "0",
        sort = "stars",
        goodFirstIssues = "false",
        recentlyActive = "false", 
        page = "1",
        perPage = "10"
    } = params;
    
    // Validate search parameters
    const validation = validateSearchParams(params);
    if (!validation.isValid) {
        throw new Error(validation.error);
    }
    
    // Build GitHub search query
    const searchQuery = buildGitHubQuery({
        query, language, minStars, goodFirstIssues, recentlyActive
    });
    
    // Get sort parameters
    const { sortParam, orderParam } = getSortParams(sort);
    
    // Build GitHub API URL
    const url = `${GITHUB_API_URL}?q=${encodeURIComponent(searchQuery)}&sort=${sortParam}&order=${orderParam}&page=${page}&per_page=${perPage}`;
    
    // Generate cache key
    const cacheKey = `github-search-${searchQuery}-${sortParam}-${orderParam}-${page}-${perPage}`;
    
    // Check cache first
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult) {
        return cachedResult;
    }
    
    // Set up request headers
    const headers = {
        "User-Agent": "Open-Source-Project-Finder",
        "Accept": "application/vnd.github.v3+json"
    };
    
    // Add GitHub token if available (for higher rate limits)
    if (githubToken) {
        headers["Authorization"] = `token ${githubToken}`;
    }
    
    // Execute the request
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`GitHub API Error: ${response.statusText} - ${errorData.message || ''}`);
    }
    
    const data = await response.json();
    
    // Format response
    const result = {
        items: data.items || [],
        total_count: data.total_count || 0,
        page: parseInt(page),
        per_page: parseInt(perPage)
    };
    
    // Cache the result
    searchCache.set(cacheKey, result);
    
    return result;
}

module.exports = {
    searchGitHubRepositories,
    buildGitHubQuery,
    validateSearchParams
};