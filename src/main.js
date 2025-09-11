// Configuration
const CONFIG = {
  API_BASE: "https://api.htalat.com",
  // For local development, use:
  //   API_BASE: "http://localhost:4001",
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
    timestamp: Date.now(),
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
      json: async () => cached,
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
      json: async () => data,
    };
  }

  return response;
}

// Knowledge Base API fetch function
async function fetchKnowledgeBase(params = {}) {
  try {
    const url = new URL("/knowledge-base", `${CONFIG.API_BASE}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetchWithRetry(url.toString());
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch knowledge base data");
    }

    return await response.json();
  } catch (error) {
    console.error("Knowledge base fetch error:", error);
    throw error;
  }
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
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, attempt))
      );
    }
  }
}

// Global state for week navigation
let currentWeeksAgo = 0;

async function loadWeeklyData(weeksAgo = 0) {
  const container = document.getElementById("weeks-container");
  const loading = document.getElementById("loading");
  const errorDiv = document.getElementById("error");

  try {
    loading.style.display = "block";
    errorDiv.style.display = "none";

    // Update current week state
    currentWeeksAgo = weeksAgo;

    // Fetch data for specific week
    const params = weeksAgo > 0 ? { weeksAgo: weeksAgo } : {};
    const data = await fetchKnowledgeBase(params);

    // No need for cursor-based pagination state anymore
    const hasNextPage = currentWeeksAgo > 0; // Can go to next week only if not at current week
    const hasPrevPage = true; // Always allow going to previous (older) weeks

    // Clear container and render pages
    container.innerHTML = "";

    if (data.pages && data.pages.length > 0) {
      renderPagesList(data.pages, container);
    } else {
      const noPages = document.createElement("div");
      noPages.className = "no-pages";
      noPages.textContent = "No pages found";
      container.appendChild(noPages);
    }

    // Update pagination controls
    updatePaginationControls(hasNextPage, hasPrevPage);

    loading.style.display = "none";
  } catch (error) {
    loading.style.display = "none";
    errorDiv.style.display = "block";
    errorDiv.textContent = `Error loading data: ${error.message}`;
    console.error("Failed to load data:", error);
  }
}

// Render pages as a simple list
function renderPagesList(pages, container) {
  const pagesList = document.createElement("ul");
  pagesList.className = "pages-list";

  pages.forEach((page) => {
    const pageElement = createPageElement(page);
    pagesList.appendChild(pageElement);
  });

  container.appendChild(pagesList);
}

// Create a page element
function createPageElement(page) {
  const pageDiv = document.createElement("li");
  pageDiv.className = "page-item";

  const title = document.createElement("h3");
  title.className = "page-title";
  title.textContent = page.title;

  const meta = document.createElement("div");
  meta.className = "page-meta";

  const createdTime = document.createElement("span");
  createdTime.textContent = `📅 Created: ${page.createdTime}`;
  meta.appendChild(createdTime);

  if (page.parentInfo) {
    const parentInfo = document.createElement("span");
    const icon = page.parentInfo.type === "database" ? "📊" : "📄";
    parentInfo.textContent = `${icon} ${page.parentInfo.title}`;
    meta.appendChild(parentInfo);
  }

  if (page.linkProperty) {
    const externalLink = document.createElement("a");
    externalLink.href = page.linkProperty;
    externalLink.target = "_blank";
    externalLink.className = "page-link";
    externalLink.textContent = "🔗 External Link";
    meta.appendChild(externalLink);
  }

  const notionLink = document.createElement("a");
  notionLink.href = page.url;
  notionLink.target = "_blank";
  notionLink.className = "page-link";
  notionLink.textContent = "📄 Open in Notion";
  meta.appendChild(notionLink);

  pageDiv.appendChild(title);
  pageDiv.appendChild(meta);

  return pageDiv;
}

// Update pagination controls
function updatePaginationControls(hasNextPage, hasPrevPage) {
  let paginationDiv = document.getElementById("pagination");
  if (!paginationDiv) {
    paginationDiv = document.createElement("div");
    paginationDiv.id = "pagination";
    paginationDiv.className = "pagination-controls";
    document.querySelector(".container").appendChild(paginationDiv);
  }

  paginationDiv.innerHTML = "";

  // Previous week button (older weeks)
  const prevButton = document.createElement("button");
  prevButton.textContent = "← Previous Week";
  prevButton.className = "pagination-btn";
  prevButton.disabled = !hasPrevPage;
  prevButton.onclick = (e) => {
    e.preventDefault();
    loadWeeklyData(currentWeeksAgo + 1);
  };

  // Next week button (newer weeks)
  const nextButton = document.createElement("button");
  nextButton.textContent = "Next Week →";
  nextButton.className = "pagination-btn";
  nextButton.disabled = !hasNextPage;
  nextButton.onclick = (e) => {
    e.preventDefault();
    loadWeeklyData(currentWeeksAgo - 1);
  };

  // Week info
  const weekInfo = document.createElement("span");
  weekInfo.className = "page-info";
  if (currentWeeksAgo === 0) {
    weekInfo.textContent = "Current Week";
  } else {
    weekInfo.textContent = `${currentWeeksAgo} week${
      currentWeeksAgo === 1 ? "" : "s"
    } ago`;
  }

  paginationDiv.appendChild(prevButton);
  paginationDiv.appendChild(weekInfo);
  paginationDiv.appendChild(nextButton);
}

// Load data when page loads
document.addEventListener("DOMContentLoaded", () => loadWeeklyData());
