// SBOX Gmail Integration
// Content script for integrating with Gmail interface

class GmailIntegration {
  constructor() {
    this.isEnabled = true;
    this.processedEmails = new Set();
    this.observer = null;
    this.settings = null;
    this.processTimeout = null;
    this.navigationInterval = null;
    this.popstateHandler = null;
    this.maintenanceTimer = null;
    this.isProcessing = false;
    this.isInitializing = false;
    this.isInitialized = false;
    this.initialize();
  }

  async initialize() {
    if (this.isInitializing || this.isInitialized) {
      console.log('SBOX: Already initializing or initialized, skipping...');
      return;
    }
    
    this.isInitializing = true;
    console.log('SBOX: Initializing Gmail integration...');
    
    try {
      // Wait for Gmail to load
      await this.waitForGmail();
      
      // Wait for classifier to be ready
      await this.waitForClassifier();
      
      // Load settings
      await this.loadSettings();
      
      // Start processing emails
      this.startEmailProcessing();
      
      this.isInitialized = true;
      console.log('SBOX: Gmail integration initialized successfully');
    } catch (error) {
      console.error('SBOX: Error initializing Gmail integration:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  async waitForClassifier(timeout = 15000) {
    console.log('SBOX: Waiting for email classifier...');
    const startTime = Date.now();
    
    while (!window.sboxClassifier || window.sboxClassifier.isInitializing) {
      if (Date.now() - startTime > timeout) {
        console.warn('SBOX: Classifier initialization timeout');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    if (window.sboxClassifier) {
      console.log('SBOX: Email classifier is ready');
    } else {
      console.warn('SBOX: Email classifier not available, will use fallback');
    }
  }

  async waitForGmail() {
    return new Promise((resolve) => {
      const checkGmail = () => {
        if (this.isGmailLoaded()) {
          resolve();
        } else {
          setTimeout(checkGmail, 1000);
        }
      };
      checkGmail();
    });
  }

  isGmailLoaded() {
    // Check for Gmail-specific elements
    return document.querySelector('[role="main"]') !== null ||
           document.querySelector('.nH') !== null ||
           document.querySelector('#\\:r') !== null;
  }

  async loadSettings() {
    try {
      // Check if extension context is valid
      if (!chrome.runtime?.id) {
        console.log('SBOX: Extension context invalidated, using default settings');
        this.isEnabled = true;
        return;
      }

      const response = await new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
            if (chrome.runtime.lastError) {
              // Check for context invalidation
              if (chrome.runtime.lastError.message?.includes('Extension context invalidated')) {
                console.log('SBOX: Extension was reloaded, using default settings');
                resolve(null);
              } else {
                reject(chrome.runtime.lastError);
              }
            } else {
              resolve(response);
            }
          });
        } catch (error) {
          console.log('SBOX: Cannot load settings - extension context lost');
          resolve(null);
        }
      });
      
      if (response && response.success) {
        this.settings = response.data;
        this.isEnabled = this.settings.enabled !== false;
      } else {
        this.isEnabled = true; // Default to enabled
      }
    } catch (error) {
      if (!error.message?.includes('Extension context invalidated')) {
        console.error('SBOX: Error loading settings:', error);
      }
      this.isEnabled = true; // Default to enabled
    }
  }

  startEmailProcessing() {
    if (!this.isEnabled) {
      return;
    }

    // Process existing emails
    this.processVisibleEmails();

    // Set up observer for new emails
    this.setupMutationObserver();

    // Process emails when navigation changes (Gmail SPA behavior)
    this.setupNavigationListener();

    // Start periodic label maintenance
    this.startLabelMaintenanceTimer();
  }

  setupMutationObserver() {
    // Clean up existing observer
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      let isEmailListChange = false;
      
      mutations.forEach((mutation) => {
        // Check if new email elements were added
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if this looks like an email row or conversation
              if (this.isEmailElement(node)) {
                shouldProcess = true;
              }
              
              // Check if email list container was added (returning to list view)
              if (node.querySelector && (
                  node.querySelector('.zA') || // Email rows
                  node.querySelector('[data-legacy-thread-id]') || // Thread elements
                  node.classList.contains('aDP') // Email container
                )) {
                isEmailListChange = true;
                shouldProcess = true;
              }
            }
          });
        }
        
        // Check for removed elements
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // If email elements were removed, we might need to reprocess when they come back
              if (node.classList && node.classList.contains('sbox-processed')) {
                const emailId = this.getEmailId(node);
                if (emailId) {
                  this.processedEmails.delete(emailId);
                }
              }
            }
          });
        }
        
        // Check for attribute changes that might indicate view switches
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          if (target.classList && (
              target.classList.contains('nH') || // Gmail main container
              target.classList.contains('aDP') || // Email container
              target.classList.contains('zA') // Email row
            )) {
            shouldProcess = true;
          }
        }
      });

      if (shouldProcess) {
        // Clear timeout if it exists
        clearTimeout(this.processTimeout);
        
        // If this looks like returning to email list, process more aggressively
        const timeout = isEmailListChange ? 100 : 300;
        
        this.processTimeout = setTimeout(() => {
          this.processVisibleEmails();
        }, timeout);
      }
    });

    // Observe the main content area with more comprehensive options
    const target = document.querySelector('[role="main"]') || document.body;
    this.observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'] // Watch for class/style changes that indicate view switches
    });
  }

  setupNavigationListener() {
    // Listen for Gmail navigation changes
    let lastUrl = location.href;
    let currentView = this.detectGmailView();
    
    const checkForNavigation = () => {
      const newUrl = location.href;
      const newView = this.detectGmailView();
      
      if (newUrl !== lastUrl || newView !== currentView) {
        const wasInEmailView = currentView === 'email';
        const nowInListView = newView === 'list';
        
        console.log(`SBOX: Gmail view changed from ${currentView} to ${newView}`);
        
        lastUrl = newUrl;
        currentView = newView;
        
        // If returning to list view from email view, force reprocessing
        if (wasInEmailView && nowInListView) {
          console.log('SBOX: Returning to list view, reprocessing emails...');
          // Clear processed emails to force re-labeling
          this.processedEmails.clear();
          
          // Remove processed markers to allow relabeling
          document.querySelectorAll('.sbox-processed').forEach(el => {
            el.classList.remove('sbox-processed');
          });
          
          // Process emails after a short delay for DOM to settle
          setTimeout(() => {
            this.processVisibleEmails();
          }, 500);
        } else {
          // Normal navigation, process after content loads
          setTimeout(() => {
            this.processVisibleEmails();
          }, 1000);
        }
      }
    };

    // Clean up existing interval if any
    if (this.navigationInterval) {
      clearInterval(this.navigationInterval);
    }
    
    // Check more frequently for better responsiveness
    this.navigationInterval = setInterval(checkForNavigation, 1000);
    
    // Clean up existing popstate listener
    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
    }
    
    // Also listen for popstate events
    this.popstateHandler = () => {
      setTimeout(checkForNavigation, 100);
    };
    window.addEventListener('popstate', this.popstateHandler);
  }

  detectGmailView() {
    // Detect current Gmail view to handle transitions better
    const url = location.href;
    
    // Check for email/conversation view
    if (url.includes('#inbox/') || url.includes('#all/') || url.includes('#sent/')) {
      if (url.match(/#[^/]+\/[a-zA-Z0-9]+$/)) {
        return 'email'; // Single email/conversation view
      }
    }
    
    // Check for compose view
    if (url.includes('#compose') || document.querySelector('[role="dialog"][aria-label*="compose"]')) {
      return 'compose';
    }
    
    // Check for search results
    if (url.includes('#search/')) {
      return 'search';
    }
    
    // Default to list view (inbox, sent, etc.)
    return 'list';
  }

  isEmailElement(element) {
    // Check various Gmail email element patterns
    const emailSelectors = [
      '[data-legacy-thread-id]',
      '.zA',  // Conversation list item
      '.Cp',  // Email in conversation view
      '[role="listitem"]',
      '.aDP', // Inbox email row
      '.bog'  // Conversation view
    ];
    
    return emailSelectors.some(selector => {
      return element.matches && element.matches(selector) ||
             element.querySelector && element.querySelector(selector);
    });
  }

  async processVisibleEmails() {
    if (!this.isEnabled || !window.sboxClassifier) {
      return;
    }

    // Prevent concurrent processing
    if (this.isProcessing) {
      console.log('SBOX: Processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      const emailElements = this.findEmailElements();
      console.log(`SBOX: Found ${emailElements.length} email elements to process`);
      
      for (const element of emailElements) {
        const emailId = this.getEmailId(element);
        
        // Check if element already has a label
        const hasExistingLabel = element.querySelector('.sbox-label');
        const isProcessed = element.classList.contains('sbox-processed');
        
        if (emailId) {
          // If no label exists, process the email
          if (!hasExistingLabel && !isProcessed) {
            await this.processEmail(element, emailId);
            this.processedEmails.add(emailId);
          } 
          // If label exists but element isn't marked as processed, just mark it
          else if (hasExistingLabel && !isProcessed) {
            element.classList.add('sbox-processed');
          }
          // If element was processed but has no label (label got removed), reprocess it
          else if (isProcessed && !hasExistingLabel && this.processedEmails.has(emailId)) {
            console.log(`SBOX: Re-labeling email ${emailId} (label was removed)`);
            element.classList.remove('sbox-processed');
            await this.processEmail(element, emailId);
          }
        }
      }
    } catch (error) {
      console.error('SBOX: Error processing visible emails:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  findEmailElements() {
    // Try multiple selectors to find emails in different Gmail views
    const selectors = [
      // Inbox view
      'tr.zA:not(.sbox-processed)',
      // Conversation view  
      'div.aDP:not(.sbox-processed)',
      // List view
      '[data-legacy-thread-id]:not(.sbox-processed)',
      // Other potential email containers
      '.Cp:not(.sbox-processed)'
    ];

    const elements = [];
    
    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      elements.push(...Array.from(found));
    }

    return elements;
  }

  getEmailId(element) {
    // Try to extract a unique identifier for the email
    return element.getAttribute('data-legacy-thread-id') ||
           element.getAttribute('data-thread-id') ||
           element.getAttribute('id') ||
           element.querySelector('[data-legacy-thread-id]')?.getAttribute('data-legacy-thread-id') ||
           this.generateElementId(element);
  }

  generateElementId(element) {
    // Generate a simple hash based on email content for identification
    const text = element.textContent || '';
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `sbox-${Math.abs(hash)}`;
  }

  async processEmail(element, emailId) {
    try {
      // Extract email data
      const emailData = this.extractEmailData(element);
      
      if (!emailData.subject && !emailData.body) {
        return; // Skip if we can't extract meaningful content
      }

      // Classify the email
      const classification = await window.sboxClassifier.classifyEmail(emailData);
      
      if (!classification || !classification.category) {
        console.warn('SBOX: Invalid classification result');
        return;
      }
      
      // Apply label if confidence is high enough
      const minConfidence = this.settings?.categories?.[classification.category]?.confidence || 0.7;
      
      if (classification.confidence >= minConfidence) {
        this.applyLabel(element, classification);
        this.updateStats(classification.category);
      }
      
      // Mark as processed
      element.classList.add('sbox-processed');
      
    } catch (error) {
      console.error('SBOX: Error processing email:', error);
    }
  }

  extractEmailData(element) {
    const data = {
      subject: '',
      body: '',
      sender: ''
    };

    try {
      // Try to extract subject
      const subjectSelectors = [
        '.bog .aKS', // Conversation view subject
        '.y6 span[title]', // Inbox view subject
        '.aoT .bog', // Alternative subject
        '.a4W .bog', // Another subject pattern
        '[data-legacy-subject]'
      ];

      for (const selector of subjectSelectors) {
        const subjectElement = element.querySelector(selector);
        if (subjectElement) {
          data.subject = subjectElement.textContent?.trim() || subjectElement.getAttribute('title') || '';
          if (data.subject) break;
        }
      }

      // Try to extract sender
      const senderSelectors = [
        '.yW span[email]', // Sender email attribute
        '.yW .go span', // Sender name
        '.a1f .afn', // Alternative sender
        '[data-sender]'
      ];

      for (const selector of senderSelectors) {
        const senderElement = element.querySelector(selector);
        if (senderElement) {
          data.sender = senderElement.getAttribute('email') || 
                       senderElement.textContent?.trim() || '';
          if (data.sender) break;
        }
      }

      // Try to extract body preview
      const bodySelectors = [
        '.y2', // Email preview text
        '.bog .y2', // Conversation preview
        '.a4W .y2' // Alternative preview
      ];

      for (const selector of bodySelectors) {
        const bodyElement = element.querySelector(selector);
        if (bodyElement) {
          data.body = bodyElement.textContent?.trim() || '';
          if (data.body) break;
        }
      }

      // If no body preview, try to get snippet from element text
      if (!data.body) {
        const elementText = element.textContent || '';
        const lines = elementText.split('\n').map(line => line.trim()).filter(line => line);
        data.body = lines.slice(1, 3).join(' '); // Get some text after subject
      }

    } catch (error) {
      console.error('SBOX: Error extracting email data:', error);
    }

    return data;
  }

  applyLabel(element, classification) {
    try {
      // Remove any existing SBOX labels
      const existingLabels = element.querySelectorAll('.sbox-label');
      existingLabels.forEach(label => label.remove());

      // Create label element
      const label = this.createLabel(classification);
      
      // Find the best position to insert the label
      const insertionPoint = this.findLabelInsertionPoint(element);
      
      if (insertionPoint) {
        insertionPoint.appendChild(label);
      }

    } catch (error) {
      console.error('SBOX: Error applying label:', error);
    }
  }

  createLabel(classification) {
    const label = document.createElement('span');
    label.className = 'sbox-label';
    label.textContent = window.sboxClassifier.getCategoryDisplayName(classification.category);
    
    // Style the label
    const color = window.sboxClassifier.getCategoryColor(classification.category);
    label.style.cssText = `
      background-color: ${color};
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
      box-shadow: 0 1px 2px rgba(0,0,0,0.2);
      z-index: 1000;
      position: relative;
    `;

    // Add confidence indicator if enabled
    if (this.settings?.showConfidence) {
      const confidence = Math.round(classification.confidence * 100);
      label.title = `Confidence: ${confidence}%`;
    }

    // Add click handler for training
    label.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showCategorySelector(label, classification);
    });

    return label;
  }

  findLabelInsertionPoint(element) {
    // Try different insertion points based on Gmail layout
    const candidates = [
      element.querySelector('.y6'), // Subject line area
      element.querySelector('.aKS'), // Conversation subject
      element.querySelector('.bog'), // Subject container
      element.querySelector('.yf'), // Email row content
      element // Fallback to element itself
    ];

    for (const candidate of candidates) {
      if (candidate && candidate.style.display !== 'none') {
        return candidate;
      }
    }

    return element;
  }

  showCategorySelector(label, currentClassification) {
    // Remove any existing selectors first
    document.querySelectorAll('.sbox-category-selector').forEach(sel => sel.remove());
    
    // Create a simple dropdown for category correction
    const selector = document.createElement('select');
    selector.className = 'sbox-category-selector';
    
    // Get label position for proper placement
    const labelRect = label.getBoundingClientRect();
    
    selector.style.cssText = `
      position: fixed;
      top: ${labelRect.bottom + 2}px;
      left: ${labelRect.left}px;
      z-index: 10000;
      background: white;
      border: 1px solid #ccc;
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
    const categories = window.sboxClassifier ? window.sboxClassifier.categories : 
      ['business', 'customerSupport', 'eventsInvitations', 'financeBills', 'jobApplication', 'newsletters', 'personal', 'promotions', 'reminders', 'travelBookings'];
    
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = window.sboxClassifier ? window.sboxClassifier.getCategoryDisplayName(category) : category;
      option.selected = category === currentClassification.category;
      selector.appendChild(option);
    });

    // Add to document body for proper positioning
    document.body.appendChild(selector);
    selector.focus();

    // Handle selection
    const handleChange = async () => {
      const newCategory = selector.value;
      if (newCategory && newCategory !== currentClassification.category) {
        try {
          // Update the classification
          await this.updateEmailCategory(label, newCategory, currentClassification);
        } catch (error) {
          console.error('SBOX: Error updating category:', error);
        }
      }
      selector.remove();
    };

    selector.addEventListener('change', handleChange);

    // Remove on blur or escape
    const handleClose = (event) => {
      if (event.type === 'blur' || (event.type === 'keydown' && event.key === 'Escape')) {
        setTimeout(() => {
          if (selector.parentNode) {
            selector.remove();
          }
        }, 100);
      }
    };

    selector.addEventListener('blur', handleClose);
    selector.addEventListener('keydown', handleClose);
    
    // Close when clicking outside
    const handleClickOutside = (event) => {
      if (!selector.contains(event.target)) {
        selector.remove();
        document.removeEventListener('click', handleClickOutside);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
  }

  async updateEmailCategory(label, newCategory, oldClassification) {
    try {
      // Update label appearance
      label.textContent = window.sboxClassifier.getCategoryDisplayName(newCategory);
      const newColor = window.sboxClassifier.getCategoryColor(newCategory);
      label.style.backgroundColor = newColor;

      // Add training data
      // Note: In a real implementation, you'd extract the actual email content
      const emailData = {
        subject: 'Training data', // Would extract real subject
        body: 'Training data', // Would extract real body
        sender: 'training@example.com' // Would extract real sender
      };

      await window.sboxClassifier.addTrainingExample(emailData, newCategory);
      
      console.log(`SBOX: Updated category from ${oldClassification.category} to ${newCategory}`);
    } catch (error) {
      console.error('SBOX: Error updating email category:', error);
    }
  }

  async updateStats(category) {
    try {
      // Check if extension context is valid before making the call
      if (!chrome.runtime?.id) {
        console.log('SBOX: Extension context invalidated, skipping stats update');
        return;
      }

      // Update local stats (simplified version)
      const stats = await new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
            if (chrome.runtime.lastError) {
              // Check specifically for context invalidation
              if (chrome.runtime.lastError.message?.includes('Extension context invalidated')) {
                console.log('SBOX: Extension was reloaded, skipping stats update');
                resolve(null);
              } else {
                reject(chrome.runtime.lastError);
              }
            } else {
              resolve(response);
            }
          });
        } catch (error) {
          // Handle synchronous errors (e.g., extension unloaded)
          console.log('SBOX: Cannot update stats - extension context lost');
          resolve(null);
        }
      });

      if (stats && stats.success) {
        const updatedStats = stats.data;
        updatedStats.totalEmails = (updatedStats.totalEmails || 0) + 1;
        updatedStats.categorizedEmails = (updatedStats.categorizedEmails || 0) + 1;
        
        if (!updatedStats.categoryBreakdown) {
          updatedStats.categoryBreakdown = {};
        }
        updatedStats.categoryBreakdown[category] = (updatedStats.categoryBreakdown[category] || 0) + 1;
        
        // Note: In a real implementation, you'd send this back to background
      }
    } catch (error) {
      // Only log non-context-invalidation errors
      if (!error.message?.includes('Extension context invalidated')) {
        console.error('SBOX: Error updating stats:', error);
      }
    }
  }

  destroy() {
    // Clean up observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Clean up intervals and timeouts
    if (this.navigationInterval) {
      clearInterval(this.navigationInterval);
      this.navigationInterval = null;
    }
    
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }
    
    if (this.processTimeout) {
      clearTimeout(this.processTimeout);
      this.processTimeout = null;
    }
    
    // Clean up event listeners
    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
      this.popstateHandler = null;
    }
    
    // Remove any open selectors
    document.querySelectorAll('.sbox-category-selector').forEach(sel => sel.remove());
    
    // Remove all labels
    const labels = document.querySelectorAll('.sbox-label');
    labels.forEach(label => label.remove());
    
    // Clear processed emails set
    this.processedEmails.clear();
    
    console.log('SBOX: Gmail integration destroyed');
  }
  
  // Method to refresh labels (useful for debugging)
  refresh() {
    console.log('SBOX: Refreshing email labels...');
    this.processedEmails.clear();
    
    // Remove existing processed markers
    document.querySelectorAll('.sbox-processed').forEach(el => {
      el.classList.remove('sbox-processed');
    });
    
    // Remove existing labels
    document.querySelectorAll('.sbox-label').forEach(label => label.remove());
    
    // Reprocess all emails
    setTimeout(() => {
      this.processVisibleEmails();
    }, 500);
  }

  // Method to check and restore missing labels periodically
  startLabelMaintenanceTimer() {
    // Clean up existing timer
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
    }
    
    // Check for missing labels every 5 seconds
    this.maintenanceTimer = setInterval(() => {
      try {
        this.checkAndRestoreLabels();
      } catch (error) {
        console.error('SBOX: Error in label maintenance:', error);
      }
    }, 5000);
  }

  async checkAndRestoreLabels() {
    // Only run in list view to avoid interfering with email reading
    if (this.detectGmailView() !== 'list') {
      return;
    }

    // Don't run if already processing
    if (this.isProcessing) {
      return;
    }

    const emailElements = this.findEmailElements();
    let restoredCount = 0;

    for (const element of emailElements) {
      const emailId = this.getEmailId(element);
      const hasLabel = element.querySelector('.sbox-label');
      const isProcessed = element.classList.contains('sbox-processed');

      // If email was processed but has no label, restore it
      if (emailId && this.processedEmails.has(emailId) && isProcessed && !hasLabel) {
        console.log(`SBOX: Restoring missing label for email ${emailId}`);
        element.classList.remove('sbox-processed');
        await this.processEmail(element, emailId);
        restoredCount++;
      }
    }

    if (restoredCount > 0) {
      console.log(`SBOX: Restored ${restoredCount} missing labels`);
    }
  }
}

// Cleanup any existing instance
if (window.sboxGmail) {
  window.sboxGmail.destroy();
}

// Initialize Gmail integration when script loads
function initializeSBOX() {
  try {
    console.log('SBOX: Initializing Gmail integration...');
    window.sboxGmail = new GmailIntegration();
    console.log('SBOX: Gmail integration initialized successfully');
  } catch (error) {
    console.error('SBOX: Error initializing Gmail integration:', error);
    // Retry after a delay
    setTimeout(initializeSBOX, 2000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSBOX);
} else {
  // Small delay to ensure all scripts are loaded
  setTimeout(initializeSBOX, 100);
}