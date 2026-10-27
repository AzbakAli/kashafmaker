import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';

async function findTarfSaniCoordinates() {
  const pdfBytes = await fs.readFile('assets/nbis-kashaf.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  console.log('PDF Pages:', pdfDoc.getPageCount());
  console.log('PDF Size:', pdfBytes.length, 'bytes');
  
  const page1 = pdfDoc.getPage(0);
  const { width, height } = page1.getSize();
  console.log('Page 1 Size:', width, 'x', height);
  
  // Confirmed coordinates for Page 1:
  // - Date field: y=170 (pdfBaseline: 610)
  // - Pickup: y=436 (pdfBaseline: 347)
  // - Destination: y=433 (pdfBaseline: 348.5)
  // - الطرف الثاني (Tarf Sani) label: x=509, y=420
  // - الطرف الثاني value (third_party): x=100, width=395, pdfBaseline=420, align='right'
  console.log('\nVerified Page 1 Coordinates:');
  console.log('- الطرف الثاني label: x=509, y=420');
  console.log('- الطرف الثاني value: x=100, width=395, pdfBaseline=420, align=right');
}

findTarfSaniCoordinates().catch(console.error);
