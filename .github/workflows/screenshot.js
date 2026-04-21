const puppeteer = require('puppeteer');

const DASHBOARD_URL = process.env.DASHBOARD_URL || 
  'https://metabase.spyne.ai/public/dashboard/ef9401fb-cb84-4228-add3-009dc09b1037?date=thismonth&enterpriseid=82255fce5&inputdata_platform=&poc_cs=&poc_ob=&r.status=&status=&status_statusdetails_catalog_qcstatus=&tab=757-data&vinname=';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();

  // Set a wide viewport so the dashboard renders fully
  await page.setViewport({ width: 1600, height: 900 });

  console.log(`Navigating to dashboard: ${DASHBOARD_URL}`);
  await page.goto(DASHBOARD_URL, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  // Wait extra time for charts/data to fully load
  console.log('Waiting for dashboard to fully render...');
  await new Promise(r => setTimeout(r, 8000));

  // Screenshot the full scrollable page
  await page.screenshot({
    path: 'dashboard.png',
    fullPage: true,
  });

  console.log('Screenshot saved as dashboard.png');
  await browser.close();
})();
