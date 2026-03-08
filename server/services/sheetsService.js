/**
 * ============================================================================
 * GOOGLE SHEETS SERVICE
 * ============================================================================
 * 
 * Service untuk berinteraksi dengan Google Sheets API v4
 * Menggantikan fungsi Apps Script dengan pure Node.js
 * 
 * @author Miftahur Rizki
 * @version 1.0.0
 */

const { google } = require('googleapis');
const path = require('path');

class SheetsService {
  constructor() {
    this.spreadsheetId = process.env.SPREADSHEET_ID;
    this.auth = null;
    this.sheets = null;
    this.initialized = false;
  }

  /**
   * Initialize Google Sheets API client
   * Lazy initialization - hanya dilakukan saat dibutuhkan
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Option 1: Menggunakan file JSON credentials
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        const keyFile = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        this.auth = new google.auth.GoogleAuth({
          keyFile: keyFile,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      }
      // Option 2: Menggunakan JSON string dari environment variable
      else if (process.env.GOOGLE_CREDENTIALS_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
        this.auth = new google.auth.GoogleAuth({
          credentials: credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      }
      else {
        throw new Error('Google credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CREDENTIALS_JSON');
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.initialized = true;
      
      console.log('✅ Google Sheets API initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google Sheets API:', error.message);
      throw error;
    }
  }

  /**
   * Membaca semua data dari sheet
   * @param {string} sheetName - Nama sheet (Data, Users, dll)
   * @returns {Promise<Array>} Array of rows
   */
  async getSheetData(sheetName) {
    await this.initialize();

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`, // Ambil semua kolom A-Z
      });

      const rows = response.data.values || [];
      return rows;
    } catch (error) {
      console.error(`Error reading sheet "${sheetName}":`, error.message);
      throw new Error(`Failed to read sheet "${sheetName}": ${error.message}`);
    }
  }

  /**
   * Konversi rows menjadi array of objects
   * @param {Array} rows - Raw rows dari sheet
   * @returns {Array} Array of objects dengan header sebagai key
   */
  rowsToObjects(rows) {
    if (!rows || rows.length === 0) return [];
    
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    return dataRows.map((row, index) => {
      const obj = { _rowIndex: index + 2 }; // +2 karena header di row 1, data mulai row 2
      
      headers.forEach((header, colIndex) => {
        let value = row[colIndex] !== undefined && row[colIndex] !== null ? row[colIndex] : '';
        
        // Handle date values (Google Sheets mengirim sebagai string ISO)
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          // Keep as ISO string untuk konsistensi dengan Apps Script version
          obj[header] = value;
        } else {
          obj[header] = value;
        }
      });
      
      return obj;
    });
  }

  /**
   * Append rows ke sheet
   * @param {string} sheetName - Nama sheet
   * @param {Array} values - Array of arrays untuk ditambahkan
   * @returns {Promise<Object>} Response dari API
   */
  async appendRows(sheetName, values) {
    await this.initialize();

    try {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'USER_ENTERED', // Parse formulas, dates, dll
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: values,
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error appending to sheet "${sheetName}":`, error.message);
      throw new Error(`Failed to append rows: ${error.message}`);
    }
  }

  /**
   * Update specific row
   * @param {string} sheetName - Nama sheet
   * @param {number} rowIndex - Row number (1-based)
   * @param {Array} values - Array of values untuk row tersebut
   * @returns {Promise<Object>} Response dari API
   */
  async updateRow(sheetName, rowIndex, values) {
    await this.initialize();

    try {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [values],
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error updating row ${rowIndex}:`, error.message);
      throw new Error(`Failed to update row: ${error.message}`);
    }
  }

  /**
   * Update specific cells
   * @param {string} sheetName - Nama sheet
   * @param {number} rowIndex - Row number (1-based)
   * @param {Object} updates - Object dengan column letter/index sebagai key
   * @returns {Promise<Object>} Response dari API
   */
  async updateCells(sheetName, rowIndex, updates) {
    await this.initialize();

    try {
      // Get headers dulu untuk mapping
      const allData = await this.getSheetData(sheetName);
      if (!allData || allData.length === 0) {
        throw new Error('Sheet is empty');
      }
      
      const headers = allData[0];
      
      // Build batch update requests
      const data = [];
      Object.keys(updates).forEach(columnName => {
        const colIndex = headers.indexOf(columnName);
        if (colIndex !== -1) {
          const columnLetter = this.numberToLetter(colIndex + 1);
          data.push({
            range: `${sheetName}!${columnLetter}${rowIndex}`,
            values: [[updates[columnName]]]
          });
        }
      });

      if (data.length === 0) return null;

      const response = await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data: data,
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error updating cells:`, error.message);
      throw new Error(`Failed to update cells: ${error.message}`);
    }
  }

  /**
   * Delete row
   * @param {string} sheetName - Nama sheet
   * @param {number} rowIndex - Row number (1-based, excluding header)
   * @returns {Promise<Object>} Response dari API
   */
  async deleteRow(sheetName, rowIndex) {
    await this.initialize();

    try {
      // Get sheet ID first
      const sheetMetadata = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = sheetMetadata.data.sheets.find(
        s => s.properties.title === sheetName
      );

      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      const sheetId = sheet.properties.sheetId;

      // Delete the row (0-indexed for API, rowIndex is 1-indexed including header)
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1, // Convert to 0-indexed
                  endIndex: rowIndex, // Exclusive
                },
              },
            },
          ],
        },
      });

      return response.data;
    } catch (error) {
      console.error(`Error deleting row ${rowIndex}:`, error.message);
      throw new Error(`Failed to delete row: ${error.message}`);
    }
  }

  /**
   * Helper: Convert column number to letter (1 -> A, 2 -> B, etc.)
   */
  numberToLetter(num) {
    let letter = '';
    while (num > 0) {
      const remainder = (num - 1) % 26;
      letter = String.fromCharCode(65 + remainder) + letter;
      num = Math.floor((num - 1) / 26);
    }
    return letter;
  }

  /**
   * Helper: Get column letter from header name
   */
  async getColumnLetter(sheetName, headerName) {
    const rows = await this.getSheetData(sheetName);
    if (!rows || rows.length === 0) return null;
    
    const headers = rows[0];
    const colIndex = headers.indexOf(headerName);
    if (colIndex === -1) return null;
    
    return this.numberToLetter(colIndex + 1);
  }
}

// Export singleton instance
module.exports = new SheetsService();
