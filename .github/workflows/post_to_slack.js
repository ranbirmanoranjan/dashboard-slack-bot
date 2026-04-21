const fs = require('fs');
const path = require('path');
const { WebClient } = require('@slack/web-api');

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || 'C0AUAG29SLS';
const SCREENSHOT_PATH = path.join(__dirname, 'dashboard.png');

if (!SLACK_BOT_TOKEN) {
  console.error('ERROR: SLACK_BOT_TOKEN is not set.');
  process.exit(1);
}

if (!fs.existsSync(SCREENSHOT_PATH)) {
  console.error('ERROR: dashboard.png not found. Run screenshot.js first.');
  process.exit(1);
}

const client = new WebClient(SLACK_BOT_TOKEN);

const now = new Date().toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata',
  dateStyle: 'medium',
  timeStyle: 'short',
});

(async () => {
  try {
    console.log(`Uploading screenshot to Slack channel: ${SLACK_CHANNEL_ID}`);

    await client.filesUploadV2({
      channel_id: SLACK_CHANNEL_ID,
      file: fs.createReadStream(SCREENSHOT_PATH),
      filename: 'dashboard.png',
      initial_comment: `:bar_chart: *Toronto Honda Dashboard* — Auto-update as of ${now} IST\n<https://metabase.spyne.ai/public/dashboard/ef9401fb-cb84-4228-add3-009dc09b1037?date=thismonth&enterpriseid=82255fce5&tab=757-data|View Full Dashboard>`,
    });

    console.log('Screenshot posted to Slack successfully!');
  } catch (err) {
    console.error('Slack upload failed:', err.message);
    process.exit(1);
  }
})();
