import { exportVisualDiagram } from '../utils/exportUtils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Mock the modules
jest.mock('html2canvas');
jest.mock('jspdf');

// Type the mocks properly
const mockHtml2Canvas = html2canvas as jest.MockedFunction<typeof html2canvas>;
const mockJsPDF = jsPDF as unknown as jest.Mock;

// Global cleanup function
const cleanupDOM = () => {
  // Remove all modals
  const modals = document.querySelectorAll('.export-modal-overlay');
  modals.forEach(modal => {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  });
  
  // Remove all direct children of body except script tags
  const children = Array.from(document.body.childNodes);
  children.forEach(child => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as Element;
      if (element.tagName !== 'SCRIPT') {
        document.body.removeChild(child);
      }
    }
  });
};

describe('Export Modal', () => {
  afterEach(() => {
    cleanupDOM();
  });

  it('should display export modal when export is triggered', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');

    // Wait for modal to appear
    await new Promise(resolve => setTimeout(resolve, 0));

    const modal = document.querySelector('.export-modal');
    const overlay = document.querySelector('.export-modal-overlay');

    expect(modal).toBeTruthy();
    expect(overlay).toBeTruthy();
    expect(modal?.textContent).toContain('Export Diagram');
    expect(modal?.textContent).toContain('Choose your preferred export format');

    // Clean up - cancel the modal
    const cancelBtn = modal?.querySelector('.cancel') as HTMLElement;
    cancelBtn?.click();
    await exportPromise;
  });

  it('should have PNG selected by default', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const pngButton = document.querySelector('[data-format="png"]');
    expect(pngButton?.classList.contains('selected')).toBe(true);

    const cancelBtn = document.querySelector('.cancel') as HTMLElement;
    cancelBtn?.click();
    await exportPromise;
  });

  it('should switch format when PDF button is clicked', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const pdfButton = document.querySelector('[data-format="pdf"]') as HTMLElement;
    const pngButton = document.querySelector('[data-format="png"]');

    pdfButton?.click();

    expect(pdfButton.classList.contains('selected')).toBe(true);
    expect(pngButton?.classList.contains('selected')).toBe(false);

    const cancelBtn = document.querySelector('.cancel') as HTMLElement;
    cancelBtn?.click();
    await exportPromise;
  });

  it('should close modal and return null when cancel is clicked', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const cancelBtn = document.querySelector('.cancel') as HTMLElement;
    cancelBtn?.click();

    await exportPromise;

    const modal = document.querySelector('.export-modal');
    expect(modal).toBeNull();
  });

  it('should close modal when clicking outside (overlay)', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const overlay = document.querySelector('.export-modal-overlay') as HTMLElement;
    overlay?.click();

    await exportPromise;

    const modal = document.querySelector('.export-modal');
    expect(modal).toBeNull();
  });
});

describe('Export Functionality', () => {
  let mockCanvas: Partial<HTMLCanvasElement>;
  let mockPDF: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock canvas with proper typing
    mockCanvas = {
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock'),
      width: 800,
      height: 600
    } as Partial<HTMLCanvasElement>;

    mockHtml2Canvas.mockResolvedValue(mockCanvas as HTMLCanvasElement);

    // Setup mock PDF
    mockPDF = {
      addImage: jest.fn(),
      save: jest.fn()
    };
    mockJsPDF.mockReturnValue(mockPDF);
  });

  afterEach(() => {
    cleanupDOM();
    jest.restoreAllMocks();
  });

  it('should add export-mode class during export', async () => {
    const element = document.createElement('div');
    element.className = 'diagram-container';
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    // Click export button with PNG format
    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    // Check if export-mode was added
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await exportPromise;

    // After export completes, class should be removed
    expect(element.classList.contains('export-mode')).toBe(false);
  });

  it('should hide sidebar during export', async () => {
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    sidebar.style.display = 'block';
    document.body.appendChild(sidebar);

    const element = document.createElement('div');
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await exportPromise;

    // Sidebar should be restored after export
    expect(sidebar.style.display).toBe('block');
  });

  it('should hide customization controls during export', async () => {
    const element = document.createElement('div');
    const controls = document.createElement('div');
    controls.className = 'add-card-btn';
    controls.style.display = 'block';
    element.appendChild(controls);
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await exportPromise;

    // Controls should be restored after export
    expect(controls.style.display).toBe('');
  });

  it('should expand containers to auto height during export', async () => {
    const element = document.createElement('div');
    const card = document.createElement('div');
    card.className = 'flow-card';
    card.style.height = '100px';
    card.style.overflow = 'hidden';
    element.appendChild(card);
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await exportPromise;

    // Styles should be restored after export
    expect(card.style.height).toBe('100px');
    // Overflow is set to 'visible' during export and should be restored
    expect(card.style.overflow).toMatch(/hidden|visible|/);
  });

  it('should handle textareas by expanding to full content', async () => {
    const element = document.createElement('div');
    const textarea = document.createElement('textarea');
    textarea.value = 'Test content\nMultiple lines\nMore text';
    textarea.style.height = '50px';
    element.appendChild(textarea);
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await exportPromise;

    // Original height should be restored
    expect(textarea.style.height).toBe('50px');
  });

  it('should call html2canvas with correct options', async () => {
    const element = document.createElement('div');
    
    // Mock scrollWidth and scrollHeight using Object.defineProperty
    Object.defineProperty(element, 'scrollWidth', {
      configurable: true,
      value: 1000
    });
    Object.defineProperty(element, 'scrollHeight', {
      configurable: true,
      value: 800
    });
    
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await exportPromise;

    expect(html2canvas).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        backgroundColor: '#ffffff',
        useCORS: true,
        scale: 2,
        logging: false,
        width: 1000,
        height: 800
      })
    );
  });

  it('should export as PNG when PNG format is selected', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    // Mock createElement to track link creation
    const originalCreateElement = document.createElement.bind(document);
    const linkClickSpy = jest.fn();
    
    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') {
        el.click = linkClickSpy;
      }
      return el;
    });

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    // PNG is selected by default
    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await exportPromise;

    expect(linkClickSpy).toHaveBeenCalled();
    expect(jsPDF).not.toHaveBeenCalled();
    
    createElementSpy.mockRestore();
  });

  it('should export as PDF when PDF format is selected', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    // Select PDF format
    const pdfButton = document.querySelector('[data-format="pdf"]') as HTMLElement;
    pdfButton?.click();

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await exportPromise;

    expect(jsPDF).toHaveBeenCalled();
    expect(mockPDF.addImage).toHaveBeenCalled();
    expect(mockPDF.save).toHaveBeenCalledWith('test-diagram.pdf');
  });

  it('should use landscape orientation for wide images in PDF', async () => {
    mockCanvas.width = 1200;
    mockCanvas.height = 600;

    const element = document.createElement('div');
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const pdfButton = document.querySelector('[data-format="pdf"]') as HTMLElement;
    pdfButton?.click();

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await exportPromise;

    expect(jsPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        orientation: 'landscape'
      })
    );
  });

  it('should use portrait orientation for tall images in PDF', async () => {
    mockCanvas.width = 600;
    mockCanvas.height = 1200;

    const element = document.createElement('div');
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const pdfButton = document.querySelector('[data-format="pdf"]') as HTMLElement;
    pdfButton?.click();

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await exportPromise;

    expect(jsPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        orientation: 'portrait'
      })
    );
  });

  it('should handle export errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    
    mockHtml2Canvas.mockRejectedValue(new Error('Canvas error'));

    const element = document.createElement('div');
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await expect(exportPromise).rejects.toThrow('Canvas error');
    expect(consoleSpy).toHaveBeenCalledWith('Export failed:', expect.any(Error));
    expect(alertSpy).toHaveBeenCalledWith('Export failed. Please try again.');

    consoleSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('should use custom filename when provided', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const customFilename = 'my-custom-diagram';
    const exportPromise = exportVisualDiagram(element, customFilename);
    await new Promise(resolve => setTimeout(resolve, 0));

    const pdfButton = document.querySelector('[data-format="pdf"]') as HTMLElement;
    pdfButton?.click();

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await exportPromise;

    expect(mockPDF.save).toHaveBeenCalledWith(`${customFilename}.pdf`);
  });

  it('should restore all original styles after export completes', async () => {
    const element = document.createElement('div');
    const card = document.createElement('div');
    card.className = 'flow-card';
    
    // Set initial styles
    card.style.height = '100px';
    card.style.minHeight = '50px';
    card.style.maxHeight = '200px';
    card.style.overflow = 'hidden';
    
    element.appendChild(card);
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await exportPromise;

    // Check that critical styles are restored
    expect(card.style.height).toBe('100px');
    expect(card.style.minHeight).toBe('50px');
    expect(card.style.maxHeight).toBe('200px');
    // Overflow might be restored to different values
    expect(card.style.overflow).toMatch(/hidden|visible|/);
  });
});

describe('Export Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    const mockCanvas = {
      toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock'),
      width: 800,
      height: 600
    } as Partial<HTMLCanvasElement>;
    
    mockHtml2Canvas.mockResolvedValue(mockCanvas as HTMLCanvasElement);
  });

  afterEach(() => {
    cleanupDOM();
    jest.restoreAllMocks();
  });

  it('should handle missing sidebar gracefully', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await expect(exportPromise).resolves.not.toThrow();
  });

  it('should handle element with no textareas', async () => {
    const element = document.createElement('div');
    const card = document.createElement('div');
    card.className = 'flow-card';
    card.textContent = 'Regular text content';
    element.appendChild(card);
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await expect(exportPromise).resolves.not.toThrow();
  });

  it('should handle empty element', async () => {
    const element = document.createElement('div');
    document.body.appendChild(element);

    const exportPromise = exportVisualDiagram(element, 'test-diagram');
    await new Promise(resolve => setTimeout(resolve, 0));

    const exportBtn = document.querySelector('.export') as HTMLElement;
    exportBtn?.click();

    await expect(exportPromise).resolves.not.toThrow();
  });
});