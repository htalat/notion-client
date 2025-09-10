# Notion Weekly Tracker

Track new Notion pages by week with an easy-to-use CLI tool.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create a Notion integration:**
   - Go to https://www.notion.so/my-integrations
   - Create a new integration
   - Copy the integration token

3. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env and add your token
   ```

4. **Give your integration access:**
   - In Notion, go to any page
   - Click "..." → "Add connections" → Select your integration

## Usage

```bash
# Show pages from this week
npm start

# Show pages from last week
npm start -- -w 1

# Show pages from 2 weeks ago
npm start -- -w 2
```

## Examples

```bash
$ npm start
📅 This Week
Dec 4, 2023 - Dec 10, 2023

Found 3 new page(s):

1. Project Planning Doc
   Created: 12/6/2023
   URL: https://notion.so/...

2. Meeting Notes
   Created: 12/5/2023
   URL: https://notion.so/...
```