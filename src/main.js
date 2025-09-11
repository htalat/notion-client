// Configuration
const CONFIG = {
    API_BASE: 'https://api.htalat.com',
    // For local development, use:
    // API_BASE: 'http://localhost:3000',
};

async function loadWeeklyData() {
    const container = document.getElementById('weeks-container');
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    
    try {
        for (let week = 0; week < 10; week++) {
            try {
                const response = await fetch(`${CONFIG.API_BASE}/knowledge-base?weeksAgo=${week}`);
                if (!response.ok) {
                    console.warn(`Failed to load week ${week}: ${response.statusText}`);
                    continue;
                }
                
                const apiData = await response.json();
                
                // Transform API response to match expected format
                const weekData = {
                    week,
                    weekLabel: getWeekLabel(week),
                    dateRange: apiData.dateRange,
                    pages: apiData.pages || [],
                    totalCount: apiData.totalCount
                };
                
                renderWeek(weekData, container);
            } catch (err) {
                console.warn(`Failed to load week ${week}:`, err);
            }
        }
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


function renderWeek(weekData, container) {
    const section = document.createElement('div');
    section.className = 'week-section';
    
    const weekHeader = document.createElement('div');
    weekHeader.className = 'week-header';
    
    const titleDiv = document.createElement('div');
    const title = document.createElement('h2');
    title.className = 'week-title';
    title.innerHTML = weekData.weekLabel + '<span class="collapse-indicator">▼</span>';
    const dateRange = document.createElement('div');
    dateRange.className = 'week-date';
    dateRange.textContent = weekData.dateRange;
    titleDiv.appendChild(title);
    titleDiv.appendChild(dateRange);
    
    const pageCount = document.createElement('span');
    pageCount.className = 'page-count';
    pageCount.textContent = `${weekData.totalCount} page${weekData.totalCount !== 1 ? 's' : ''}`;
    
    weekHeader.appendChild(titleDiv);
    weekHeader.appendChild(pageCount);
    section.appendChild(weekHeader);
    
    // Create content wrapper
    const weekContent = document.createElement('div');
    weekContent.className = 'week-content';
    
    // Default to collapsed for all weeks except "This Week" (week 0)
    const isCollapsed = weekData.week !== 0;
    if (isCollapsed) {
        weekContent.classList.add('collapsed');
        title.querySelector('.collapse-indicator').classList.add('collapsed');
    }
    
    if (weekData.pages.length === 0) {
        const noPages = document.createElement('div');
        noPages.className = 'no-pages';
        noPages.textContent = 'No pages created this week';
        weekContent.appendChild(noPages);
    } else {
        const pagesList = document.createElement('ul');
        pagesList.className = 'pages-list';
        
        weekData.pages.forEach(page => {
            const item = document.createElement('li');
            item.className = 'page-item';
            
            const title = document.createElement('div');
            title.className = 'page-title';
            title.textContent = page.title;
            
            const meta = document.createElement('div');
            meta.className = 'page-meta';
            
            const created = document.createElement('span');
            created.innerHTML = `📅 Created: ${page.createdTime}`;
            meta.appendChild(created);
            
            if (page.parentInfo) {
                const parent = document.createElement('span');
                const icon = page.parentInfo.type === 'database' ? '📊' : '📄';
                parent.innerHTML = `${icon} ${page.parentInfo.title}`;
                meta.appendChild(parent);
            }
            
            if (page.linkProperty) {
                const link = document.createElement('span');
                link.innerHTML = `🔗 <a href="${page.linkProperty}" target="_blank" class="page-link">External Link</a>`;
                meta.appendChild(link);
            }
            
            const pageUrl = document.createElement('span');
            pageUrl.innerHTML = `📄 <a href="${page.url}" target="_blank" class="page-link">Open in Notion</a>`;
            meta.appendChild(pageUrl);
            
            item.appendChild(title);
            item.appendChild(meta);
            pagesList.appendChild(item);
        });
        
        weekContent.appendChild(pagesList);
    }
    
    // Add click handler for collapsing
    weekHeader.addEventListener('click', () => {
        const indicator = title.querySelector('.collapse-indicator');
        weekContent.classList.toggle('collapsed');
        indicator.classList.toggle('collapsed');
    });
    
    section.appendChild(weekContent);
    container.appendChild(section);
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', loadWeeklyData);