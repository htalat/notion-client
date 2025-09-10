import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

export class NotionService {
  constructor() {
    if (!process.env.NOTION_TOKEN) {
      throw new Error('NOTION_TOKEN environment variable is required');
    }
    this.notion = new Client({ auth: process.env.NOTION_TOKEN });
  }

  async searchPages(startDate, endDate) {
    try {
      const response = await this.notion.search({
        filter: {
          property: 'object',
          value: 'page'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      });

      return response.results.filter(page => {
        const createdTime = new Date(page.created_time);
        return createdTime >= startDate && createdTime <= endDate;
      });
    } catch (error) {
      console.error('Error fetching pages:', error.message);
      throw error;
    }
  }

  async formatPageInfo(page) {
    const title = this.getPageTitle(page);
    const url = page.url;
    const createdTime = new Date(page.created_time).toLocaleDateString();
    const linkProperty = this.getLinkProperty(page);
    const parentInfo = await this.getParentInfo(page);
    
    return {
      title,
      url,
      createdTime,
      linkProperty,
      parentInfo,
      id: page.id
    };
  }

  getPageTitle(page) {
    if (page.properties) {
      const titleProp = Object.values(page.properties).find(
        prop => prop.type === 'title'
      );
      if (titleProp && titleProp.title && titleProp.title[0]) {
        return titleProp.title[0].text.content;
      }
    }
    return 'Untitled';
  }

  getLinkProperty(page) {
    if (page.properties) {
      const linkProp = Object.values(page.properties).find(
        prop => prop.type === 'url'
      );
      if (linkProp && linkProp.url) {
        return linkProp.url;
      }
    }
    return null;
  }

  async getParentInfo(page) {
    try {
      if (!page.parent) return null;

      if (page.parent.type === 'database_id') {
        const database = await this.notion.databases.retrieve({ database_id: page.parent.database_id });
        return {
          type: 'database',
          title: database.title?.[0]?.text?.content || 'Untitled Database',
          id: page.parent.database_id
        };
      } else if (page.parent.type === 'page_id') {
        const parentPage = await this.notion.pages.retrieve({ page_id: page.parent.page_id });
        return {
          type: 'page',
          title: this.getPageTitle(parentPage),
          id: page.parent.page_id
        };
      }
    } catch (error) {
      return null;
    }
    return null;
  }
}