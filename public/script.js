// Global variables
let currentPage = 1;
let totalPages = 1;
let currentSearchParams = {};

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Language selector behavior
    document.getElementById('language').addEventListener('change', function() {
        document.getElementById('customLanguageContainer').style.display = 
            this.value === 'other' ? 'block' : 'none';
    });
    
    // Toggle advanced filters
    document.getElementById('toggleFilters').addEventListener('click', function() {
        const filtersDiv = document.querySelector('.filters');
        const isVisible = filtersDiv.style.display !== 'none';
        
        filtersDiv.style.display = isVisible ? 'none' : 'grid';
        
        // Update icon (rotate it when open)
        const icon = this.querySelector('svg');
        icon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
    });
    
    // Add keyboard navigation
    document.getElementById('searchQuery').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchProjects();
        }
    });
    
    // Pagination listeners
    document.getElementById('prevPage').addEventListener('click', () => navigateToPage(currentPage - 1));
    document.getElementById('nextPage').addEventListener('click', () => navigateToPage(currentPage + 1));
});

// Main search function
async function searchProjects(page = 1) {
    // Show loader
    document.getElementById('loader').style.display = 'block';
    document.getElementById('error').style.display = 'none';
    document.getElementById('results').innerHTML = '';
    
    // Get search parameters
    const query = document.getElementById('searchQuery').value.trim();
    let language = document.getElementById('language').value;
    const customLanguage = document.getElementById('customLanguage').value.trim();
    
    // Use custom language if provided
    if (language === 'other' && customLanguage) {
        language = customLanguage;
    }
    
    // Get advanced filters
    const minStars = document.getElementById('minStars').value.trim();
    const sort = document.getElementById('sort').value;
    const perPage = document.getElementById('projectsPerPage')?.value || 10;
    const goodFirstIssues = document.getElementById('goodFirstIssues').checked;
    const recentlyActive = document.getElementById('recentlyActive').checked;
    const includeReadme = document.getElementById('includeReadme').checked;
    
    // Save current search parameters
    currentSearchParams = {
        query, language, customLanguage, minStars, 
        sort, perPage, goodFirstIssues, recentlyActive, includeReadme
    };
    
    // Update current page
    currentPage = page;
    
    try {
        // Create URL with search parameters
        const params = new URLSearchParams({
            query,
            language,
            minStars: minStars || '0',
            sort,
            goodFirstIssues: goodFirstIssues.toString(),
            recentlyActive: recentlyActive.toString(),
            includeReadme: includeReadme.toString(),
            page: page.toString(),
            perPage
        });
        
        const response = await fetch(`/search?${params.toString()}`);
        
        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Calculate pagination
        totalPages = Math.ceil(Math.min(data.total_count || 0, 1000) / perPage); // GitHub API limits to 1000 results
        
        // Display results
        displayResults(data.items || [], data.total_count);
        updatePaginationControls();
        
    } catch (error) {
        console.error('Error fetching projects:', error);
        document.getElementById('error').textContent = `Failed to fetch repositories: ${error.message}`;
        document.getElementById('error').style.display = 'block';
    } finally {
        document.getElementById('loader').style.display = 'none';
    }
}

// Display the search results
function displayResults(projects, totalCount = 0) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';
    
    if (projects.length === 0) {
        resultsDiv.innerHTML = '<div class="error-message">No projects found matching your criteria. Try adjusting your search terms.</div>';
        document.getElementById('pagination').style.display = 'none';
        return;
    }
    
    // Create project cards
    projects.forEach(project => {
        // Format date
        const updatedDate = new Date(project.updated_at);
        const formattedDate = updatedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Create card element
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        
        // Language tag
        const languageTag = project.language ? 
            `<div class="language-tag">${escapeHTML(project.language)}</div>` : '';
        
        // Project description
        const description = project.description ? 
            `<p class="project-description">${escapeHTML(project.description)}</p>` : 
            '<p class="project-description">No description available</p>';
        
        projectCard.innerHTML = `
            ${languageTag}
            <h2><a href="${project.html_url}" target="_blank">${escapeHTML(project.name)}</a></h2>
            ${description}
            <div class="project-stats">
                <div class="project-stat">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
                    </svg>
                    ${project.stargazers_count.toLocaleString()}
                </div>
                <div class="project-stat">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm0 2.122a2.25 2.25 0 1 0-1.5 0v.878A2.25 2.25 0 0 0 5.75 8.5h1.5v2.128a2.251 2.251 0 1 0 1.5 0V8.5h1.5a2.25 2.25 0 0 0 2.25-2.25v-.878a2.25 2.25 0 1 0-1.5 0v.878a.75.75 0 0 1-.75.75h-4.5A.75.75 0 0 1 5 6.25v-.878zm3.75 7.378a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm3-8.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z"/>
                    </svg>
                    ${project.forks_count.toLocaleString()}
                </div>
                <div class="project-stat">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/>
                        <path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8zm0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/>
                    </svg>
                    ${formattedDate}
                </div>
            </div>
        `;
        
        resultsDiv.appendChild(projectCard);
    });
    
    // Display pagination if needed
    document.getElementById('pagination').style.display = totalPages > 1 ? 'flex' : 'none';
}

// Update pagination controls
function updatePaginationControls() {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const pageInfo = document.getElementById('pageInfo');
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

// Navigate to a specific page
function navigateToPage(page) {
    if (page < 1 || page > totalPages) return;
    searchProjects(page);
}

// Helper function to avoid XSS attacks
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}