const puppeteer = require('puppeteer');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');

(async () => {
  try {
    // Launch browser
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath: '/usr/bin/chromium-browser'
    });

    const page = await browser.newPage();

    // Open dashboard
    await page.goto('https://vin-tracker-dashboard.vercel.app/', {
      waitUntil: 'networkidle2'
    });

    // Wait for full load
    await new Promise(r => setTimeout(r, 8000));

    // Take screenshot
    await page.screenshot({
      path: 'dashboard.png',
      fullPage: true
    });

    await browser.close();

    console.log("✅ Screenshot captured");

    // Prepare Slack upload
    const form = new FormData();
    form.append('file', fs.createReadStream('dashboard.png'));
    form.append('channels', 'CXXXXXXXX'); // 👉 replace with real channel ID
    form.append('filename', 'dashboard.png');
    form.append('title', '24hr Pendency Dashboard');
    form.append('initial_comment', '📊 24hr Pendency Dashboard');

    try {
      const response = await axios.post(
        'https://slack.com/api/files.upload',
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          },
        }
      );

      console.log("===== SLACK RESPONSE =====");
      console.log(JSON.stringify(response.data, null, 2));
      console.log("==========================");

      if (response.data.ok) {
        console.log("✅ Uploaded to Slack successfully");
      } else {
        console.log("❌ Slack Error:", response.data.error);
      }

    } catch (err) {
      console.log("===== SLACK ERROR =====");
      console.log(err.response?.data || err.message);
      console.log("=======================");
    }

  } catch (error) {
    console.log("❌ Script Error:", error.message);
  }
})();
