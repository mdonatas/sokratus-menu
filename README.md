# Sokratus order menu userscript

In Tampermonkey, create a new script, replace the editor contents with
`sokratus-menu.user.js`, save, and reload your usual `/order` page.
The browser must support Tampermonkey/userscripts, including on mobile.

The script makes one same-origin GET to `/menu`, keeping the current URL's
authentication ID and date. No credential is embedded in the script. It reads
all menu tabs, including hidden variants, and adds plain-text descriptions to
both the desktop and mobile order tables. It does not change checkbox values,
dispatch order events, or submit anything.

Matching uses the checkbox name's date, meal group and variant ID. Menu column
weekday labels determine the day; breakfast and afternoon descriptions are
shared only when the published nonempty versions agree. Double variant 2 uses
the regular variant 2 menu with an explanatory note. Two snacks use the regular
snack menu with a `2× kiekis` note. Missing descriptions are explicitly marked.

Each day is 14–18rem wide (normally 224–288px). Change `--sm-day-width` in the
script's CSS to adjust this; `--sm-label-width` controls the option label column.
Both tables scroll horizontally inside their containers and retain the site's
existing desktop/mobile visibility rules. Reloading or following a week link
fetches that page's corresponding menu again.

## Verification

The live pages were inspected read-only. The userscript was tested in an offline
fixture, not installed or executed against the live order.

`node verify.cjs` serves a synthetic fixture at
<http://127.0.0.1:8765/order?date=2026-09-07&id=fixture>.
It checks all 90 checkboxes across both layouts, quantity mappings, original
control identity/state, no order events, duplicate execution, text-only menu
insertion, column widths and contained scrolling. Add `&failure` to exercise a
failed menu request. Verified at 390px and 1280px viewport widths. The fixture
contains no real authentication ID or child information and mocks all fetches.
