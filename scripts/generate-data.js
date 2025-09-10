#!/usr/bin/env node

import { NotionService } from '../lib/notion-client.js';
import { DateUtils } from '../lib/date-utils.js';
import fs from 'fs/promises';
import path from 'path';

async function generateWeeklyData() {
  try {
    // Ensure data directory exists
    const dataDir = './docs/data';
    await fs.mkdir(dataDir, { recursive: true });
    
    const notionService = new NotionService();
    
    console.log('Generating data for last 10 weeks...');
    
    for (let week = 0; week < 10; week++) {
      console.log(`Processing week ${week}...`);
      
      const { start, end } = DateUtils.getWeekRange(week);
      const weekLabel = DateUtils.getWeekLabel(week);
      const dateRange = DateUtils.formatDateRange(start, end);
      
      // Fetch pages for this week
      const pages = await notionService.searchPages(start, end);
      
      // Format page info (with async calls)
      const formattedPages = [];
      for (const page of pages) {
        const pageInfo = await notionService.formatPageInfo(page);
        formattedPages.push(pageInfo);
      }
      
      const weekData = {
        week,
        weekLabel,
        dateRange,
        start: start.toISOString(),
        end: end.toISOString(),
        pages: formattedPages,
        generatedAt: new Date().toISOString()
      };
      
      // Write data to file
      const filename = `week-${week}.json`;
      const filepath = path.join(dataDir, filename);
      await fs.writeFile(filepath, JSON.stringify(weekData, null, 2));
      
      console.log(`✅ ${weekLabel}: ${formattedPages.length} pages`);
    }
    
    console.log('\n🎉 Data generation complete!');
    console.log('Files generated in ./docs/data/');
    
  } catch (error) {
    console.error('❌ Error generating data:', error.message);
    process.exit(1);
  }
}

generateWeeklyData();