import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';

async function findTarfSaniCoordinates() {
  const pdfBytes = await fs.readFile('template.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  console.log('PDF Pages:', pdfDoc.getPageCount());
  console.log('PDF Size:', pdfBytes.length, 'bytes');
  
  // Get page 1
  const page1 = pdfDoc.getPage(0);
  const { width, height } = page1.getSize();
  console.log('Page 1 Size:', width, 'x', height);
  
  // The PDF origin is bottom-left
  // الطرف الثانى should be in the upper portion of page 1
  // Based on existing fields:
  // - date: y=170 (bottom of page)
  // - pickup/destination: y=433-436 (middle-upper)
  // - الطرف الثانى should be above pickup/destination
  
  console.log('\nExisting Page 1 Fields (y coordinates from bottom):');
  console.log('- Date field: y=170 (bottom area)');
  console.log('- Pickup: y=436 (middle-upper)');
  console.log('- Destination: y=433 (middle-upper)');
  console.log('\nالطرف الثانى should be around y=550-600 (upper area)');
}

findTarfSaniCoordinates().catch(console.error);
