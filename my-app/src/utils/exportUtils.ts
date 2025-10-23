import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import "../style/Export.css"

// Retrieve user's subscription plan from localStorage
const getUserPlanFromStorage = (): 'free' | 'pro' | 'premium' => {
  const userPlan = localStorage.getItem('userPlan');
  if (userPlan === 'pro' || userPlan === 'premium') {
    return userPlan as 'free' | 'pro' | 'premium';
  }
  return 'free';
};

// Check if user has permission to export (Pro/Premium only)
const hasExportAccess = (): boolean => {
  const userPlan = getUserPlanFromStorage();
  const hasAccess = userPlan === 'pro' || userPlan === 'premium';
  
  console.log('🔒 Export Access Check:', {
    userPlan,
    hasAccess,
    storedPlan: localStorage.getItem('userPlan'),
    storedPlanId: localStorage.getItem('planId')
  });
  
  return hasAccess;
};

// Modal for free users prompting upgrade to access export
const showSubscriptionRequiredModal = (onUpgradeClick?: () => void): Promise<void> => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'export-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'export-modal subscription-modal';
    
    modal.innerHTML = `
      <div class="subscription-required-content">
        <div class="lock-icon">🔒</div>
        <h3>Premium Feature</h3>
        <p>Export functionality is available for Pro and Premium subscribers only.</p>
        <div class="feature-benefits">
          <div class="benefit-item">✓ Export as PNG</div>
          <div class="benefit-item">✓ Export as PDF</div>
          <div class="benefit-item">✓ High-quality output</div>
        </div>
        <div class="export-modal-actions">
          <button class="export-modal-btn upgrade-btn">Upgrade Now</button>
          <button class="export-modal-btn cancel">Maybe Later</button>
        </div>
      </div>
    `;
    
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    modal.querySelector('.upgrade-btn')?.addEventListener('click', () => {
      document.body.removeChild(overlay);
      if (onUpgradeClick) {
        onUpgradeClick(); // Navigate to /subscription
      }
      resolve();
    });
    
    // Navigate to subscription page on upgrade click
    modal.querySelector('.cancel')?.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve();
    });
    
    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve();
      }
    });
  });
};

// Modal for selecting export format (PNG or PDF)
const showExportModal = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'export-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'export-modal';
    
    let selectedFormat = 'png';
    
    modal.innerHTML = `
      <h3>Export Diagram</h3>
      <p>Choose your preferred export format</p>
      <div class="export-format-buttons">
        <button class="export-format-btn selected" data-format="png">
          <div>📄 PNG</div>
          <small style="color: inherit; opacity: 0.8;">Image file</small>
        </button>
        <button class="export-format-btn" data-format="pdf">
          <div>📋 PDF</div>
          <small style="color: inherit; opacity: 0.8;">Document file</small>
        </button>
      </div>
      <div class="export-modal-actions">
        <button class="export-modal-btn cancel">Cancel</button>
        <button class="export-modal-btn export">Export</button>
      </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Handle format selection
    const formatButtons = modal.querySelectorAll('.export-format-btn');
    formatButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        formatButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedFormat = btn.getAttribute('data-format') || 'png';
      });
    });
    
    modal.querySelector('.cancel')?.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(null);
    });
    
    modal.querySelector('.export')?.addEventListener('click', () => {
      document.body.removeChild(overlay);
      resolve(selectedFormat);
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        resolve(null);
      }
    });
  });
};

// Main export function - handles permission check, UI preparation, and export
export const exportVisualDiagram = async (
  element: HTMLElement, 
  filename: string = 'theory-of-change',
  onUpgradeClick?: () => void
) => {
  try {
    
    // Check export permission - redirect free users to upgrade
    if (!hasExportAccess()) {
      await showSubscriptionRequiredModal(onUpgradeClick);
      return; // Stop execution if user doesn't have access
    }
    
    // Get user's format preference
    const format = await showExportModal();
    
    if (!format) {
      return;
    }

    // Prepare element for export - add export mode class
    element.classList.add('export-mode');

   // Hide sidebar during export
    const sidebar = document.querySelector('.sidebar') as HTMLElement;
    const originalSidebarDisplay = sidebar ? sidebar.style.display : '';
    if (sidebar) {
      sidebar.style.display = 'none';
    }

    // Hide all interactive controls (buttons, color pickers)
    const customizeControls = element.querySelectorAll(
      '.customize-controls-column, .cloud-customize-controls, .add-card-btn, .remove-card-btn, .add-cloud-btn, .remove-cloud-btn, .cloud-buttons, .add-remove-wrapper'
    );
    customizeControls.forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });

    // Store original styles to restore after export
    const originalStyles: Array<{
      el: HTMLElement;
      height: string;
      minHeight: string;
      maxHeight: string;
      overflow: string;
      whiteSpace: string;
    }> = [];

    // Force all containers to expand fully (prevent content clipping)
    const containers = element.querySelectorAll(
      '.flow-card, .influence-cloud, .card-container, .outer-card, .card-value, .cloud-value, .flow-row'
    );
    
    containers.forEach((container) => {
      const el = container as HTMLElement;
      originalStyles.push({
        el: el,
        height: el.style.height,
        minHeight: el.style.minHeight,
        maxHeight: el.style.maxHeight,
        overflow: el.style.overflow,
        whiteSpace: el.style.whiteSpace
      });
      
      // Remove height constraints and show all content
      el.style.height = 'auto';
      el.style.minHeight = 'auto';
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible'; 
      el.style.whiteSpace = 'normal';
    });
    
    // ensure any wrapper divs don't clip content
    const allDivs = element.querySelectorAll('div');
    const divOriginalStyles: Array<{ el: HTMLElement; overflow: string }> = [];
    allDivs.forEach((div) => {
      const el = div as HTMLElement;
      divOriginalStyles.push({
        el: el,
        overflow: el.style.overflow
      });
     // Force visible overflow for all divs
      if (el.style.overflow === 'hidden' || el.style.overflow === 'auto' || el.style.overflow === 'scroll') {
        el.style.overflow = 'visible';
      }
    });

    // Replace textareas with divs for proper rendering in canvas
    const allTextareas = element.querySelectorAll('textarea');
    const originalTextareaStyles: Array<{
      el: HTMLTextAreaElement;
      height: string;
      minHeight: string;
      maxHeight: string;
      overflow: string;
      resize: string;
      display: string;
    }> = [];
    
    // Store textarea replacements for later cleanup
    const textareaReplacements: Array<{ textarea: HTMLTextAreaElement; replacement: HTMLDivElement }> = [];

    allTextareas.forEach((textarea) => {
      originalTextareaStyles.push({
        el: textarea,
        height: textarea.style.height,
        minHeight: textarea.style.minHeight,
        maxHeight: textarea.style.maxHeight,
        overflow: textarea.style.overflow,
        resize: textarea.style.resize,
        display: textarea.style.display
      });
      
      // Create div that mimics textarea styling
      const replacement = document.createElement('div');
      replacement.className = 'textarea-replacement';
      replacement.textContent = textarea.value;
      
      // Copy computed styles from textarea to ensure identical appearance
      const computedStyle = window.getComputedStyle(textarea);
      replacement.style.cssText = textarea.style.cssText;
      replacement.style.width = computedStyle.width;
      replacement.style.height = 'auto';
      replacement.style.minHeight = '0';
      replacement.style.maxHeight = 'none';
      replacement.style.overflow = 'visible';
      replacement.style.whiteSpace = 'pre-wrap';
      replacement.style.wordWrap = 'break-word';
      replacement.style.wordBreak = 'break-word';
      replacement.style.fontFamily = computedStyle.fontFamily;
      replacement.style.fontSize = computedStyle.fontSize;
      replacement.style.fontWeight = computedStyle.fontWeight;
      replacement.style.lineHeight = computedStyle.lineHeight;
      replacement.style.padding = computedStyle.padding;
      replacement.style.border = computedStyle.border;
      replacement.style.borderRadius = computedStyle.borderRadius;
      replacement.style.backgroundColor = computedStyle.backgroundColor;
      replacement.style.color = computedStyle.color;
      replacement.style.boxSizing = 'border-box';
      
     // Hide original textarea and insert replacement
      textarea.style.display = 'none';
      textarea.parentNode?.insertBefore(replacement, textarea);
      
      textareaReplacements.push({ textarea, replacement });
    });

    // Wait for browser layout to settle before capturing
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Second pass: Re-verify textarea heights after layout
    allTextareas.forEach((textarea) => {
      const computedStyle = window.getComputedStyle(textarea);
      const width = computedStyle.width;
      textarea.style.width = width;
      
      // Reset height to recalculate
      textarea.style.height = 'auto';
      void textarea.offsetHeight;
      void textarea.scrollHeight;
      const finalHeight = textarea.scrollHeight;
      textarea.style.height = (finalHeight + 8) + 'px';
    });
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Third pass: Final height verification
    allTextareas.forEach((textarea) => {
      void textarea.offsetHeight;
      const verifyHeight = textarea.scrollHeight;
      if (parseInt(textarea.style.height) < verifyHeight) {
        textarea.style.height = (verifyHeight + 8) + 'px';
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 200));

    // Capture element as canvas using html2canvas
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      useCORS: true,
      scale: 2,
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        // Additional fixes in the cloned document
        const clonedElement = clonedDoc.querySelector('.export-mode');
        if (clonedElement) {
          // Force expansion in cloned document
          const clonedContainers = clonedElement.querySelectorAll(
            '.flow-card, .influence-cloud, .card-container, .outer-card, .card-value, .cloud-value'
          );
          clonedContainers.forEach((el) => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.height = 'auto';
            htmlEl.style.minHeight = 'auto';
            htmlEl.style.maxHeight = 'none';
            htmlEl.style.overflow = 'visible';
          });

          // Force textarea expansion in clone with multiple reflow passes
          const clonedTextareas = clonedElement.querySelectorAll('textarea');
          clonedTextareas.forEach((textarea) => {
            const ta = textarea as HTMLTextAreaElement;
            
            const computedStyle = window.getComputedStyle(ta);
            const width = computedStyle.width;
            
            ta.style.height = 'auto';
            ta.style.minHeight = '0';
            ta.style.maxHeight = 'none';
            ta.style.overflow = 'hidden';
            ta.style.resize = 'none';
            ta.style.whiteSpace = 'pre-wrap';
            ta.style.wordWrap = 'break-word';
            ta.style.boxSizing = 'border-box';
            ta.style.width = width;
            
            // Multiple reflow passes for accurate height calculation
            void ta.offsetHeight;
            void ta.scrollHeight;
            let scrollHeight = ta.scrollHeight;
            ta.style.height = (scrollHeight + 8) + 'px';
            void ta.offsetHeight;
            scrollHeight = ta.scrollHeight;
            ta.style.height = (scrollHeight + 8) + 'px';
            void ta.offsetHeight;
            scrollHeight = ta.scrollHeight;
            ta.style.height = (scrollHeight + 8) + 'px';
          });
        }
      }
    });

    // Restore all original styles
    originalStyles.forEach(({ el, height, minHeight, maxHeight, overflow }) => {
      el.style.height = height;
      el.style.minHeight = minHeight;
      el.style.maxHeight = maxHeight;
      el.style.overflow = overflow;
    });

    divOriginalStyles.forEach(({ el, overflow }) => {
      el.style.overflow = overflow;
    });

    originalTextareaStyles.forEach(({ el, height, minHeight, maxHeight, overflow, resize }) => {
      el.style.height = height;
      el.style.minHeight = minHeight;
      el.style.maxHeight = maxHeight;
      el.style.overflow = overflow;
      el.style.resize = resize;
    });

    // Remove export mode class
    element.classList.remove('export-mode');

    // Restore sidebar visibility
    if (sidebar) {
      sidebar.style.display = originalSidebarDisplay;
    }

    // Restore controls visibility
    customizeControls.forEach((el) => {
      (el as HTMLElement).style.display = '';
    });
    
    // Cleanup textarea replacements
    textareaReplacements.forEach(({ textarea, replacement }) => {
      replacement.remove();
      textarea.style.display = '';
    });
    
    // Export based on selected format
    if (format.toLowerCase() === 'pdf') {
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // A4 dimensions in points
      const a4Width = 595.28;
      const a4Height = 841.89;
      
      // Determine orientation based on image aspect ratio
      const orientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
      const pageWidth = orientation === 'landscape' ? a4Height : a4Width;
      const pageHeight = orientation === 'landscape' ? a4Width : a4Height;
      
      // Calculate scaling to fit image on page with padding
      const padding = 20;
      const availableWidth = pageWidth - (2 * padding);
      const availableHeight = pageHeight - (2 * padding);
      
      const scaleX = availableWidth / imgWidth;
      const scaleY = availableHeight / imgHeight;
      const scale = Math.min(scaleX, scaleY);
      
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;
      
      // Center image on page
      const x = (pageWidth - scaledWidth) / 2;
      const y = (pageHeight - scaledHeight) / 2;
      
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'pt',
        format: 'a4',
        compress: true
      });
      
      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight, undefined, 'FAST');
      pdf.save(`${filename}.pdf`);
    } else {
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    }
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed. Please try again.');
    throw error;
  }
};