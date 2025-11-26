// SBOX Email Labeler
// Helper functions for email labeling and UI interactions

class EmailLabeler {
  constructor() {
    this.labelStyles = this.createLabelStyles();
  }

  createLabelStyles() {
    // Inject CSS for email labels
    const style = document.createElement('style');
    style.textContent = `
      .sbox-label {
        background-color: #4ecdc4;
        color: white;
        padding: 2px 6px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
        margin-left: 8px;
        margin-right: 4px;
        display: inline-block;
        vertical-align: middle;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
        z-index: 1000;
        position: relative;
        user-select: none;
      }

      .sbox-label:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }

      .sbox-label-business {
        background-color: #2c3e50;
      }

      .sbox-label-customersupport {
        background-color: #3498db;
      }

      .sbox-label-eventsinvitations {
        background-color: #e67e22;
      }

      .sbox-label-financebills {
        background-color: #9b59b6;
      }

      .sbox-label-jobapplication {
        background-color: #27ae60;
      }

      .sbox-label-newsletters {
        background-color: #34495e;
      }

      .sbox-label-personal {
        background-color: #96ceb4;
      }

      .sbox-label-promotions {
        background-color: #ff6b35;
      }

      .sbox-label-reminders {
        background-color: #e74c3c;
        animation: pulse 2s infinite;
      }

      .sbox-label-travelbookings {
        background-color: #1abc9c;
      }

      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }

      .sbox-category-selector {
        position: absolute;
        z-index: 10000;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 4px;
        font-size: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        min-width: 120px;
      }

      .sbox-category-selector option {
        padding: 2px 4px;
      }

      .sbox-training-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        z-index: 10001;
        padding: 20px;
        min-width: 300px;
        max-width: 500px;
      }

      .sbox-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 10000;
      }

      .sbox-confidence-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-left: 4px;
        vertical-align: middle;
      }

      .sbox-confidence-high {
        background-color: #2ecc71;
      }

      .sbox-confidence-medium {
        background-color: #f39c12;
      }

      .sbox-confidence-low {
        background-color: #e74c3c;
      }

      .sbox-stats-tooltip {
        position: absolute;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 11px;
        z-index: 10002;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .sbox-stats-tooltip.show {
        opacity: 1;
      }

      .sbox-bulk-action-bar {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        padding: 12px;
        z-index: 10000;
        display: none;
      }

      .sbox-bulk-action-bar.show {
        display: block;
      }
    `;
    
    document.head.appendChild(style);
    return style;
  }

  createLabel(category, confidence = 1.0, options = {}) {
    const label = document.createElement('span');
    label.className = `sbox-label sbox-label-${category.toLowerCase().replace(' ', '')}`;
    
    // Set label text
    const displayName = this.getCategoryDisplayName(category);
    label.textContent = displayName;

    // Add confidence indicator if requested
    if (options.showConfidence) {
      const indicator = this.createConfidenceIndicator(confidence);
      label.appendChild(indicator);
    }

    // Add tooltip with details
    if (options.showTooltip) {
      label.title = this.createTooltipText(category, confidence);
    }

    // Add interaction handlers
    this.addLabelInteractions(label, category, confidence);

    return label;
  }

  createConfidenceIndicator(confidence) {
    const indicator = document.createElement('span');
    indicator.className = 'sbox-confidence-indicator';
    
    if (confidence >= 0.8) {
      indicator.classList.add('sbox-confidence-high');
    } else if (confidence >= 0.6) {
      indicator.classList.add('sbox-confidence-medium');
    } else {
      indicator.classList.add('sbox-confidence-low');
    }

    return indicator;
  }

  createTooltipText(category, confidence) {
    const percentage = Math.round(confidence * 100);
    return `Category: ${this.getCategoryDisplayName(category)}\nConfidence: ${percentage}%\nClick to change category`;
  }

  addLabelInteractions(label, category, confidence) {
    // Right-click for quick actions
    label.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showQuickActions(label, category, e.clientX, e.clientY);
    });

    // Click for category selector
    label.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showCategorySelector(label, category, confidence);
    });

    // Hover effects
    label.addEventListener('mouseenter', () => {
      this.showHoverTooltip(label, category, confidence);
    });

    label.addEventListener('mouseleave', () => {
      this.hideHoverTooltip();
    });
  }

  showQuickActions(label, category, x, y) {
    const menu = document.createElement('div');
    menu.className = 'sbox-quick-actions';
    menu.style.cssText = `
      position: fixed;
      top: ${y}px;
      left: ${x}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10003;
      min-width: 150px;
    `;

    const actions = [
      { label: 'Change Category', action: () => this.showCategorySelector(label, category) },
      { label: 'Remove Label', action: () => this.removeLabel(label) },
      { label: 'Train Model', action: () => this.showTrainingDialog(label, category) },
      { label: 'Report Issue', action: () => this.reportIssue(category) }
    ];

    actions.forEach(action => {
      const item = document.createElement('div');
      item.textContent = action.label;
      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
      `;
      
      item.addEventListener('click', () => {
        action.action();
        menu.remove();
      });

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f5f5f5';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'white';
      });

      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    // Remove menu when clicking elsewhere
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 100);
  }

  showCategorySelector(label, currentCategory, confidence = 0) {
    // Remove any existing selectors
    const existing = document.querySelectorAll('.sbox-category-selector');
    existing.forEach(selector => selector.remove());

    const selector = document.createElement('select');
    selector.className = 'sbox-category-selector';

    // Position near the label with fixed positioning
    const rect = label.getBoundingClientRect();
    selector.style.cssText = `
      position: fixed;
      top: ${rect.bottom + 4}px;
      left: ${rect.left}px;
      z-index: 10000;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      font-family: inherit;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 120px;
      max-width: 200px;
    `;

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select category...';
    defaultOption.disabled = true;
    selector.appendChild(defaultOption);

    // Add options
    const categories = window.sboxClassifier?.categories || [
      'business', 'customerSupport', 'eventsInvitations', 'financeBills', 
      'jobApplication', 'newsletters', 'personal', 'promotions', 
      'reminders', 'travelBookings'
    ];

    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = this.getCategoryDisplayName(category);
      option.selected = category === currentCategory;
      selector.appendChild(option);
    });

    document.body.appendChild(selector);
    selector.focus();

    // Handle selection change
    const handleChange = () => {
      const newCategory = selector.value;
      if (newCategory && newCategory !== currentCategory) {
        this.updateLabel(label, newCategory, confidence);
      }
      selector.remove();
    };

    selector.addEventListener('change', handleChange);

    // Remove on blur/escape with better handling
    selector.addEventListener('blur', () => {
      setTimeout(() => selector.remove(), 200);
    });

    selector.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        selector.remove();
      }
    });
  }

  updateLabel(label, newCategory, confidence) {
    // Update label text and styling
    label.textContent = this.getCategoryDisplayName(newCategory);
    label.className = `sbox-label sbox-label-${newCategory.toLowerCase().replace(' ', '')}`;
    
    // Update tooltip
    label.title = this.createTooltipText(newCategory, confidence);

    // Send training data to background
    this.sendTrainingData(newCategory, label);
  }

  removeLabel(label) {
    label.style.opacity = '0';
    label.style.transform = 'scale(0.8)';
    setTimeout(() => label.remove(), 200);
  }

  showTrainingDialog(label, category) {
    const overlay = document.createElement('div');
    overlay.className = 'sbox-overlay';

    const popup = document.createElement('div');
    popup.className = 'sbox-training-popup';
    popup.innerHTML = `
      <h3>Train SBOX Model</h3>
      <p>Help improve the classification accuracy for this type of email.</p>
      <div style="margin: 15px 0;">
        <label>Current Category: <strong>${this.getCategoryDisplayName(category)}</strong></label>
      </div>
      <div style="margin: 15px 0;">
        <label for="sbox-correct-category">Correct Category:</label>
        <select id="sbox-correct-category" style="width: 100%; padding: 5px; margin-top: 5px;">
          ${this.getCategoryOptions(category)}
        </select>
      </div>
      <div style="margin: 15px 0;">
        <label for="sbox-feedback">Additional Feedback:</label>
        <textarea id="sbox-feedback" placeholder="Why should this email be in the selected category?" 
                  style="width: 100%; height: 60px; padding: 5px; margin-top: 5px;"></textarea>
      </div>
      <div style="text-align: right; margin-top: 20px;">
        <button id="sbox-cancel-training" style="margin-right: 10px; padding: 8px 16px;">Cancel</button>
        <button id="sbox-submit-training" style="padding: 8px 16px; background: #4ecdc4; color: white; border: none; border-radius: 4px;">Submit</button>
      </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Handle form submission
    popup.querySelector('#sbox-submit-training').addEventListener('click', () => {
      const correctCategory = popup.querySelector('#sbox-correct-category').value;
      const feedback = popup.querySelector('#sbox-feedback').value;
      
      this.submitTraining(correctCategory, feedback, label);
      overlay.remove();
    });

    // Handle cancel
    popup.querySelector('#sbox-cancel-training').addEventListener('click', () => {
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  getCategoryOptions(currentCategory) {
    const categories = [
      'business', 'customerSupport', 'eventsInvitations', 'financeBills', 
      'jobApplication', 'newsletters', 'personal', 'promotions', 
      'reminders', 'travelBookings'
    ];

    return categories.map(category => {
      const selected = category === currentCategory ? 'selected' : '';
      return `<option value="${category}" ${selected}>${this.getCategoryDisplayName(category)}</option>`;
    }).join('');
  }

  async submitTraining(correctCategory, feedback, label) {
    try {
      // Extract email context from the label's parent elements
      const emailContext = this.extractEmailContext(label);
      
      // Send training data to background script
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'addTrainingData',
          category: correctCategory,
          emailData: emailContext,
          feedback: feedback
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });

      // Update the label if category changed
      if (correctCategory !== this.getCurrentCategory(label)) {
        this.updateLabel(label, correctCategory, 1.0);
      }

      // Show success feedback
      this.showFeedback('Training data submitted successfully!', 'success');

    } catch (error) {
      console.error('SBOX: Error submitting training:', error);
      this.showFeedback('Error submitting training data', 'error');
    }
  }

  extractEmailContext(label) {
    // Try to extract email data from the surrounding Gmail elements
    const emailRow = label.closest('tr') || label.closest('.aDP') || label.closest('[data-legacy-thread-id]');
    
    if (!emailRow) {
      return { subject: '', body: '', sender: '' };
    }

    // This is a simplified extraction - in production, you'd need more robust selectors
    const subject = emailRow.querySelector('.bog')?.textContent?.trim() || '';
    const sender = emailRow.querySelector('.yW')?.textContent?.trim() || '';
    const body = emailRow.querySelector('.y2')?.textContent?.trim() || '';

    return { subject, body, sender };
  }

  getCurrentCategory(label) {
    const classes = label.className.split(' ');
    const categoryClass = classes.find(cls => cls.startsWith('sbox-label-'));
    return categoryClass ? categoryClass.replace('sbox-label-', '') : 'unknown';
  }

  showFeedback(message, type = 'info') {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      z-index: 10004;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    switch (type) {
      case 'success':
        feedback.style.backgroundColor = '#2ecc71';
        break;
      case 'error':
        feedback.style.backgroundColor = '#e74c3c';
        break;
      default:
        feedback.style.backgroundColor = '#4ecdc4';
    }

    feedback.textContent = message;
    document.body.appendChild(feedback);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      feedback.style.opacity = '0';
      setTimeout(() => feedback.remove(), 300);
    }, 3000);
  }

  showHoverTooltip(label, category, confidence) {
    const tooltip = document.createElement('div');
    tooltip.className = 'sbox-stats-tooltip';
    tooltip.textContent = this.createTooltipText(category, confidence);

    const rect = label.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + 8}px`;
    tooltip.style.left = `${rect.left}px`;

    document.body.appendChild(tooltip);
    
    // Show tooltip with animation
    setTimeout(() => tooltip.classList.add('show'), 100);

    // Store reference for cleanup
    this.currentTooltip = tooltip;
  }

  hideHoverTooltip() {
    if (this.currentTooltip) {
      this.currentTooltip.classList.remove('show');
      setTimeout(() => {
        if (this.currentTooltip) {
          this.currentTooltip.remove();
          this.currentTooltip = null;
        }
      }, 200);
    }
  }

  getCategoryDisplayName(category) {
    const names = {
      business: 'Business',
      customerSupport: 'Customer Support',
      eventsInvitations: 'Events & Invitations',
      financeBills: 'Finance & Bills',
      jobApplication: 'Job Application',
      newsletters: 'Newsletters',
      personal: 'Personal',
      promotions: 'Promotions',
      reminders: 'Reminders',
      travelBookings: 'Travel & Bookings'
    };
    return names[category] || category;
  }

  sendTrainingData(category, label) {
    try {
      // Check if extension context is valid
      if (!chrome.runtime?.id) {
        console.log('SBOX: Extension context invalidated, skipping training data');
        return;
      }
      
      const emailContext = this.extractEmailContext(label);
      chrome.runtime.sendMessage({
        action: 'addTrainingData',
        category: category,
        emailData: emailContext
      }, (response) => {
        if (chrome.runtime.lastError) {
          if (!chrome.runtime.lastError.message?.includes('Extension context invalidated')) {
            console.error('SBOX: Error sending training data:', chrome.runtime.lastError);
          }
        }
      });
    } catch (error) {
      if (!error.message?.includes('Extension context invalidated')) {
        console.error('SBOX: Error sending training data:', error);
      }
    }
  }

  reportIssue(category) {
    // Simple issue reporting
    const issue = prompt(`Report an issue with ${this.getCategoryDisplayName(category)} classification:`);
    if (issue) {
      console.log(`SBOX Issue Report: ${category} - ${issue}`);
      this.showFeedback('Issue reported. Thank you!', 'success');
    }
  }
}

// Global instance
window.sboxLabeler = new EmailLabeler();