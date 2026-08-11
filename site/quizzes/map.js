document.addEventListener('DOMContentLoaded', () => {
    // Initialize Leaflet map, centered on Perth, WA
    const map = L.map('map', {
        zoomControl: false // We will add it manually to position it better
    }).setView([-31.95, 115.86], 10);
    
    // Add custom positioned zoom control
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Add CartoDB Positron (light mode, matching the main site)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    let allQuizzes = [];
    let currentMarkers = [];
    let currentDayFilter = 'All';
    let currentMapMode = 'commute'; // 'commute' or 'prices'

    const statusPanel = document.getElementById('status-panel');
    const statusText = document.getElementById('status-text');
    const commuteLegend = document.getElementById('commute-legend');
    const priceLegend = document.getElementById('price-legend');

    // Fetch all three datasets simultaneously
    Promise.all([
        fetch('data/quizzes.json').then(r => r.ok ? r.json() : Promise.reject('quizzes.json failed')),
        fetch('data/commute_matrix.json').then(r => r.ok ? r.json() : Promise.reject('commute_matrix.json failed')),
        fetch('data/pricing.json').then(r => r.ok ? r.json() : Promise.reject('pricing.json failed'))
    ])
    .then(([quizzesData, commuteMatrixData, pricingData]) => {
        // Filter out items that failed geocoding
        allQuizzes = quizzesData.filter(q => q.lat !== null && q.lon !== null);
        
        // Merge commute and pricing data into quizzes using the unique key
        allQuizzes.forEach(quiz => {
            const key = `${quiz.title}_${quiz.address}`;
            quiz.commute = commuteMatrixData[key] || null;
            quiz.pricing = pricingData[key] || null;
        });

        statusPanel.classList.remove('hidden');
        statusText.textContent = `Loaded ${allQuizzes.length} quizzes.`;
        
        setTimeout(() => statusPanel.classList.add('hidden'), 3000);
        
        renderMarkers();
    })
    .catch(error => {
        console.error('Error loading data:', error);
        statusPanel.classList.remove('hidden');
        statusText.textContent = 'Failed to load quiz data.';
    });

    function getCommuteDistanceClass(commuteInfo) {
        if (!commuteInfo || typeof commuteInfo.minutes === 'undefined') return '';
        if (commuteInfo.minutes < 15) return 'commute-near';
        if (commuteInfo.minutes <= 30) return 'commute-medium';
        return 'commute-far';
    }

    function getPriceClass(pricingInfo) {
        if (!pricingInfo || !pricingInfo.spenny) return '';
        const sp = pricingInfo.spenny;
        if (sp === '$') return 'spenny-1';
        if (sp === '$$') return 'spenny-2';
        if (sp === '$$$') return 'spenny-3';
        return '';
    }

    function buildMarkerIcon(quiz) {
        let markerClass = '';
        if (currentMapMode === 'commute') {
            markerClass = getCommuteDistanceClass(quiz.commute);
        } else if (currentMapMode === 'prices') {
            markerClass = getPriceClass(quiz.pricing);
            // Fade pin if no specific drink price, no happy hour, AND no specials
            if (quiz.pricing && quiz.pricing.price === null && quiz.pricing.happyHourPrice === null && !quiz.pricing.specials) {
                markerClass += ' price-missing';
            }
        }

        return L.divIcon({
            className: `custom-marker ${markerClass}`.trim(),
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            popupAnchor: [0, -7]
        });
    }

    function buildPopupHtml(quiz) {
        const c = quiz.commute;
        const p = quiz.pricing;

        // Details Tab
        const detailsTab = `
            <div class="popup-tab-content active" data-tab="details">
                <p><strong>Day:</strong> ${quiz.day}</p>
                <p><strong>Time:</strong> ${quiz.time || 'N/A'}</p>
                <p><strong>Address:</strong> ${quiz.address}</p>
                <a href="${quiz.link}" target="_blank" rel="noopener noreferrer">View on QuizFinder</a>
            </div>
        `;

        // Commute Tab
        let commuteTab = `<div class="popup-tab-content" data-tab="commute"><p><strong>Commute:</strong> Unavailable</p></div>`;
        if (c) {
            commuteTab = `
                <div class="popup-tab-content" data-tab="commute">
                    <p><strong>Commute:</strong> ${c.minutes} mins from ${c.stationName}</p>
                    <p><strong>Mode:</strong> ${c.modeLabel}</p>
                    <a href="${c.mapsLink}" target="_blank" rel="noopener noreferrer">View Route</a>
                </div>
            `;
        }

        // Pricing Tab
        let pricingTab = `<div class="popup-tab-content" data-tab="pricing"><p><strong>Pricing:</strong> Unavailable</p></div>`;
        if (p) {
            const pint = p.price ? `$${p.price.toFixed(2)} (${p.beerName || 'Pint'})` : 'Unknown';
            const hh = p.quizDayHappyHour ? `<p><strong>Happy Hour:</strong> ${p.quizDayHappyHour} ${p.happyHourPrice ? '($' + p.happyHourPrice.toFixed(2) + ')' : ''}</p>` : '';
            const sp = p.specials ? `<p><strong>Specials:</strong> ${p.specials}</p>` : '';
            const spenny = p.spenny ? `<p><strong>Cost Tier:</strong> ${p.spenny}</p>` : '';
            const source = p.sourceUrl ? `<a href="${p.sourceUrl}" target="_blank" rel="noopener noreferrer">View Source</a>` : '';

            pricingTab = `
                <div class="popup-tab-content" data-tab="pricing">
                    ${spenny}
                    <p><strong>Cheapest Pint:</strong> ${pint}</p>
                    ${hh}
                    ${sp}
                    ${source}
                </div>
            `;
        }

        return `
            <div class="popup-inner">
                <h3>${quiz.title}</h3>
                <div class="popup-tabs-nav">
                    <button class="popup-tab-btn active" onclick="switchPopupTab(event, 'details')">Details</button>
                    <button class="popup-tab-btn" onclick="switchPopupTab(event, 'commute')">Commute</button>
                    <button class="popup-tab-btn" onclick="switchPopupTab(event, 'pricing')">Pricing</button>
                </div>
                ${detailsTab}
                ${commuteTab}
                ${pricingTab}
            </div>
        `;
    }

    // Render markers based on state
    function renderMarkers() {
        // Clear existing markers
        currentMarkers.forEach(marker => map.removeLayer(marker));
        currentMarkers = [];

        const filteredQuizzes = currentDayFilter === 'All' 
            ? allQuizzes 
            : allQuizzes.filter(q => q.day === currentDayFilter);

        filteredQuizzes.forEach(quiz => {
            const marker = L.marker([quiz.lat, quiz.lon], { icon: buildMarkerIcon(quiz) }).addTo(map);
            marker.bindPopup(buildPopupHtml(quiz));
            currentMarkers.push(marker);
        });
    }

    // Filter button logic
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentDayFilter = e.target.getAttribute('data-day');
            renderMarkers();
        });
    });

    // Map Mode Toggle Logic
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentMapMode = e.target.getAttribute('data-mode');
            
            // Toggle Legends
            if (currentMapMode === 'commute') {
                commuteLegend.classList.remove('hidden');
                priceLegend.classList.add('hidden');
            } else {
                commuteLegend.classList.add('hidden');
                priceLegend.classList.remove('hidden');
            }

            // Re-render markers to update colors
            renderMarkers();
        });
    });
});

// Global function to handle tab switching within Leaflet popups
window.switchPopupTab = function(event, tabName) {
    const popupNav = event.target.closest('.popup-tabs-nav');
    const popupInner = event.target.closest('.popup-inner');
    
    if (!popupNav || !popupInner) return;

    // Update active button
    popupNav.querySelectorAll('.popup-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update active content
    popupInner.querySelectorAll('.popup-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const activeContent = popupInner.querySelector(`.popup-tab-content[data-tab="${tabName}"]`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
};
