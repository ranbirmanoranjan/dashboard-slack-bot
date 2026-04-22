const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: "new", // change to false for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      executablePath: '/usr/bin/chromium-browser'
    });

    const page = await browser.newPage();

    // Bigger viewport to avoid blank rendering
    await page.setViewport({ width: 1920, height: 3000 });

    const URL = 'https://metabase.spyne.ai/public/dashboard/ef9401fb-cb84-4228-add3-009dc09b1037?date=thismonth&enterpriseid=82255fce5&inputdata_platform=&poc_cs=&poc_ob=&r.status=&status=&status_statusdetails_catalog_qcstatus=&tab=757-data&vinname=';

    console.log("🌐 Opening dashboard...");
    await page.goto(URL, {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });

    // Wait for iframe (Metabase loads dashboard inside it)
    console.log("⏳ Waiting for iframe...");
    await page.waitForSelector('iframe', { timeout: 60000 });

    // Get iframe
    const frame = page.frames().find(f => f.url().includes('metabase'));

    if (!frame) {
      throw new Error("❌ Metabase iframe not found");
    }

    console.log("⏳ Waiting for dashboard inside iframe...");
    await frame.waitForSelector('.dashboard', { timeout: 60000 });

    // Wait for charts to load
    console.log("⏳ Waiting for charts to render...");
    await page.waitForFunction(() => {
      return document.querySelectorAll('.Visualization').length > 0;
    }, { timeout: 60000 });

    // Scroll to trigger lazy loading
    console.log("📜 Scrolling...");
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 300);
      });
    });

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));

    // Final wait (VERY IMPORTANT for Metabase rendering)
    console.log("⏳ Final render wait...");
    await new Promise(r => setTimeout(r, 10000));

    // Take screenshot
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

    console.log("📤 Step 1: Getting upload URL...");
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
      throw new Error(`Upload URL error: ${urlResponse.data.error}`);
    }

    const { upload_url, file_id } = urlResponse.data;

    console.log("📤 Step 2: Uploading file...");
    const fileBuffer = fs.readFileSync(filePath);
    await axios.post(upload_url, fileBuffer, {
      headers: { 'Content-Type': 'application/octet-stream' }
    });

    console.log("📤 Step 3: Completing upload...");
    const completeResponse = await axios.post(
      'https://slack.com/api/files.completeUploadExternal',
      {
        files: [{ id: file_id, title: 'Toronto Honda Pendency Dashboard' }],
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

    if (completeResponse.data.ok) {
      console.log("✅ Posted to Slack successfully!");
    } else {
      console.log("❌ Slack Error:", completeResponse.data.error);
    }

  } catch (error) {
    console.error("❌ Script Error:", error.message);
    process.exit(1);
  }
})();
