// Global references and configuration
const REGIONS = [
    'Adelaide', 'Brisbane', 'Canberra', 'Darwin',
    'Hobart', 'Melbourne', 'Perth', 'Sydney'
];
// Default to Melbourne (User's location)
let selectedRegion = 'Melbourne';

// DOM Elements
const videoElement = document.getElementById('video-player');
const playlistContainer = document.getElementById('playlist');
const currentChannelName = document.getElementById('current-channel-name');
const currentProgramInfo = document.getElementById('current-program-info');
const currentStreamUrl = document.getElementById('current-stream-url');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');
const regionSelect = document.getElementById('region-select');
const currentRegionDisplay = document.getElementById('current-region-display');
const searchInput = document.getElementById('search-input');
const combinedInfoDisplay = document.getElementById('combined-info-display');

let hls = null;
let channels = [];
let favorites = {}; // {region: [urls]}

// Favorites functions
function loadFavorites() {
    const stored = localStorage.getItem('iptv-favorites');
    favorites = stored ? JSON.parse(stored) : {};
}

function saveFavorites() {
    localStorage.setItem('iptv-favorites', JSON.stringify(favorites));
}

function toggleFavorite(url) {
    if (!favorites[selectedRegion]) favorites[selectedRegion] = [];
    const index = favorites[selectedRegion].indexOf(url);
    if (index > -1) {
        favorites[selectedRegion].splice(index, 1);
    } else {
        favorites[selectedRegion].push(url);
    }
    saveFavorites();
    renderFavorites();
}

function updateStarIcon(icon, url) {
    const isFav = (favorites[selectedRegion] || []).includes(url);
    if (isFav) {
        icon.classList.remove('text-gray-400');
        icon.classList.add('text-yellow-400', 'fill-current');
    } else {
        icon.classList.remove('text-yellow-400', 'fill-current');
        icon.classList.add('text-gray-400');
    }
}

// Function to dynamically generate the playlist URL
function getPlaylistUrl(region) {
    return `https://i.mjh.nz/au/${region}/tv.json`;
}

// Helper function to validate stream URLs
function isValidStreamUrl(url) {
    return url && url.endsWith('.m3u8');
}

// SVG Icon for missing logo
const TV_ICON_SVG = `
    <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L12 19.5M12 19.5L14.25 17M12 19.5V12M15 11h3.375c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-9.75c-.621 0-1.125-.504-1.125-1.125V12.125c0-.621.504-1.125 1.125-1.125H9M15 11V5.625c0-.621-.504-1.125-1.125-1.125h-3.75c-.621 0-1.125-.504-1.125 1.125V11M15 11h-3.75"></path>
    </svg>
`;

// Helper function for logo error handling
window.handleLogoError = function(imgElement) {
    // Replace the image element with the raw SVG string
    imgElement.outerHTML = TV_ICON_SVG.trim();
};

// --- Core Playback Function ---
function playChannel(url, name, programHtml) {
    if (!url) {
        console.error("Invalid stream URL provided.");
        return;
    }

    // Update UI
    let combinedHtml = `<span class="font-semibold text-white">${name || 'Unknown Channel'}</span>`;

    let programInfo = programHtml || '<span class="italic text-gray-500">No guide information available</span>';

    // Extract 'Up Next' program info from the channel object
    const channelInList = channels.find(c => (c.url || c.mjh_master || c.stream) === url);
    if (channelInList && Array.isArray(channelInList.programs) && channelInList.programs.length > 1 && Array.isArray(channelInList.programs[1]) && channelInList.programs[1].length > 1) {
        const nextProgram = channelInList.programs[1][1];
        programInfo += ` | <span class="font-bold text-gray-400">Up Next: ${nextProgram}</span>`;
    }

    combinedHtml += ` | ${programInfo}`;

    // Add network information if available
    if (channelInList && channelInList.network) {
        combinedHtml += ` | <span class="text-gray-400">Network: ${channelInList.network}</span>`;
    }

    combinedHtml += ` | <span class="text-gray-400">${url}</span>`;

    combinedInfoDisplay.innerHTML = combinedHtml;

    // Clear original elements as their content is now in combinedInfoDisplay
    currentChannelName.textContent = '';
    currentProgramInfo.innerHTML = '';
    currentStreamUrl.textContent = '';

    videoElement.classList.add('animate-pulse'); // Add loading animation
    videoElement.pause(); // Pause current video

    // Destroy existing Hls instance if it exists
    if (hls) {
        hls.destroy();
        hls = null;
    }

    // Determine if it's an HLS stream
    const isHLS = url.endsWith('.m3u8');

    if (isHLS && Hls.isSupported()) {
        hls = new Hls();
        hls.on(Hls.Events.MEDIA_ATTACHED, function () {
            hls.loadSource(url);
            hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
                videoElement.play().catch(e => {
                    console.error("Video Playback Error (non-fatal):", e.message);
                });
                videoElement.classList.remove('animate-pulse');
            });
        });
        hls.attachMedia(videoElement);

        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                console.error('HLS Fatal Error:', data.details, data.reason);
                combinedInfoDisplay.innerHTML = `<span class="font-semibold text-red-400">Error Loading Stream</span> | Could not load stream: ${data.reason} | <span class="text-gray-400">${url}</span>`;
                videoElement.classList.remove('animate-pulse');

                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    hls.startLoad();
                } else {
                    hls.destroy();
                    hls = null;
                }
            }
        });
    } else if (isHLS && videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (e.g., Safari)
        videoElement.src = url;
        videoElement.play().catch(e => {
            console.error("Video Playback Error (non-fatal):", e.message);
            combinedInfoDisplay.innerHTML = `<span class="font-semibold text-red-400">Error Loading Stream</span> | Playback failed | <span class="text-gray-400">${url}</span>`;
        }).finally(() => {
            videoElement.classList.remove('animate-pulse');
        });
    } else {
        // Non-HLS stream, try direct playback
        videoElement.src = url;
        videoElement.play().catch(e => {
            console.error("Video Playback Error (non-fatal):", e.message);
            combinedInfoDisplay.innerHTML = `<span class="font-semibold text-red-400">Error Loading Stream</span> | Your browser may not support this format | <span class="text-gray-400">${url}</span>`;
        }).finally(() => {
            videoElement.classList.remove('animate-pulse');
        });
    }

    // Update active state in the playlist
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('bg-brand-blue/70', 'ring-2', 'ring-brand-blue');
    });
    const activeItem = document.querySelector(`.channel-item[data-url="${url}"]`);
    if (activeItem) {
        activeItem.classList.add('bg-brand-blue/70', 'ring-2', 'ring-brand-blue');
    }
}

// --- Custom Alphanumeric Channel Key Comparator (retained) ---
function compareChannelKeys(a, b) {
    const partsA = a.split('-');
    const partsB = b.split('-');

    if (partsA.length < 2 || partsB.length < 2) {
        return a.localeCompare(b);
    }

    const keyA2 = partsA[1];
    const keyB2 = partsB[1];

    const numA = parseInt(keyA2);
    const numB = parseInt(keyB2);

    const isNumAStarting = !isNaN(numA);
    const isNumBStarting = !isNaN(numB);

    let primaryComparison = 0;

    if (isNumAStarting && isNumBStarting) {
        primaryComparison = numA - numB;
    } else if (isNumAStarting && !isNumBStarting) {
        primaryComparison = -1;
    } else if (!isNumAStarting && isNumBStarting) {
        primaryComparison = 1;
    } else {
        primaryComparison = keyA2.localeCompare(keyB2);
    }

    if (primaryComparison !== 0) {
        return primaryComparison;
    }

    const restA = partsA.slice(1).join('-');
    const restB = partsB.slice(1).join('-');

    return restA.localeCompare(restB);
}
// --- End Comparator ---

// --- Fetch Playlist Function ---
async function fetchPlaylist() {
    // Reset state and show loading
    playlistContainer.innerHTML = '';
    loadingIndicator.classList.remove('hidden');
    errorMessage.classList.add('hidden');

    // Clear info when loading new region
    combinedInfoDisplay.innerHTML = '';
    currentChannelName.textContent = ''; // Keep clearing original elements just in case
    currentProgramInfo.innerHTML = '';
    currentStreamUrl.textContent = '';

    currentRegionDisplay.textContent = selectedRegion;

    const url = getPlaylistUrl(selectedRegion);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}. Trying PLS parsing fallback.`);
        }

        let data = await response.json();
        let channelArray = [];

        if (Array.isArray(data)) {
            channelArray = data;
        }
        else if (typeof data === 'object' && data !== null) {
            let foundArray = false;

            if (Array.isArray(data.channels) || Array.isArray(data.items) || Array.isArray(data.playlist)) {
                channelArray = data.channels || data.items || data.playlist;
                foundArray = true;
            }

            if (!foundArray && Object.keys(data).length > 0) {
                const sortedKeys = Object.keys(data).sort(compareChannelKeys);
                channelArray = sortedKeys.map(key => data[key]);
            }
        }

        if (channelArray.length > 0) {
            channels = channelArray;
        } else {
            throw new Error("Invalid JSON structure or empty list.");
        }

    } catch (jsonError) {
        console.warn('JSON Fetch/Parse Warning:', jsonError.message);

        // Fallback to PLS file
        try {
            const plsUrl = url.replace('tv.json', 'tv.pls');
            const plsResponse = await fetch(plsUrl);
            if (!plsResponse.ok) {
                throw new Error(`Failed to fetch JSON and PLS for ${selectedRegion}.`);
            }
            const plsText = await plsResponse.text();
            const parsedChannels = parsePLS(plsText);
            channels = parsedChannels;

            if (channels.length === 0) {
                throw new Error("PLS parsing resulted in an empty list.");
            }

        } catch (plsError) {
            console.error("Critical Error: Cannot load playlist data for selected region.", plsError);
            errorMessage.textContent = `Failed to load channels for ${selectedRegion}. The source file might not exist or be temporarily unavailable.`;
            errorMessage.classList.remove('hidden');
            loadingIndicator.classList.add('hidden');
            return;
        }
    }

    loadingIndicator.classList.add('hidden');
    renderPlaylist(channels);
    renderFavorites();
}

// Manual PLS parsing
function parsePLS(plsText) {
    const lines = plsText.split('\n');
    const newChannels = [];
    const entryMap = {};

    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('File')) {
            const match = line.match(/^File(\d+)=(.*)$/i);
            if (match) {
                const index = match[1];
                const url = match[2].trim();
                if (!entryMap[index]) entryMap[index] = {};
                entryMap[index].url = url;
            }
        } else if (line.startsWith('Title')) {
            const match = line.match(/^Title(\d+)=(.*)$/i);
            if (match) {
                const index = match[1];
                const name = match[2].trim();
                if (!entryMap[index]) entryMap[index] = {};
                entryMap[index].name = name;
            }
        }
    });

    Object.keys(entryMap).sort((a, b) => a - b).forEach(key => {
        if (entryMap[key].url && entryMap[key].name) {
            newChannels.push(entryMap[key]);
        }
    });
    return newChannels;
}

// Renders the list of channels to the UI
function renderPlaylist(channelsToRender) {
    playlistContainer.innerHTML = '';
    if (channelsToRender.length === 0) {
        playlistContainer.innerHTML = `<p class="p-4 text-center text-gray-500">No channels found.</p>`;
        return;
    }

    const groupedChannels = channelsToRender.reduce((acc, channel) => {
        const groupTitle = channel['group-title'] || 'Other Channels';
        if (!acc[groupTitle]) {
            acc[groupTitle] = [];
        }
        acc[groupTitle].push(channel);
        return acc;
    }, {});

    const groupTitles = Object.keys(groupedChannels).sort();

    groupTitles.forEach(groupTitle => {
        const groupHeader = document.createElement('div');
        groupHeader.className = 'p-2 mt-4 -mx-2 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700/50 rounded-lg z-10';
        groupHeader.innerHTML = `<h3 class="text-sm font-bold uppercase text-gray-400 px-2">${groupTitle} (${groupedChannels[groupTitle].length})</h3>`;
        playlistContainer.appendChild(groupHeader);

        const groupBody = document.createElement('div');
        groupBody.className = 'space-y-1 mt-2';
        playlistContainer.appendChild(groupBody);

        groupedChannels[groupTitle].forEach(channel => {
            const channelItem = createChannelItem(channel);
            if (channelItem) {
                groupBody.appendChild(channelItem);
            }
        });
    });
}

function createChannelItem(channel) {
    const name = channel.name || 'Unnamed Channel';
    const url = channel.url || channel.mjh_master || channel.stream;
    const logo = channel.logo || null;

    if (!url) return null;

    // --- EPG LOGIC ---
    const programs = channel.programs;
    let currentProgramHtml;

    if (Array.isArray(programs) && programs.length > 0 && Array.isArray(programs[0]) && programs[0].length > 1) {
        const currentProgram = programs[0][1] || 'Live Program';
        currentProgramHtml = `<span class="font-bold text-gray-300">Now:</span> ${currentProgram}`;
    } else {
        currentProgramHtml = '<span class="italic text-gray-500">Guide information not available</span>';
    }
    // --- END EPG LOGIC ---

    const item = document.createElement('div');
    item.className = 'channel-item-container';

    item.innerHTML = `
        <button class="channel-item flex w-full text-left p-3 rounded-xl transition-all duration-200 ease-in-out hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/70 bg-gray-700/50 text-white" data-url="${url}">
            <div class="flex items-center flex-1">
                <!-- Left part: Logo, Name, Program -->
                <div class="flex items-center space-x-2 flex-1 min-w-0">
                    <div class="flex-shrink-0">
                        ${logo ?
                            `<img src="${logo}" class="h-8 w-8 object-contain rounded" alt="${name} Logo" onerror="handleLogoError(this)">`
                            :
                            TV_ICON_SVG
                        }
                    </div>
                    <span class="font-semibold text-sm truncate">${name}</span>
                    <span class="text-xs text-gray-400 truncate">${currentProgramHtml}</span>
                </div>

                <!-- Star at the right -->
                <span class="star-btn cursor-pointer flex-shrink-0" data-url="${url}">
                    <svg class="h-4 w-4 star-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                    </svg>
                </span>
            </div>
        </button>
    `;

    const channelButton = item.querySelector('.channel-item');
    channelButton.addEventListener('click', () => {
        playChannel(url, name, currentProgramHtml);
    });

    const starBtn = item.querySelector('.star-btn');
    const starIcon = starBtn.querySelector('.star-icon');
    starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(url);
        updateStarIcon(starIcon, url);
    });
    updateStarIcon(starIcon, url);

    return item;
}

// Render favorites section
function renderFavorites() {
    const favList = document.getElementById('favorites-list');
    favList.innerHTML = '';
    const favUrls = favorites[selectedRegion] || [];
    const favChannels = channels.filter(c => favUrls.includes(c.url || c.mjh_master || c.stream));
    if (favChannels.length === 0) {
        favList.innerHTML = '<p class="text-xs text-gray-500">No favorites yet.</p>';
        return;
    }
    favChannels.forEach(channel => {
        const item = createFavoriteItem(channel);
        favList.appendChild(item);
    });
}

function createFavoriteItem(channel) {
    const name = channel.name || 'Unnamed Channel';
    const url = channel.url || channel.mjh_master || channel.stream;
    const logo = channel.logo || null;

    // Get program info
    const programs = channel.programs;
    let currentProgramHtml;
    if (Array.isArray(programs) && programs.length > 0 && Array.isArray(programs[0]) && programs[0].length > 1) {
        const currentProgram = programs[0][1] || 'Live Program';
        currentProgramHtml = `<span class="font-bold text-gray-300">Now:</span> ${currentProgram}`;
    } else {
        currentProgramHtml = '<span class="italic text-gray-500">Guide information not available</span>';
    }

    const item = document.createElement('div');
    item.className = 'favorite-item-container';

    item.innerHTML = `
        <button class="favorite-item flex w-full text-left p-2 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/70 bg-gray-600/50 text-white" data-url="${url}">
            <div class="flex items-center flex-1">
                <!-- Left part: Logo, Name, Program -->
                <div class="flex items-center space-x-2 flex-1 min-w-0">
                    <div class="flex-shrink-0">
                        ${logo ?
                            `<img src="${logo}" class="h-6 w-6 object-contain rounded" alt="${name} Logo" onerror="handleLogoError(this)">`
                            :
                            TV_ICON_SVG.replace('h-8 w-8', 'h-6 w-6')
                        }
                    </div>
                    <span class="font-semibold text-sm truncate">${name}</span>
                    <span class="text-xs text-gray-400 truncate">${currentProgramHtml}</span>
                </div>

                <!-- Star at the right -->
                <span class="star-btn cursor-pointer flex-shrink-0" data-url="${url}">
                    <svg class="h-4 w-4 star-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                    </svg>
                </span>
            </div>
        </button>
    `;

    const button = item.querySelector('.favorite-item');
    button.addEventListener('click', () => {
        playChannel(url, name, currentProgramHtml);
    });

    const starBtn = item.querySelector('.star-btn');
    const starIcon = starBtn.querySelector('.star-icon');
    updateStarIcon(starIcon, url); // Should be yellow since it's favorite
    starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(url);
    });

    return item;
}

// --- Initialization ---

function setupRegionSelector() {
    // Populate the dropdown
    REGIONS.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
    });

    // Set the default selection based on initialization ('Melbourne')
    regionSelect.value = selectedRegion;

    // Add the change listener
    regionSelect.addEventListener('change', (event) => {
        selectedRegion = event.target.value;
        // Clear current video when region changes
        combinedInfoDisplay.innerHTML = '';
        currentChannelName.textContent = ''; // Keep clearing original elements just in case
        currentProgramInfo.innerHTML = '';
        currentStreamUrl.textContent = '';
        videoElement.src = '';
        if(hls) hls.destroy();

        searchInput.value = '';
        fetchPlaylist();
    });
}

// Initialize the app when the window loads
window.onload = function() {
    const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
    const scrollableContent = document.getElementById('scrollable-content');

    // Show/hide scroll to top button based on scroll position
    scrollableContent.addEventListener('scroll', () => {
        if (scrollableContent.scrollTop > 200) { // Show button after scrolling 200px
            scrollToTopBtn.classList.remove('hidden');
        } else {
            scrollToTopBtn.classList.add('hidden');
        }
    });

    // Scroll to top when button is clicked
    scrollToTopBtn.addEventListener('click', () => {
        scrollableContent.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // 1. Setup the UI using the default region
    setupRegionSelector();

    // 2. Setup search functionality
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm) {
            const filteredChannels = channels.filter(channel => {
                const channelName = channel.name.toLowerCase();
                const programInfo = (channel.programs && Array.isArray(channel.programs) && channel.programs.length > 0 && Array.isArray(channel.programs[0]) && channel.programs[0].length > 1) ? channel.programs[0][1].toLowerCase() : '';
                return channelName.includes(searchTerm) || programInfo.includes(searchTerm);
            });
            renderPlaylist(filteredChannels);
        } else {
            renderPlaylist(channels);
        }
        renderFavorites();
    });

    // 3. Load favorites
    loadFavorites();

    // 4. Load the initial playlist
    fetchPlaylist();

    // Hide program info on mobile to prevent overflow
    function hideProgramInfoOnMobile() {
        const isMobile = window.innerWidth < 768;
        document.querySelectorAll('.channel-item .text-xs.text-gray-400, .favorite-item .text-xs.text-gray-400').forEach(span => {
            span.style.display = isMobile ? 'none' : '';
        });
    }
    hideProgramInfoOnMobile();
    window.addEventListener('resize', hideProgramInfoOnMobile);
};