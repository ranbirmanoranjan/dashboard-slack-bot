const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,3000'
      ],
      executablePath: '/usr/bin/chromium-browser'
    });

    const page = await browser.newPage();

    // 🚨 VERY IMPORTANT (bypass bot detection)
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1920, height: 1080 });

    const URL = 'https://metabase.spyne.ai/public/dashboard/d2ac9248-799a-4b6a-8903-729dbfccae29?date=thismonth&enterpriseid=82255fce5&inputdata_platform=&poc_cs=&poc_ob=&r.status=&status=&status_statusdetails_catalog_qcstatus=&vinname=';

    console.log("🌐 Opening dashboard...");

    await page.goto(URL, {
      waitUntil: 'networkidle0',
      timeout: 120000
    });

    // 🚨 HARD WAIT (Metabase is slow in CI)
    console.log("⏳ Waiting 30s for full render...");
    await new Promise(r => setTimeout(r, 30000));

    // Scroll to force lazy load
    console.log("📜 Scrolling...");
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let totalHeight = 0;
        const distance = 400;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });

    // Scroll back
    await page.evaluate(() => window.scrollTo(0, 0));

    // Extra wait after scroll
    await new Promise(r => setTimeout(r, 15000));

    // Force repaint
    await page.evaluate(() => {
      document.body.style.zoom = '100%';
    });

    console.log("📸 Taking screenshot...");
    await page.screenshot({
      path: 'dashboard.png',
      fullPage: true
    });

    await browser.close();
    console.log("✅ Screenshot captured");

    // ---------------- SLACK UPLOAD ----------------

    const token = process.env.SLACK_BOT_TOKEN;
    const channelId = 'C0AUAG29SLS';
    const filePath = 'dashboard.png';
    const fileSize = fs.statSync(filePath).size;

    const urlResponse = await axios.post(
      'https://slack.com/api/files.getUploadURLExternal',
      new URLSearchParams({
        filename: 'toronto-honda-dashboard.png',
        length: fileSize
      }),
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (!urlResponse.data.ok) {
      throw new Error(urlResponse.data.error);
    }

    const { upload_url, file_id } = urlResponse.data;

    await axios.post(upload_url, fs.readFileSync(filePath), {
      headers: { 'Content-Type': 'application/octet-stream' }
    });

    const completeResponse = await axios.post(
      'https://slack.com/api/files.completeUploadExternal',
      {
        files: [{ id: file_id, title: 'Toronto Honda Dashboard' }],
        channel_id: channelId,
        initial_comment: '📊 Toronto Honda Dashboard — Auto update every 2hrs'
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(
      completeResponse.data.ok
        ? "✅ Posted to Slack!"
        : "❌ Slack Error: " + completeResponse.data.error
    );

  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
})();
