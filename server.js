import express from "express";
import { analyzeProduct, parseProductUrl } from "./lib/analyze.js";

const PORT = Number(process.env.PORT) || 3847;
const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

app.post("/api/crawl", async (req, res) => {
  const controller = new AbortController();
  const onClientGone = () => {
    if (!res.writableEnded) controller.abort();
  };
  res.on("close", onClientGone);

  try {
    const parsed = parseProductUrl(req.body?.url);
    const response = await fetch(parsed.jsUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      res.status(404).json({
        error: `Could not load that product (${response.status}). Check the URL and try again.`,
      });
      return;
    }

    const product = await response.json();
    res.json(analyzeProduct(product, parsed.variantId));
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError") {
      if (!res.headersSent) {
        res.status(499).json({ error: "Crawl stopped." });
      }
      return;
    }

    const message = error instanceof Error ? error.message : "Crawl failed.";
    res.status(400).json({ error: message });
  } finally {
    res.off("close", onClientGone);
  }
});

app.listen(PORT, () => {
  console.log(`Unlinked variant images running at http://localhost:${PORT}`);
});
