const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json({ limit: "1mb" }));

const DEFAULT_VIEWPORTS = [
  { width: 1440, height: 900, label: "desktop" },
  { width: 390, height: 844, label: "mobile" },
];

app.post("/screenshot", async (req, res) => {
  const { url, viewports = DEFAULT_VIEWPORTS } = req.body;
  if (!url) return res.status(400).json({ error: "url is required" });

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const screenshots = [];
    for (const vp of viewports) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      // Wait a bit for any animations/lazy loads
      await new Promise((r) => setTimeout(r, 2000));
      const buffer = await page.screenshot({ fullPage: true, type: "png" });
      screenshots.push({
        label: vp.label,
        base64: buffer.toString("base64"),
        width: vp.width,
        height: vp.height,
      });
      await page.close();
    }

    res.json({ screenshots });
  } catch (err) {
    console.error("Screenshot error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get("/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Screenshot service running on port ${PORT}`));
