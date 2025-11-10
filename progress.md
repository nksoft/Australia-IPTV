## Current Session Progress

**Goal:** Build a simple, modern website for streaming live TV channels in Australia using data from Matt Huisman's IPTV service.

**Key Decisions:**
- Basic HTML website will be hosted on github so it has to only use html, js & css.
- Layout: large video player on left, channel list on right, region selector dropdown on top right
- Data source: https://i.mjh.nz/au/${region}/tv.json for 8 Australian regions (Adelaide, Brisbane, Canberra, Darwin, Hobart, Melbourne, Perth, Sydney)
- @tv.json has a sample output of the data source url to see the data structure. Which will be used to write JS code.
- Video streaming: hls.js for HLS (.m3u8) streams
- Styling: CSS

**Work Completed:**
- Created README.md with project description, features, data source attribution, acknowledge development using opencode and AI agents, and setup instructions

**Remaining Issues:**
- None

## Current Session Progress

**Goal:** Build a simple, modern website for streaming live TV channels in Australia using data from Matt Huisman's IPTV service.

**Key Decisions:**
- Updated to use Tailwind CSS for styling, dark theme, responsive grid layout with video player on left and channel list on right.
- Included search functionality, channel grouping, EPG display, scroll-to-top button, and footer attribution.
- Maintained data source from Matt Huisman's API, using hls.js for streaming.

**Work Completed:**
- Created index.html with modern UI structure, region selector, search input, and playlist display.
- Added styles.css with custom scrollbar and dark theme styles.
- Implemented script.js with channel fetching, rendering, search, playback, and error handling.
- Created AGENTS.md with build/lint/test commands and code style guidelines.

**Remaining Issues:**
- None

## Current Session Progress

**Goal:** Add a favorite function to the Australia IPTV website, allowing users to mark channels as favorites with a star icon.

**Key Decisions:**
- Star icon on each channel, outline gray, filled yellow when favorited.
- Favorites section above channels, scrolls with the list.
- Favorites stored in localStorage per region.
- Clicking star toggles favorite, updates UI and storage.

**Work Completed:**
- Added favorites section in HTML.
- Implemented star icons in channel items with toggle logic.
- Added localStorage for favorites persistence.
- Updated layouts for proper alignment and scrolling.
- Changed heading to "Australia IPTV" and added TV box favicon.
- Improved AGENTS.md with detailed guidelines.

**Remaining Issues:**
- None