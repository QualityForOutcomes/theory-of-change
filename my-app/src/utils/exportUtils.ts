import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportVisualDiagram = async (element: HTMLElement, filename: string = 'theory-of-change') => {
  try {
    // Ask user for format
    const format = window.prompt('Choose format: png or pdf', 'png');
    
    if (!format || !['png', 'pdf'].includes(format.toLowerCase())) {
      if (format !== null) {
        alert('Please choose either "png" or "pdf"');
      }
      return;
    }

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      useCORS: true,
    });
    
    if (format.toLowerCase() === 'pdf') {
      // Export as PDF
      const imgData = canvas.toDataURL('image/png');
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // A4 dimensions in points
      const a4Width = 595.28;
      const a4Height = 841.89;
      
      // Calculate scale to fit image in A4 with padding
      const padding = 40;
      const availableWidth = a4Width - (2 * padding);
      const availableHeight = a4Height - (2 * padding);
      
      const scaleX = availableWidth / imgWidth;
      const scaleY = availableHeight / imgHeight;
      const scale = Math.min(scaleX, scaleY, 1);
      
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;
      
      // Center the image
      const x = (a4Width - scaledWidth) / 2;
      const y = (a4Height - scaledHeight) / 2;
      
      const pdf = new jsPDF({
        orientation: scaledWidth > scaledHeight ? 'landscape' : 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
      pdf.save(`${filename}.pdf`);
    } else {
      // Export as PNG
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
};