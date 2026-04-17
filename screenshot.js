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

    // Wait for proper load
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

    // 🔥 IMPORTANT: PUT YOUR CHANNEL ID HERE
    form.append('channels', 'C0ATMA8EZJ9');  

    form.append('initial_comment', '📊 24hr Pendency Dashboard');

    // Upload to Slack
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

    // 🔍 Debug response
    console.log("Slack Response:", response.data);

    if (response.data.ok) {
      console.log("✅ Uploaded to Slack successfully");
    } else {
      console.error("❌ Slack Error:", response.data.error);
    }

  } catch (error) {
    console.error("❌ Script Error:", error.message);
  }
})();
