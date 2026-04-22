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
        '--disable-gpu'
      ],
      executablePath: '/usr/bin/chromium-browser'
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Landscape wide viewport
    await page.setViewport({ width: 1920, height: 1080 });

    const URL = 'https://metabase.spyne.ai/public/dashboard/ef9401fb-cb84-4228-add3-009dc09b1037?date=thismonth&enterpriseid=82255fce5&inputdata_platform=&poc_cs=&poc_ob=&r.status=&status=&status_statusdetails_catalog_qcstatus=&tab=757-data&vinname=';

    console.log("🌐 Opening dashboard...");
    await page.goto(URL, {
      waitUntil: 'networkidle2',
      timeout: 90000
    });

    // Wait 20s flat — no selector waiting, just let it load
    console.log("⏳ Waiting 20s...");
    await new Promise(r => setTimeout(r, 20000));

    // Dump what's on the page so we can debug
    const debug = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        allClasses: [...new Set([...document.querySelectorAll('*')].map(el => el.className).filter(c => typeof c === 'string' && c.length > 0))].slice(0, 50),
        bodySnippet: document.body.innerText.substring(0, 500),
        canvasCount: document.querySelectorAll('canvas').length,
        svgCount: document.querySelectorAll('svg').length,
        imgCount: document.querySelectorAll('img').length,
      };
    });

    console.log("=== PAGE DEBUG ===");
    console.log("Title:", debug.title);
    console.log("Canvas elements:", debug.canvasCount);
    console.log("SVG elements:", debug.svgCount);
    console.log("IMG elements:", debug.imgCount);
    console.log("Body text:", debug.bodySnippet);
    console.log("Classes found:", debug.allClasses.join(', '));
    console.log("=================");

    await page.screenshot({ path: 'dashboard.png', fullPage: true });
    await browser.close();
    console.log("✅ Screenshot captured - check debug above to fix blank issue");

    // Slack upload
    const token = process.env.SLACK_BOT_TOKEN;
    const channelId = 'C0AUAG29SLS';
    const fileSize = fs.statSync('dashboard.png').size;

    const urlResponse = await axios.post(
      'https://slack.com/api/files.getUploadURLExternal',
      new URLSearchParams({ filename: 'toronto-honda-dashboard.png', length: fileSize }),
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    if (!urlResponse.data.ok) throw new Error(`Upload URL error: ${urlResponse.data.error}`);

    const { upload_url, file_id } = urlResponse.data;
    await axios.post(upload_url, fs.readFileSync('dashboard.png'), {
      headers: { 'Content-Type': 'application/octet-stream' }
    });

    const completeResponse = await axios.post(
      'https://slack.com/api/files.completeUploadExternal',
      {
        files: [{ id: file_id, title: 'Toronto Honda Pendency Dashboard' }],
        channel_id: channelId,
        initial_comment: '📊 Toronto Honda Dashboard — Debug run'
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    if (completeResponse.data.ok) {
      console.log("✅ Posted to Slack!");
    } else {
      console.log("❌ Slack Error:", completeResponse.data.error);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
