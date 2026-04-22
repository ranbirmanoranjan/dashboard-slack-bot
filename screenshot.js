const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: '/usr/bin/chromium-browser'
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 900 });

    await page.goto('https://metabase.spyne.ai/public/dashboard/ef9401fb-cb84-4228-add3-009dc09b1037?date=thismonth&enterpriseid=82255fce5&inputdata_platform=&poc_cs=&poc_ob=&r.status=&status=&status_statusdetails_catalog_qcstatus=&tab=757-data&vinname=', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(r => setTimeout(r, 25000));

    await page.screenshot({
      path: 'dashboard.png',
      fullPage: true
    });

    await browser.close();
    console.log("✅ Screenshot captured");

    const token = process.env.SLACK_BOT_TOKEN;
    const channelId = 'C0AUAG29SLS';
    const filePath = 'dashboard.png';
    const fileSize = fs.statSync(filePath).size;

    console.log("📤 Step 1: Getting upload URL from Slack...");
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

    console.log("Upload URL response:", JSON.stringify(urlResponse.data));

    if (!urlResponse.data.ok) {
      throw new Error(`Failed to get upload URL: ${urlResponse.data.error}`);
    }

    const { upload_url, file_id } = urlResponse.data;

    console.log("📤 Step 2: Uploading file...");
    const fileBuffer = fs.readFileSync(filePath);
    await axios.post(upload_url, fileBuffer, {
      headers: { 'Content-Type': 'application/octet-stream' }
    });
    console.log("✅ File uploaded");

    console.log("📤 Step 3: Completing upload and posting to channel...");
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

    console.log("Complete response:", JSON.stringify(completeResponse.data));

    if (completeResponse.data.ok) {
      console.log("✅ Posted to Slack successfully!");
    } else {
      console.log("❌ Slack Error:", completeResponse.data.error);
    }

  } catch (error) {
    console.log("❌ Script Error:", error.message);
    process.exit(1);
  }
})();
