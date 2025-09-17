import { RepairRecord } from '../types/repairRecord';
import { saveAs } from 'file-saver';

export class ExportService {
  exportToJSON(data: any[], fileName: string = 'export'): void {
    try {
      // Validate data structure before export
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array for export');
      }
      
      // Create formatted JSON string with proper indentation
      const jsonString = JSON.stringify(data, null, 2);
      
      // Validate JSON by parsing it back (will throw if invalid)
      JSON.parse(jsonString);
      
      // Create blob and download file
      const blob = new Blob([jsonString], { type: 'application/json' });
      saveAs(blob, `${fileName}-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (error) {
      console.error('Export error:', error);
      throw new Error(`Export format validation: ${error.message}`);
    }
  }

  exportToCSV(data: any[], fileName: string = 'export'): void {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Data must be a non-empty array for CSV export');
      }
      
      // Get headers from first object keys
      const headers = Object.keys(data[0]);
      
      // Create CSV content with headers
      let csvContent = headers.join(',') + '\r\n';
      
      // Add data rows
      data.forEach(item => {
        const row = headers.map(header => {
          // Handle special cases like nested objects, arrays, etc.
          const cell = item[header];
          const cellValue = cell === null || cell === undefined ? '' : cell;
          
          // Escape quotes and handle commas in values
          if (typeof cellValue === 'string') {
            return `"${cellValue.replace(/"/g, '""')}"`;
          }
          return cellValue;
        });
        csvContent += row.join(',') + '\r\n';
      });
      
      // Create blob and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${fileName}-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (error) {
      console.error('CSV Export error:', error);
      throw new Error(`CSV export failed: ${error.message}`);
    }
  }
}

export default new ExportService();