---
title: Regional homepage
description: Configure the homepage, regional statistics, and live Golbat sightings
---

## Page and branding

Enable `client.general.customHome` and use the wrapper from `config/Home.example.svelte` as `config/Home.svelte`. `/` becomes the homepage, `/map` remains the map, and `/coverage` keeps the existing coverage explorer. Tiers live at `/#tiers`.

The homepage uses the site's existing `general.mapName` and Discord invite. Add `client.homepage` for the shared defaults; override it under `sites.client.homepage` for an exact configured origin. Theme/background fields merge individually; tier arrays replace the inherited array. The default colors match the warm dark design.

```toml
[client.general]
customHome = true

[client.homepage]
regionId = "phoenix"
liveSightings = true

[client.homepage.theme]
background = "#211e1c" # Left fade, page background, and tiers
foreground = "#f2eee7"
muted = "#b1aaa0"
button = "#e6d4b6"
buttonText = "#30291e"

[client.homepage.background]
imageUrl = "/homepage/phoenix.webp" # Pre-rendered map image
attribution = "Your map provider's required attribution"
attributionUrl = "https://tiles.example/"
# Omit imageUrl to use a solid-color background.

[[client.homepage.tiers]]
id = "regional"
label = "Regional"
price = "— / month"
benefits = ["Local map", "Pokémon IVs and PvP", "Raids and quests"]
# purchaseUrl = "https://ko-fi.com/your-page"

[[sites]]
origin = "https://beta.example.com"
[sites.client.homepage]
regionId = "phoenix" # Shares statistics/feed with the main Phoenix hostname
[sites.client.homepage.theme]
background = "#19212b"
```

Place pre-rendered images in `static/homepage/` and set `imageUrl` per hostname. Each visit loads one image instead of map tiles. The background continues behind the tiers, with attribution in the page footer. Reduced-motion users get no parallax. Tier prices/content are plain text; links appear only when a purchase URL is configured.

## Regions and counts

The app reads Golbat’s live Pokémon total through its API and caches the number for 60 seconds, shared across hostnames in each worker. This is the backend-wide total, labelled “all regions”; it does not query Pokémon SQL tables or aggregate history. Regional fort counts still use the existing SQL database and a 15-minute cache. Concurrent requests share a refresh; existing counts remain visible during refreshes and temporary failures. No companion service, metrics endpoint, or persistent history is needed.

```toml
[server.homepage]
webhookToken = "REPLACE_WITH_A_RANDOM_TOKEN_AT_LEAST_24_CHARACTERS"

[[server.homepage.regions]]
id = "phoenix"
areaIds = [20] # Koji IDs
pokemonRefreshSeconds = 60
fortRefreshSeconds = 900
maxStaleSeconds = 86400

[server.homepage.regions.sightings]
minIv = 90
species = [443, 633]
intervalSeconds = 40
```

Fort counts use the selected Koji polygons, including holes; overlaps count each fort once and deleted forts are excluded. Failed refreshes retain the previous count until its configured maximum age; unavailable counts display an em dash.

Coverage is scoped to the region for presentation. Map/scout permissions remain additive across Discord roles and hostnames.

## Live sightings

Configure Golbat to send its normal Pokémon batches directly to Diadem:

```toml
[[webhooks]]
url = "https://map.example/api/homepage/webhook/YOUR_WEBHOOK_TOKEN"
types = ["pokemon"]
```

Use the token from `server.homepage.webhookToken`. Keep the full URL private and redact it from proxy access logs. It is never included in `/api/config`. The endpoint accepts at most 10,000 events and 16 MiB per request.

For production Node deployments, set `BODY_SIZE_LIMIT=16M` so the adapter accepts the same batch sizes; the Docker runtime sets this by default.

Browsers receive sightings through `/api/homepage/live` using server-sent events (SSE), with automatic reconnection. Keep streaming responses unbuffered in your reverse proxy. Diadem's cluster forwards incoming sightings to its other workers; separate server instances would each need webhook delivery.

One matching real sighting is chosen randomly per configured interval (40 seconds by default), from Pokémon with at least 90% IVs or explicitly listed species. Cards contain species, gender, IV percentage and attack/defense/stamina values, area, local despawn time, and a Google Maps link to the spawn. These links intentionally disclose the selected spawn’s coordinates on the public homepage; scanner account details and encounter IDs remain private. Child areas provide more specific labels. Cards disappear after eight seconds; hidden tabs disconnect, and leaving the page disconnects the feed.
