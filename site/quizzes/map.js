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

    const statusPanel = document.getElementById('status-panel');
    const statusText = document.getElementById('status-text');

    // Fetch both quizzes.json and commute_matrix.json simultaneously
    Promise.all([
        fetch('data/quizzes.json').then(response => {
            if (!response.ok) throw new Error('Network response for quizzes was not ok');
            return response.json();
        }),
        fetch('data/commute_matrix.json').then(response => {
            if (!response.ok) throw new Error('Network response for commute matrix was not ok');
            return response.json();
        })
    ])
    .then(([quizzesData, commuteMatrixData]) => {
        // Filter out items that failed geocoding
        allQuizzes = quizzesData.filter(q => q.lat !== null && q.lon !== null);
        
        // Merge commute data into quizzes using the unique key
        allQuizzes.forEach(quiz => {
            const key = `${quiz.title}_${quiz.address}`;
            quiz.commute = commuteMatrixData[key] || null;
        });

        statusPanel.classList.remove('hidden');
        statusText.textContent = `Loaded ${allQuizzes.length} quizzes.`;
        
        // Hide status after 3 seconds
        setTimeout(() => {
            statusPanel.classList.add('hidden');
        }, 3000);
        
        renderMarkers('All');
    })
    .catch(error => {
        console.error('Error loading data:', error);
        statusPanel.classList.remove('hidden');
        statusText.textContent = 'Failed to load quiz data.';
    });

    function getCommuteDistanceClass(commuteInfo) {
        if (!commuteInfo || typeof commuteInfo.minutes === 'undefined') {
            return '';
        }
        if (commuteInfo.minutes < 15) {
            return 'commute-near';
        }
        if (commuteInfo.minutes <= 30) {
            return 'commute-medium';
        }
        return 'commute-far';
    }

    function buildMarkerIcon(commuteInfo) {
        const markerClass = getCommuteDistanceClass(commuteInfo);
        return L.divIcon({
            className: `custom-marker ${markerClass}`.trim(),
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            popupAnchor: [0, -7]
        });
    }

    function buildCommuteHtml(commuteInfo) {
        if (!commuteInfo) {
            return '<p><strong>Commute:</strong> Unavailable</p>';
        }

        return `
            <p><strong>Commute:</strong> ${commuteInfo.minutes} minutes from ${commuteInfo.stationName} via ${commuteInfo.modeLabel}</p>
            <a href="${commuteInfo.mapsLink}" target="_blank" rel="noopener noreferrer">View route on Maps</a>
        `;
    }

    // Render markers based on selected day
    function renderMarkers(dayFilter) {
        // Clear existing markers
        currentMarkers.forEach(marker => map.removeLayer(marker));
        currentMarkers = [];

        const filteredQuizzes = dayFilter === 'All' 
            ? allQuizzes 
            : allQuizzes.filter(q => q.day === dayFilter);

        filteredQuizzes.forEach(quiz => {
            const marker = L.marker([quiz.lat, quiz.lon], { icon: buildMarkerIcon(quiz.commute) }).addTo(map);
            
            const popupContent = `
                <div class="popup-inner">
                    <h3>${quiz.title}</h3>
                    <p><strong>Day:</strong> ${quiz.day}</p>
                    <p><strong>Time:</strong> ${quiz.time || 'N/A'}</p>
                    <p><strong>Address:</strong> ${quiz.address}</p>
                    ${buildCommuteHtml(quiz.commute)}
                    <a href="${quiz.link}" target="_blank" rel="noopener noreferrer">View on QuizFinder</a>
                </div>
            `;
            
            marker.bindPopup(popupContent);
            currentMarkers.push(marker);
        });
    }

    // Filter button logic
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all
            filterButtons.forEach(b => b.classList.remove('active'));
            // Add to clicked
            e.target.classList.add('active');
            
            const selectedDay = e.target.getAttribute('data-day');
            renderMarkers(selectedDay);
        });
    });
});
