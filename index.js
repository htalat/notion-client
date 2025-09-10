#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { NotionService } from './lib/notion-client.js';
import { DateUtils } from './lib/date-utils.js';

const program = new Command();

program
  .name('notion-weekly-tracker')
  .description('Track new Notion pages by week')
  .version('1.0.0');

program
  .option('-w, --weeks <number>', 'Number of weeks ago (0 = this week, 1 = last week, etc.)', '0')
  .action(async (options) => {
    try {
      const weeksAgo = parseInt(options.weeks);
      const { start, end } = DateUtils.getWeekRange(weeksAgo);
      const weekLabel = DateUtils.getWeekLabel(weeksAgo);
      const dateRange = DateUtils.formatDateRange(start, end);

      console.log(chalk.blue.bold(`\n📅 ${weekLabel}`));
      console.log(chalk.gray(`${dateRange}\n`));

      const notionService = new NotionService();
      const pages = await notionService.searchPages(start, end);

      if (pages.length === 0) {
        console.log(chalk.yellow('No new pages found for this week.'));
        return;
      }

      console.log(chalk.green.bold(`Found ${pages.length} new page(s):\n`));

      for (const [index, page] of pages.entries()) {
        const pageInfo = await notionService.formatPageInfo(page);
        console.log(chalk.white(`${index + 1}. ${chalk.bold(pageInfo.title)}`));
        console.log(chalk.gray(`   Created: ${pageInfo.createdTime}`));
        if (pageInfo.parentInfo) {
          const parentType = pageInfo.parentInfo.type === 'database' ? '📊' : '📄';
          console.log(chalk.magenta(`   ${parentType} Parent: ${pageInfo.parentInfo.title}`));
        }
        if (pageInfo.linkProperty) {
          console.log(chalk.cyan(`   Link: ${pageInfo.linkProperty}`));
        }
        console.log(chalk.blue(`   Page URL: ${pageInfo.url}\n`));
      }

    } catch (error) {
      if (error.message.includes('NOTION_TOKEN')) {
        console.error(chalk.red('❌ Error: NOTION_TOKEN environment variable is required.'));
        console.log(chalk.yellow('💡 Create a .env file with your Notion integration token:'));
        console.log(chalk.gray('   NOTION_TOKEN=your_token_here\n'));
      } else {
        console.error(chalk.red('❌ Error:'), error.message);
      }
      process.exit(1);
    }
  });

// Add examples to help
program.addHelpText('after', `
Examples:
  $ notion-weekly-tracker              # Show pages from this week
  $ notion-weekly-tracker -w 1         # Show pages from last week  
  $ notion-weekly-tracker -w 2         # Show pages from 2 weeks ago
`);

program.parse();