---
title: Configuration
description: Reference for Diadem's config
---

Diadem reads configuration from `src/lib/server/config.toml`, which should be linked from `config/config.toml`.

Each option is either for the server or the client. Note that all client options are publicly accessible.

```toml
[server]
[client]
```

## `server.log`

```toml
[server.log]
level = "info"
# file = "/var/log/diadem.log"
```

- `level`: log level (`crit`, `error`, `warning`, `info`, `debug`)
- `file`: optional rotating log output path

## `server.golbat`

```toml
[server.golbat]
url = "http://127.0.0.1:9001"
secret = ""
grpc = "127.0.0.1:50001"
defaultNestName = "Unknown Nest"
```

- `url`: Golbat base URL, must be accessible to Diadem's server
- `secret`: Must match your configured Golbat secret
- `grpc`: Optional. Golbat's gRPC target (`host:port`), see below
- `fortApi`: Optional, default `true`. Set to `false` to keep gyms, pokéstops and stations on SQL even when Golbat offers the fort API (this also bypasses gRPC for them). Useful for benchmarking the three paths.
- `defaultNestName`: The default nest name, as configured in Fletchling

### Golbat Fort API

It's recommended to enable in-memory forts in Golbat
(Golbat Config -> `fort_in_memory = true` + optional `preload = true`).
Diadem will then serve pokestops, gyms and stations from Golbat direclty, instead of having to go through the database.
Detection is automatic; set `fortApi = false` under `[server.golbat]` to opt out and stay on SQL regardless.

### Golbat gRPC API

When your Golbat supports gRPC, set `grpc` to that `host:port`. Diadem then runs gym, pokéstop, station and pokémon map scans over gRPC with protobuf encoding, which is markedly cheaper than the JSON HTTP API on large responses.

If a gRPC call fails for any reason, Diadem falls back to the HTTP API for that request, and for forts to SQL after that, so the map keeps working. Unset `grpc` to compare against the HTTP path.

The gRPC connection is plaintext. Keep it on a private network, as with Golbat's HTTP port.

## `server.dragonite`

```toml
[server.dragonite]
url = "http://127.0.0.1:7272"
secret = ""
```

Only used for scout.

- `url`: Dragonite base URL, must be accessible to Diadem's server
- `secret`: Must match your configured Dragonite secret

## `server.koji`

```toml
[server.koji]
url = "http://127.0.0.1:8080"
secret = "secret"
projectName = "reactmap"
```

Koji is optional. It's used for area-based permissions, area search and in the coverage map.

- `url`: Koji base URL, must be accessible to Diadem's server
- `secret`: Must match your configured Koji secret
- `projectName`: The project name used to fetch areas from

By default, Diadem shows a Globe icon for areas in the search menu. You can configure the displayed icon per area
by setting a `lucideIcon` property in Koji.
[You can find supported icons here.](https://lucide.dev/icons/) Make sure to convert the icon name from `kebab-case` to `PascalCase`.

## Reverse Geocoding

Diadem supports different geocoding providers for address search. 

Out of all options, Photon is the best fit and can be used across your mapping stack. [Find how to set it up here](/guides/photon).

### Geometry

When searching for a place, Diadem can show the resulting geometry on the map. These are not supported by all providers.
- Photon
    - Option 1: Run Photon with `-full-geometries` and set `hasGeometries` to true 
(requires ~600 GB for a planet import, [more details here](https://github.com/komoot/photon/pull/823))
    - Option 2: Configure Nominatim. When a user select a search result, geometries are fetched from Nominatim 
(jumping is instant, displaying the result may take a little)
- Pelias: Not supported
- Nominatim: Supported

### `server.photon`

```toml
[server.photon]
url = "https://photon.komoot.io/"
# basicAuth = "user:pass"
#hasGeometries = false
```

- `hasGeomtries`: If you run Photon with `-full-geometries`, set to true

### `server.pelias`

```toml
[server.pelias]
url = "https://api.geocode.earth/"
# apiKey = "..."
# basicAuth = "user:pass"
```

### `server.nominatim`

```toml
[server.nominatim]
url = "https://nominatim.openstreetmap.org/"
# basicAuth = "user:pass"
#userAgent = "Diadem / Contact: name@email.com"
```

- `userAgent`: Set this to something unique if you're using public nominatim

## `server.auth`

```toml
[server.auth]
enabled = true
optional = true
secret = ""
baseUrl = ""
```

- `enabled`: Enables authentication
- `optional`: If `true`, show a login prompt in the menu. If `false`, lock the app behind a login prompt.
- `secret`: Required when enabled. Random 32+ chars used to sign/encrypt auth cookies and OAuth tokens. Can also be set via the `BETTER_AUTH_SECRET` or `AUTH_SECRET` env var.
- `baseUrl`: Required when enabled. Public app URL (scheme + host only), e.g. `https://map.example.com`.

```toml
[server.auth.discord]
clientId = ""
clientSecret = ""
```

Currently, only Discord auth is supported.

Get your client ID and secret by setting up an application in the [Discord Developer Portal](https://discord.com/developers/applications)
and enabling OAuth2. The callback URL is `<baseUrl>/api/auth/callback/discord` — register this exact URL in the Discord OAuth app's redirect list.

## `client.discord`

```toml
[client.discord]
serverLink = "https://discord.com/invite/..."
serverId = "123..."
```

Client-facing Discord metadata used in UI. Server ID is used to check membership before prompting to join the server.

## `server.permissions`

Permission rules are an array of sets:

```toml
[[server.permissions]]
# everyone = true
# loggedIn = true
# guildId = "123..."
# roleId = "123..."
# areas = ["London"]
features = ["gym*", "quest"]
```

Rules are additive. For every rule a user matches, they get access to all its areas and features. `config.example.toml` shows some examples.

Rule match fields:

- `everyone` (bool)
- `loggedIn` (bool)
- `guildId` (Discord guild id)
- `roleId` (Discord role id)

Grant fields:

- `areas`: Koji area names (optional)
- `features`: one or more feature keys

Feature keys are granular. The bare family keys are the **narrow** grant; the `*`-suffixed
key grants the whole family, and `*` grants everything. Umbrella wildcards group several
features together (e.g. `map_object*`, `tool*`). Data you are not permitted to see is never
sent by the server, and features you cannot access are hidden in the UI (including the search
index and the search box itself).

:::caution[Breaking change]
`pokemon`, `pokestop`, `gym`, and `station` previously granted the **entire** family. They
now grant only the narrow subset (basic pokemon / plain pokestop / plain gym / plain station).
Use the `*`-suffixed wildcard (`pokemon*`, `pokestop*`, `gym*`, `station*`) to restore the old
"whole family" behaviour. Configs using `*` are unaffected.
:::

Supported feature keys:

- `*` — everything
- **Pokemon:** `pokemon` (basic — no iv/pvp/cp/level), `pokemon_iv` (iv/cp/level), `pokemon_pvp` (full — iv + pvp), `pokemon*`
- **Pokestops:** `pokestop` (plain), `quest`, `invasion`, `lure`, `contest`, `kecleon`, `golden_pokestop`, `pokestop*`
- **Gyms:** `gym` (plain), `raid`, `gym*`
- **Stations:** `station` (plain), `max_battle`, `station*`
- **Other map objects:** `nest`, `tappable`, `s2cell`, `spawnpoint`, `route`
- **Tools:** `scout`, `coverage_map`, `wayfarer_map`
- **UI:** `search`, `weather`

Umbrella wildcards bundle several of the above:

- `map_object*` — every map object (`pokemon*`, `pokestop*`, `gym*`, `station*` and all minor map objects)
- `minor_map_object*` — map objects with no sub-features (`nest`, `tappable`, `s2cell`, `spawnpoint`, `route`)
- `tool*` — `scout`, `coverage_map`, `wayfarer_map`
- `ui*` — `search`, `weather`

## `server.limits`

Rate-limiting is pretty bare-bones, but should work.

Controls request limits and optional rate limiting.

```toml
[server.limits]
enableRateLimiting = false
nonDeltaMultiplier = 3
heavyFilterMultiplier = 2
heavyFilterRatio = 0.2
```

- `enableRateLimiting`: turn limiter on/off
- `nonDeltaMultiplier`: extra cost for full queries
- `heavyFilterMultiplier`: extra cost for highly filtered full queries
- `heavyFilterRatio`: threshold for what is considered a heavy filter query

Per-type overrides:

```toml
[server.limits.pokemon]
requestLimit = 10000
rateLimit = 2000000
rateLimitTime = 3600
```

Available keys:

- `pokemon`, `pokestop`, `gym`, `station`, `nest`, `spawnpoint`, `route`, `tappable`, `s2cell`

## `server.db` and `server.internalDb`

```toml
[server.db]
host = "127.0.0.1"
port = 3306
database = "golbat"
user = ""
password = ""

[server.internalDb]
host = "127.0.0.1"
port = 3306
database = "diadem"
user = ""
password = ""
```

- `server.db`: external Golbat DB used for data queries (user needs SELECT permissions)
- `server.internalDb`: internal Diadem DB used for users/sessions (user needs ALL permissions)

## `client.general`

```toml
[client.general]
mapName = "Diadem"
defaultLocale = "en"
customHome = false
defaultLat = 51.516855
defaultLon = -0.080500
defaultZoom = 15
# minZoom = 0
# maxZoom = 20
url = ""
image = ""
description = ""
allowCrawlers = false
disallowedPaths = []
msgpack = true
```

- branding and defaults for map and metadata
- `customHome`: When true, `/` renders custom home and map moves to `/map`
- `defaultLat`, `defaultLon`, `defaultZoom`: The default map position for first-time users
- `minZoom`, `maxZoom`: Locking users into a map zoom range
- `url`, `image`, `description`: SEO/OpenGraph metadata
- `allowCrawlers`, `disallowedPaths`: robots.txt config
- `msgpack`: Default `true`. The map client and API exchange MessagePack, which is about a fifth smaller than JSON but costs roughly three times the CPU to encode and decode on both ends. Set to `false` to use JSON instead, which is the better trade on a CPU-bound server or for clients on fast connections.

## `server.staticMap`

```toml
[server.staticMap]
enabled = false
url = "https://tiles.example.com"
diademUrl = "https://map.example.com"
# style = "positron"
```

Controls static map rendering for link previews. It's recommended to use [Rampardos](https://github.com/lenisko/rampardos)
or [SwiftTileserverCache](https://github.com/123FLO321/SwiftTileserverCache).

- `url`: Base Tileserver URL, as accessible from your Diadem server
- `diademUrl`: Public Diadem URL, used for image links
- `style`: Optional map style id override, otherwise uses the default light [Map Style ID](#clientmapstyles)

## `client.tools`

```toml
[client.tools]
showToolsMenu = true
coverageMap = true
scout = true
```

Enables/disables the different tools. `showToolsMenu` disables the Tools menu altogether.

## `client.mapPositions`

```toml
[client.mapPositions]
coverageMapLat = 51.516855
coverageMapLon = -0.080500
coverageMapZoom = 10

# Static UI
styleLat = 53.563
styleLon = 9.979
styleZoom = 12
coverageLat = 53.563
coverageLon = 9.979
coverageZoom = 5.5
scoutLat = 53.563
scoutLon = 9.979
scoutZoom = 10.5
```

There are a couple of maps used throughout Diadem that are independent of the main map.
Use this to control where they're positioned.

- `coverageMap...`: The initial position when opening the coverage map
- `style...`: Position for style previews in the profile menu
- `coverage...`, `scout...`: Background maps used in Tools menu links

## `client.mapStyles`

Array of map style definitions.

```toml
[[client.mapStyles]]
id = "positron"
name = "Positron"
url = "https://.../style.json"
# default = "light"
# theme = "light"
# attribution = '<a href="https://...">Map data attribution</a>'
```

Supported keys:

- `id`: unique id
- `name`: display name
- `url`: style URL
- `default`: optional `light` or `dark`
- `theme`: optional `light`, `dark`, or `satellite`
- `attribution`: optional attribution HTML. MapLibre automatically reads attribution from vector
  style sources and TileJSON metadata. Set this for direct raster tile templates when the provider
  does not supply attribution metadata.

Provider attribution and branding requirements vary. Ensure each configured style meets its
provider's current terms; hiding attribution only in an application menu may not be sufficient.

## `client.uiconSets`

Configure any UIcon repo.

```toml
[[client.uiconSets]]
id = "internalName"
name = "User-facing name"
url = "https://raw.githubusercontent.com/.../"
# base = { scale = 1 }
# pokemon = { default = true, scale = 0.5 }
```

- One set should use id `DEFAULT`, it's expected for that to be [wwm-uicons](https://github.com/watwowmap/wwm-uicons).
- `url` must be a valid link to a repo that follows the UIcon standard
- You should never change or remove an ID, as this may cause the site to break for your existing users

Modifiers can be used to adjust sizing and positioning for icons on the map.

- `base` is applied to all icons
- Supported modifier keys: `pokemon`, `pokestop`, `gym`, `station`, `tappable`, `quest`, `invasion`, `max_battle`, `raid_pokemon`, `raid_pokemon_6`, `raid_egg`, `raid_egg_6`
- Supported modifier fields:
  - `default` to make this the default set for this object
  - `scale` to modify the icon's size
  - `offsetX`/`offsetY` to modify the icon's position
  - `spacing` to control the space between icons, when they can be displayed as an array

## `client.defaultFilters`

Optional. Overrides the filter state new users start with, before they make any
changes. These defaults also apply when settings are reset. Without this section, the built-in starting filters are used. Anything you leave out keeps its
built-in default, and saved user settings always take precedence over this section,
including explicitly disabled layers and empty preset lists. Changing site defaults
does not replace an existing user’s saved filters. The settings save/sync format is
unchanged.

You can override two things:

- **Whether a layer (or sub-layer) is shown by default**, with `enabled`.
- **The default filtersets** (preset filters) for a layer, with a `[[...filters]]`
  array. Providing a `filters` array fully replaces the default (empty) list for
  that layer; providing only scalar keys merges over the defaults.

```toml
# Show Pokemon by default, with a "Hundo" preset (red glow on 100% IV Pokemon)
[client.defaultFilters.pokemon]
enabled = true
[[client.defaultFilters.pokemon.filters]]
title = "Hundo"
emoji = "💯"
iv = { min = 100, max = 100 }
modifiers = { glow = { color = "rgba(251, 44, 54, {})" } }

# Enable the gym layer, hide plain gyms, and show only legendary raids
[client.defaultFilters.gym]
enabled = true
[client.defaultFilters.gym.gymPlain]
enabled = false
[client.defaultFilters.gym.raid]
enabled = true
[[client.defaultFilters.gym.raid.filters]]
title = "Legendary"
uicon = { category = "raid", params = { level = 5 } }
levels = [5]

# Turn on quests (a sub-layer of pokestops) by default
[client.defaultFilters.pokestop]
enabled = true
[client.defaultFilters.pokestop.quest]
enabled = true

# Show S2 cells at level 17 by default
[client.defaultFilters.s2cell]
enabled = true
level = 17
wayfarerMode = false
```

Layers: `pokemon`, `pokestop`, `gym`, `station`, `s2cell`, `nest`, `spawnpoint`,
`route`, `tappable`. Sub-layers include `pokestop.{pokestopPlain, quest, invasion,
contest, kecleon, goldPokestop, lure}`, `gym.{gymPlain, raid}` and
`station.{stationPlain, maxBattle}`.

Filtersets use a minimal shape; these fields are filled in automatically:

- `id` — generated if omitted
- `enabled` — defaults to `true`
- `title` — a plain string, shown as-is (or resolved as a translation key if it
  matches one)
- `icon` — set `emoji = "..."` or `uicon = { category = "...", params = { ... } }`

Preset arrays are supported for `pokemon`, `pokestopPlain`, `quest`, `invasion`,
`lure`, `gymPlain`, `raid`, `stationPlain`, and `maxBattle`. Other layers support
their enabled toggle; S2 cells also support `level` and `wayfarerMode`. Parent
layers must be enabled for their enabled sub-layers to appear.

All other keys (`iv`, `cp`, `levels`, `bosses`, `modifiers`, …) match the in-app
filter fields. A filterset that fails validation is skipped (with a console
warning) and the rest still load.

> Glow and background `modifiers` colors must use the format `rgba(r, g, b, {})`.
> The literal `{}` is an opacity placeholder the map substitutes per render — for a
> glow it fades from this color at the center to transparent at the edge. A plain
> hex value such as `#ff0000` has no placeholder, so every step stays fully opaque
> and you get a solid circle instead of a soft glow.

> In TOML, scalar keys like `enabled` must appear **before** any `[[...filters]]`
> table for the same layer.


## Multiple regional URLs (`sites`)

One Diadem process can serve several public origins with different branding and
starting settings. Add top-level site entries to your config:

```toml
[[sites]]
origin = "https://north.example.com"
[sites.client.general]
mapName = "North Map"
defaultLat = 51.5
defaultLon = -0.12
defaultZoom = 14
[sites.client.discord]
serverId = "NORTH_GUILD_ID"
serverLink = "https://discord.gg/north-invite"

[[sites]]
origin = "https://south.example.com"
[sites.client.general]
mapName = "South Map"
defaultLat = 50.8
defaultLon = -1.1
defaultZoom = 14
```

Origins must include the scheme and optional port, with no path, query, or wildcard.
They match exactly. Duplicate origins fail at startup. Each site inherits the base
`client` config. Overrides support `general` (including page title, description,
image, starting location, locale, and popup access maps), `discord`, `mapPositions`,
and `tools`; individual fields inherit when omitted. `general.url` defaults to the
site origin. A site's `defaultFilters` replaces the base default-filter configuration
as a whole; omitted filter settings use built-in defaults. Map styles, icon sets,
backend connections, and permissions are shared.

Unlisted origins use base presentation settings. In multi-site mode, Discord login
is available only on listed origins and the explicit `server.auth.baseUrl` (or
`BETTER_AUTH_URL`). Register **each** public origin's
`/api/auth/callback/discord` URL with the same Discord OAuth application. All sites
use the same auth secret and database; each origin has its own login cookie.

Point each domain at the same backend through your reverse proxy. SvelteKit must
receive the actual public origin: a fixed adapter-node `ORIGIN` pins all requests
to one site. When using `PROTOCOL_HEADER=x-forwarded-proto` and
`HOST_HEADER=x-forwarded-host`, configure your trusted proxy to overwrite those
headers and prevent clients from reaching the backend directly. Keep CDN cache
keys separated by host, including `/api/config`, metadata, and thumbnails.

Saved server-side preferences and map positions are isolated per configured origin
using the existing user-settings JSON column; no database migration is needed.
A newly configured site starts with its defaults until settings are saved there.
Browser preferences already use per-origin local storage. Existing local settings
or saved settings take precedence over defaults; config changes do not reset users.
Legacy base-site settings are retained.

### Discord roles across regions

Site selection changes presentation, **not authorization**. Existing permission
rules already add grants across multiple Discord guilds. For example:

```toml
[[server.permissions]]
guildId = "NORTH_GUILD_ID"
roleId = "NORTH_ACCESS_ROLE"
areas = ["North"]
features = ["map_object*"]

[[server.permissions]]
guildId = "SOUTH_GUILD_ID"
roleId = "SOUTH_ACCESS_ROLE"
areas = ["South"]
features = ["map_object*"]

[[server.permissions]]
guildId = "ADMIN_GUILD_ID"
roleId = "ALL_REGIONS_ROLE"
features = ["*"]
```

Area names must match geofences in your configured Koji project. A person with both
regional roles sees both regions from either URL; the global role has unrestricted
access. A missing membership, role, or failed guild lookup gives no grant from that
guild. Valid grants from other guilds remain usable. Permission refreshes follow
the existing permission-cache interval.

Enable `[server.auth]` and configure Discord credentials to use these rules. Remove
any unrestricted `everyone` or `loggedIn` grants for features you intend to restrict:
permissions add access and never subtract a broader grant. Use separate rules for
public access, logged-in access, and guild/role access; do not mix match selectors
such as `everyone = true` with a guild-specific rule. `client.discord.serverId`
controls the displayed community link/membership hint, not scan-area authorization.
