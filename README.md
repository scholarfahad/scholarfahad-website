# Scholar Fahad website

Free scholarship listings and application guides at scholarfahad.com.

## Adding content

Go to **scholarfahad.com/admin**, sign in with your GitHub token, and use:

- **Scholarships** to add or update a scholarship
- **Guides** to write an article
- **Site settings** to change links, follower count, prices, or add your AdSense ID

Each save updates the live site within a few minutes.

## Where things live

- `src/scholarships/` — one file per scholarship
- `src/guides/` — one file per guide
- `src/pages/` — About, Contact, Services, Privacy policy, Disclaimer
- `src/_data/site.json` — site settings
- `src/_data/services.json` — review services and prices
- `src/assets/style.css` — design
- `src/static/` — files copied as-is (Google verification file, and ads.txt later)

Built with Eleventy and hosted on Netlify.
