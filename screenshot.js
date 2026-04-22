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

    await new Promise(r => setTimeout(r, 10000));

    await page.screenshot({
      path: 'dashboard.png',
      fullPage: true
    });

    await browser.close();
    console.log("✅ Screenshot captured");

    const form = new FormData();
    form.append('file', fs.createReadStream('dashboard.png'));
    form.append('channels', 'C0AUAG29SLS');
    form.append('filename', 'toronto-honda-dashboard.png');
    form.append('title', 'Toronto Honda Pendency Dashboard');
    form.append('initial_comment', '📊 Toronto Honda Dashboard — Auto update every 2hrs');

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

  } catch (error) {
    console.log("❌ Script Error:", error.message);
  }
})();
