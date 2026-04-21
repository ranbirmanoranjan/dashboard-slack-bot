name: Post Dashboard Screenshot to Slack

on:
  schedule:
    - cron: '0 */2 * * *'   # Every 2 hours
  workflow_dispatch:          # Manual trigger

jobs:
  screenshot-and-post:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Chromium
        run: sudo apt-get install -y chromium-browser

      - name: Install dependencies
        run: npm install

      - name: Run screenshot and post to Slack
        run: node screenshot.js
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SLACK_CHANNEL_ID: ${{ secrets.SLACK_CHANNEL_ID }}
