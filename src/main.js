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
        // Create all fetch promises in parallel for better performance
        const weekPromises = Array.from({ length: 10 }, (_, week) => 
            fetch(`${CONFIG.API_BASE}/knowledge-base?weeksAgo=${week}`)
                .then(response => {
                    if (!response.ok) {
                        console.warn(`Failed to load week ${week}: ${response.statusText}`);
                        return null;
                    }
                    return response.json().then(apiData => ({ week, apiData }));
                })
                .catch(err => {
                    console.warn(`Failed to load week ${week}:`, err);
                    return null;
                })
        );
        
        // Wait for all requests to complete
        const results = await Promise.all(weekPromises);
        
        // Process successful results in order
        results
            .filter(result => result !== null)
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
    const template = document.getElementById('week-template');
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
        
        weekData.pages.forEach(page => {
            const pageTemplate = document.getElementById('page-item-template');
            const pageElement = pageTemplate.content.cloneNode(true);
            
            fillSlot(pageElement, 'page-title', page.title);
            fillSlot(pageElement, 'created-time', page.createdTime);
            
            if (page.parentInfo) {
                const parentTemplate = document.getElementById('parent-info-template');
                const parentElement = parentTemplate.content.cloneNode(true);
                const icon = page.parentInfo.type === 'database' ? '📊' : '📄';
                fillSlot(parentElement, 'parent-icon', icon);
                fillSlot(parentElement, 'parent-title', page.parentInfo.title);
                fillSlot(pageElement, 'parent-info', parentElement);
            } else {
                const parentSlot = pageElement.querySelector('slot[name="parent-info"]');
                if (parentSlot) parentSlot.remove();
            }
            
            if (page.linkProperty) {
                const linkTemplate = document.getElementById('external-link-template');
                const linkElement = linkTemplate.content.cloneNode(true);
                setSlotAttribute(linkElement, 'external-url', page.linkProperty);
                fillSlot(pageElement, 'external-link', linkElement);
            } else {
                const linkSlot = pageElement.querySelector('slot[name="external-link"]');
                if (linkSlot) linkSlot.remove();
            }
            
            setSlotAttribute(pageElement, 'notion-url', page.url);
            
            pagesList.appendChild(pageElement);
        });
        
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
    }
    
    // Add click handler for collapsing
    weekHeader.addEventListener('click', () => {
        const indicator = title.querySelector('.collapse-indicator');
        weekContentDiv.classList.toggle('collapsed');
        indicator.classList.toggle('collapsed');
    });
    
    container.appendChild(weekElement);
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', loadWeeklyData);