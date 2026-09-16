# Unlinked image tools

A local tool for Shopify product pages. It finds **unlinked variant images**: gallery photos that sit between a color’s linked variant images.

Paste a Shopify product URL, crawl it, and review:

- Product title
- Total colors, total images, and total unlinked variant images
- A two-column table: variant color on the left, unlinked image thumbnails and filenames on the right

Each filename has its own **Copy** button. Thumbnails are 100×100.

Example URL:

```
https://store.myshopify.com/products/example
```

### How grouping works

Shopify product media is ordered. Some images are linked to a variant (featured image). Images **between** one color’s linked photos and the next color’s linked photos are treated as that color’s unlinked images.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer

## Run locally

```bash
npm install
npm start
```

Then open [http://localhost:3847](http://localhost:3847).

Stop the server with **Ctrl+C**.

### VS Code

1. Open this folder in VS Code.
2. Open a terminal (**Ctrl+`** or **Terminal → New Terminal**).
3. Run `npm install` once, then `npm start`.
4. Open [http://localhost:3847](http://localhost:3847) in a browser.

The default port is `3847`. Override it with `PORT` if needed:

```bash
PORT=3000 npm start
```

## Project layout

```
lib/analyze.js    URL parsing and unlinked-image grouping
server.js         Express app: static UI + /api/crawl proxy
public/           Browser UI (HTML, CSS, JS)
```

`POST /api/crawl` accepts `{ "url": "<product url>" }`, loads `/products/<handle>.js` from the store, and returns the title, counts, and grouped unlinked images.
