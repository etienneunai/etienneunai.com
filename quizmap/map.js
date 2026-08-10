document.addEventListener('DOMContentLoaded', () => {
    // Initialize Leaflet map, centered on Perth, WA
    const map = L.map('map', {
        zoomControl: false // We will add it manually to position it better
    }).setView([-31.95, 115.86], 10);
    
    // Add custom positioned zoom control
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Add CartoDB Positron (light mode, but inverted via CSS to look dark/cyberpunk)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    let allQuizzes = [];
    let currentMarkers = [];
    
    // Create custom marker icon
    const customIcon = L.divIcon({
        className: 'custom-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
    });

    const statusPanel = document.getElementById('status-panel');
    const statusText = document.getElementById('status-text');

    // Fetch the quiz data
    fetch('data/quizzes.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Filter out items that failed geocoding
            allQuizzes = data.filter(q => q.lat !== null && q.lon !== null);
            statusPanel.classList.remove('hidden');
            statusText.textContent = `Loaded ${allQuizzes.length} quizzes.`;
            
            // Hide status after 3 seconds
            setTimeout(() => {
                statusPanel.classList.add('hidden');
            }, 3000);
            
            renderMarkers('All');
        })
        .catch(error => {
            console.error('Error loading quizzes:', error);
            statusPanel.classList.remove('hidden');
            statusText.textContent = 'Failed to load quiz data.';
        });

    // Render markers based on selected day
    function renderMarkers(dayFilter) {
        // Clear existing markers
        currentMarkers.forEach(marker => map.removeLayer(marker));
        currentMarkers = [];

        const filteredQuizzes = dayFilter === 'All' 
            ? allQuizzes 
            : allQuizzes.filter(q => q.day === dayFilter);

        filteredQuizzes.forEach(quiz => {
            const marker = L.marker([quiz.lat, quiz.lon], { icon: customIcon }).addTo(map);
            
            const popupContent = `
                <div class="popup-inner">
                    <h3>${quiz.title}</h3>
                    <p><strong>Day:</strong> ${quiz.day}</p>
                    <p><strong>Time:</strong> ${quiz.time || 'N/A'}</p>
                    <p><strong>Address:</strong> ${quiz.address}</p>
                    <a href="${quiz.link}" target="_blank" rel="noopener noreferrer">View Event</a>
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
