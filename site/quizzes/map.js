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
    
    const stations = [
        { name: 'Butler Station', lat: -31.6401, lon: 115.7058 },
        { name: 'Clarkson Station', lat: -31.6918, lon: 115.7165 },
        { name: 'Joondalup Station', lat: -31.7431, lon: 115.7687 },
        { name: 'Whitfords Station', lat: -31.7964, lon: 115.7458 },
        { name: 'Stirling Station', lat: -31.8917, lon: 115.8077 },
        { name: 'Perth Station', lat: -31.9523, lon: 115.8616 },
        { name: 'Elizabeth Quay Station', lat: -31.9585, lon: 115.8571 },
        { name: 'Canning Bridge Station', lat: -32.0128, lon: 115.8605 },
        { name: 'Murdoch Station', lat: -32.0676, lon: 115.8628 },
        { name: 'Cockburn Central Station', lat: -32.1217, lon: 115.8479 },
        { name: 'Aubin Grove Station', lat: -32.1682, lon: 115.8624 },
        { name: 'Kwinana Station', lat: -32.2375, lon: 115.8175 },
        { name: 'Wellard Station', lat: -32.2687, lon: 115.8412 },
        { name: 'Rockingham Station', lat: -32.2884, lon: 115.8722 },
        { name: 'Mandurah Station', lat: -32.5356, lon: 115.7425 },
        { name: 'Midland Station', lat: -31.8917, lon: 116.0056 },
        { name: 'Bassendean Station', lat: -31.9034, lon: 115.9433 }
    ];

    const commuteColorToggle = document.getElementById('commute-color-toggle');
    const commuteLegend = document.getElementById('commute-legend');
    let useCommuteColor = false;

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

    function toRadians(value) {
        return (value * Math.PI) / 180;
    }

    function haversineKm(lat1, lon1, lat2, lon2) {
        const earthRadiusKm = 6371;
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusKm * c;
    }

    function getNearestStation(quiz) {
        let nearestStation = null;
        let nearestDistance = Number.POSITIVE_INFINITY;

        stations.forEach(station => {
            const distance = haversineKm(quiz.lat, quiz.lon, station.lat, station.lon);
            if (distance < nearestDistance) {
                nearestStation = station;
                nearestDistance = distance;
            }
        });

        return { station: nearestStation, distanceKm: nearestDistance };
    }

    function getCommuteInfo(quiz) {
        if (!Number.isFinite(quiz.lat) || !Number.isFinite(quiz.lon)) {
            return null;
        }

        const { station, distanceKm } = getNearestStation(quiz);
        if (!station) {
            return null;
        }

        const isWalking = distanceKm <= 1.5;
        const minutes = isWalking
            ? Math.max(4, Math.round((distanceKm / 4.8) * 60))
            : Math.max(10, Math.round(6 + ((distanceKm / 22) * 60)));
        const modeLabel = isWalking ? 'walking' : 'bus';
        const travelMode = isWalking ? 'walking' : 'transit';
        const mapsLink = `https://www.google.com/maps/dir/?api=1&origin=${station.lat},${station.lon}&destination=${quiz.lat},${quiz.lon}&travelmode=${travelMode}`;

        return {
            stationName: station.name,
            distanceKm,
            minutes,
            modeLabel,
            mapsLink
        };
    }

    function getCommuteDistanceClass(commuteInfo) {
        if (!commuteInfo) {
            return '';
        }
        if (commuteInfo.distanceKm <= 1.5) {
            return 'commute-near';
        }
        if (commuteInfo.distanceKm <= 4) {
            return 'commute-medium';
        }
        return 'commute-far';
    }

    function buildMarkerIcon(commuteInfo) {
        const markerClass = useCommuteColor ? getCommuteDistanceClass(commuteInfo) : '';
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
            const commuteInfo = getCommuteInfo(quiz);
            const marker = L.marker([quiz.lat, quiz.lon], { icon: buildMarkerIcon(commuteInfo) }).addTo(map);
            
            const popupContent = `
                <div class="popup-inner">
                    <h3>${quiz.title}</h3>
                    <p><strong>Day:</strong> ${quiz.day}</p>
                    <p><strong>Time:</strong> ${quiz.time || 'N/A'}</p>
                    <p><strong>Address:</strong> ${quiz.address}</p>
                    ${buildCommuteHtml(commuteInfo)}
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

    commuteColorToggle.addEventListener('change', () => {
        useCommuteColor = commuteColorToggle.checked;
        commuteLegend.classList.toggle('hidden', !useCommuteColor);
        const activeButton = document.querySelector('.filter-btn.active');
        const selectedDay = activeButton ? activeButton.getAttribute('data-day') : 'All';
        renderMarkers(selectedDay);
    });
});
