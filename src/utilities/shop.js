import fs from 'fs/promises';
import path from 'path';
import log from './structs/log.js';
import { dirname } from 'dirname-filename-esm';
import https from 'https';
import fetch from 'node-fetch'; // Import 'node-fetch'

const __dirname = dirname(import.meta);

class Shop {
  async updateShop() {
    let response = null;
    try {

      const requestOptions = {
        method: 'POST'
      };

      response = await fetch('http://127.0.0.1:3551/rotateshop/', requestOptions);

      if (response.ok) {
        const responseData = await response.json();

        const currentDate = new Date();
        const timeZoneOffset = -60;
        
        const gmtPlusOneDate = new Date(currentDate.getTime() + timeZoneOffset * 60000);
        gmtPlusOneDate.setHours(0, 0, 0, 0);

        const isoDate = gmtPlusOneDate.toISOString();

        response = {
          ...responseData,
          expiration: isoDate,
        };

        await fs.writeFile(path.join(__dirname, '../profiles/catalog_config.json'), JSON.stringify(response, null, 4));
      } else {
        console.error('Error:', response.status, response.statusText);
        return [];
      }
    } catch (error) {
      console.error('Error:', error);
      return [];
    }

    return response;
  }
}

export default new Shop();