// Configuration
const CONFIG = {
    API_BASE: 'https://api.htalat.com',
    // For local development, use:
    // API_BASE: 'http://localhost:3000',
    BATCH_SIZE: 5, // Process weeks in batches to avoid blocking UI
};

// Cache DOM templates for better performance
const templateCache = new Map();

// Simple in-memory cache for API responses with TTL
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(url) {
    return url;
}

function getCachedResponse(url) {
    const key = getCacheKey(url);
    const cached = apiCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    
    // Clean up expired cache entry
    if (cached) {
        apiCache.delete(key);
    }
    
    return null;
}

function setCachedResponse(url, data) {
    const key = getCacheKey(url);
    apiCache.set(key, {
        data: data,
        timestamp: Date.now()
    });
}

// Enhanced fetch with caching
async function fetchWithCache(url, options = {}, maxRetries = 3, delay = 1000) {
    // Check cache first
    const cached = getCachedResponse(url);
    if (cached) {
        // Return a fake response object that behaves like fetch response
        return {
            ok: true,
            json: async () => cached
        };
    }
    
    // Use the retry logic
    const response = await fetchWithRetry(url, options, maxRetries, delay);
    
    // Cache the response data
    if (response.ok) {
        const data = await response.json();
        setCachedResponse(url, data);
        
        // Return a fake response object
        return {
            ok: true,
            json: async () => data
        };
    }
    
    return response;
}

// Retry utility for failed requests
async function fetchWithRetry(url, options = {}, maxRetries = 3, delay = 1000) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return response;
            }
            
            // Don't retry on 4xx errors (client errors)
            if (response.status >= 400 && response.status < 500 && attempt === 0) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Throw on last attempt
            if (attempt === maxRetries) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            
            // Wait before retrying, with exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        }
    }
}

async function loadWeeklyData() {
    const container = document.getElementById('weeks-container');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    
    try {
        // Create all fetch promises in parallel with caching and retry logic
        const weekPromises = Array.from({ length: 10 }, (_, week) => 
            fetchWithCache(`${CONFIG.API_BASE}/knowledge-base?weeksAgo=${week}`)
                .then(response => response.json())
                .then(apiData => ({ week, apiData }))
                .catch(err => {
                    console.warn(`Failed to load week ${week} after retries:`, err);
                    return { week, error: err.message };
                })
        );
        
        // Wait for all requests to complete
        const results = await Promise.all(weekPromises);
        
        // Process results in order, handling both successful and failed requests
        const successfulResults = results.filter(result => !result.error);
        const failedResults = results.filter(result => result.error);
        
        // Show partial error message if some weeks failed to load
        if (failedResults.length > 0) {
            const partialErrorDiv = document.createElement('div');
            partialErrorDiv.className = 'partial-error';
            partialErrorDiv.textContent = `Warning: ${failedResults.length} week${failedResults.length > 1 ? 's' : ''} could not be loaded`;
            container.appendChild(partialErrorDiv);
        }
        
        successfulResults
            .sort((a, b) => a.week - b.week) // Ensure weeks are rendered in order
            .forEach(({ week, apiData }) => {
                const weekData = {
                    week,
                    weekLabel: getWeekLabel(week),
                    dateRange: apiData.dateRange,
                    pages: apiData.pages || [],
                    totalCount: apiData.totalCount
                };
                
                renderWeek(weekData, container);
            });
        
        loading.style.display = 'none';
    } catch (error) {
        loading.style.display = 'none';
        errorDiv.style.display = 'block';
        errorDiv.textContent = `Error loading data: ${error.message}`;
    }
}

function getWeekLabel(weeksAgo) {
    if (weeksAgo === 0) return 'This Week';
    if (weeksAgo === 1) return 'Last Week';
    return `${weeksAgo} Weeks Ago`;
}


// Optimized template caching and slot filling
function getTemplate(templateId) {
    if (!templateCache.has(templateId)) {
        const template = document.getElementById(templateId);
        if (template) {
            templateCache.set(templateId, template);
        }
    }
    return templateCache.get(templateId);
}

function fillSlot(element, slotName, content) {
    const slot = element.querySelector(`slot[name="${slotName}"]`);
    if (slot) {
        if (typeof content === 'string') {
            slot.textContent = content;
        } else {
            slot.replaceWith(content);
        }
    }
}

function setSlotAttribute(element, dataSlot, value) {
    const target = element.querySelector(`[data-slot="${dataSlot}"]`);
    if (target) {
        target.href = value;
    }
}

function renderWeek(weekData, container) {
    const template = getTemplate('week-template');
    if (!template) return;
    
    const weekElement = template.content.cloneNode(true);
    
    fillSlot(weekElement, 'week-label', weekData.weekLabel);
    fillSlot(weekElement, 'date-range', weekData.dateRange);
    fillSlot(weekElement, 'page-count', `${weekData.totalCount} page${weekData.totalCount !== 1 ? 's' : ''}`);
    
    let weekContent;
    if (weekData.pages.length === 0) {
        const noPages = document.createElement('div');
        noPages.className = 'no-pages';
        noPages.textContent = 'No pages created this week';
        weekContent = noPages;
    } else {
        const pagesList = document.createElement('ul');
        pagesList.className = 'pages-list';
        
        // Use document fragment for efficient DOM manipulation
        const fragment = document.createDocumentFragment();
        
        weekData.pages.forEach(page => {
            const pageTemplate = getTemplate('page-item-template');
            if (!pageTemplate) return;
            
            const pageElement = pageTemplate.content.cloneNode(true);
            
            fillSlot(pageElement, 'page-title', page.title);
            fillSlot(pageElement, 'created-time', page.createdTime);
            
            if (page.parentInfo) {
                const parentTemplate = getTemplate('parent-info-template');
                if (parentTemplate) {
                    const parentElement = parentTemplate.content.cloneNode(true);
                    const icon = page.parentInfo.type === 'database' ? '📊' : '📄';
                    fillSlot(parentElement, 'parent-icon', icon);
                    fillSlot(parentElement, 'parent-title', page.parentInfo.title);
                    fillSlot(pageElement, 'parent-info', parentElement);
                }
            } else {
                const parentSlot = pageElement.querySelector('slot[name="parent-info"]');
                if (parentSlot) parentSlot.remove();
            }
            
            if (page.linkProperty) {
                const linkTemplate = getTemplate('external-link-template');
                if (linkTemplate) {
                    const linkElement = linkTemplate.content.cloneNode(true);
                    setSlotAttribute(linkElement, 'external-url', page.linkProperty);
                    fillSlot(pageElement, 'external-link', linkElement);
                }
            } else {
                const linkSlot = pageElement.querySelector('slot[name="external-link"]');
                if (linkSlot) linkSlot.remove();
            }
            
            setSlotAttribute(pageElement, 'notion-url', page.url);
            
            fragment.appendChild(pageElement);
        });
        
        pagesList.appendChild(fragment);
        
        weekContent = pagesList;
    }
    
    fillSlot(weekElement, 'week-content', weekContent);
    
    const section = weekElement.querySelector('.week-section');
    const weekHeader = section.querySelector('.week-header');
    const weekContentDiv = section.querySelector('.week-content');
    const title = section.querySelector('.week-title');
    
    // Default to collapsed for all weeks except "This Week" (week 0)
    const isCollapsed = weekData.week !== 0;
    if (isCollapsed) {
        weekContentDiv.classList.add('collapsed');
        title.querySelector('.collapse-indicator').classList.add('collapsed');
        // For collapsed sections, delay content rendering until expanded
        if (weekData.pages.length > 10) {
            weekContentDiv.setAttribute('data-lazy-content', 'true');
        }
    }
    
    // Add click handler for collapsing with lazy loading
    weekHeader.addEventListener('click', () => {
        const indicator = title.querySelector('.collapse-indicator');
        const wasCollapsed = weekContentDiv.classList.contains('collapsed');
        
        weekContentDiv.classList.toggle('collapsed');
        indicator.classList.toggle('collapsed');
        
        // If expanding and content was lazy loaded, ensure it's rendered
        if (wasCollapsed && weekContentDiv.hasAttribute('data-lazy-content')) {
            weekContentDiv.removeAttribute('data-lazy-content');
        }
    });
    
    container.appendChild(weekElement);
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', loadWeeklyData);