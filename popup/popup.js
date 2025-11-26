// SBOX Popup JavaScript
// Handles popup UI interactions and extension management

class SBOXPopup {
  constructor() {
    this.currentTab = 'dashboard';
    this.settings = null;
    this.stats = null;
    this.isLoading = false;
    
    this.initialize();
  }

  async initialize() {
    try {
      // Load initial data
      await this.loadSettings();
      await this.loadStats();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize UI
      this.initializeUI();
      
      console.log('SBOX Popup initialized');
    } catch (error) {
      console.error('Error initializing popup:', error);
      this.showError('Failed to initialize extension');
    }
  }

  async loadSettings() {
    try {
      const response = await this.sendMessage({ action: 'getSettings' });
      if (response && response.success) {
        this.settings = response.data;
      } else {
        console.warn('SBOX: Failed to load settings, using defaults');
        this.settings = { enabled: true, categories: {} };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = { enabled: true, categories: {} };
    }
  }

  async loadStats() {
    try {
      const response = await this.sendMessage({ action: 'getStats' });
      if (response && response.success) {
        this.stats = response.data;
      } else {
        console.warn('SBOX: Failed to load stats, using defaults');
        this.stats = { totalEmails: 0, categorizedEmails: 0, categoryBreakdown: {} };
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      this.stats = { totalEmails: 0, categorizedEmails: 0, categoryBreakdown: {} };
    }
  }

  sendMessage(message, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, timeout);
      
      try {
        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timer);
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response || {});
          }
        });
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // Extension toggle
    const extensionToggle = document.getElementById('extension-toggle');
    extensionToggle.addEventListener('change', () => {
      this.toggleExtension(extensionToggle.checked);
    });

    // Dashboard refresh
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.refreshDashboard();
      }
    });

    // Settings event listeners
    this.setupSettingsListeners();
    
    // Categories event listeners
    this.setupCategoriesListeners();
    
    // Training event listeners  
    this.setupTrainingListeners();
  }

  setupSettingsListeners() {
    // Show confidence toggle
    const showConfidence = document.getElementById('show-confidence');
    showConfidence?.addEventListener('change', () => {
      this.updateSetting('showConfidence', showConfidence.checked);
    });

    // Label position
    const labelPosition = document.getElementById('label-position');
    labelPosition?.addEventListener('change', () => {
      this.updateSetting('labelPosition', labelPosition.value);
    });

    // Confidence threshold
    const confidenceThreshold = document.getElementById('confidence-threshold');
    confidenceThreshold?.addEventListener('input', () => {
      const value = parseFloat(confidenceThreshold.value);
      document.querySelector('.range-value').textContent = Math.round(value * 100) + '%';
      this.updateSetting('confidenceThreshold', value);
    });

    // Auto-learn toggle
    const autoLearn = document.getElementById('auto-learn');
    autoLearn?.addEventListener('change', () => {
      this.updateSetting('autoLearn', autoLearn.checked);
    });

    // Clear all data
    const clearAllData = document.getElementById('clear-all-data');
    clearAllData?.addEventListener('click', () => {
      this.clearAllData();
    });
  }

  setupCategoriesListeners() {
    // Reset categories
    const resetCategories = document.getElementById('reset-categories');
    resetCategories?.addEventListener('click', () => {
      this.resetCategories();
    });

    // Add custom category
    const addCustomCategory = document.getElementById('add-custom-category');
    addCustomCategory?.addEventListener('click', () => {
      this.addCustomCategory();
    });
  }

  setupTrainingListeners() {
    // Retrain model
    const retrainModel = document.getElementById('retrain-model');
    retrainModel?.addEventListener('click', () => {
      this.retrainModel();
    });

    // Reset model
    const resetModel = document.getElementById('reset-model');
    resetModel?.addEventListener('click', () => {
      this.resetModel();
    });

    // Export/Import training data
    const exportTraining = document.getElementById('export-training');
    exportTraining?.addEventListener('click', () => {
      this.exportTrainingData();
    });

    const importTraining = document.getElementById('import-training');
    importTraining?.addEventListener('click', () => {
      this.importTrainingData();
    });
  }

  initializeUI() {
    this.updateExtensionToggle();
    this.updateDashboard();
    this.updateCategories();
    this.updateTraining();
    this.updateSettings();
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    this.currentTab = tabName;

    // Refresh tab-specific data
    switch (tabName) {
      case 'dashboard':
        this.refreshDashboard();
        break;
      case 'categories':
        this.updateCategories();
        break;
      case 'training':
        this.updateTraining();
        break;
    }
  }

  async toggleExtension(enabled) {
    try {
      this.showLoading(true);
      
      await this.updateSetting('enabled', enabled);
      
      // Notify content scripts
      const tabs = await chrome.tabs.query({ 
        url: ['https://mail.google.com/*', 'https://gmail.com/*'] 
      });
      
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { 
          action: 'toggleExtension', 
          enabled: enabled 
        }).catch(() => {
          // Ignore errors for tabs without content script
        });
      });
      
    } catch (error) {
      console.error('Error toggling extension:', error);
      this.showError('Failed to toggle extension');
    } finally {
      this.showLoading(false);
    }
  }

  updateExtensionToggle() {
    const toggle = document.getElementById('extension-toggle');
    if (toggle && this.settings) {
      toggle.checked = this.settings.enabled !== false;
    }
  }

  async refreshDashboard() {
    await this.loadStats();
    this.updateDashboard();
  }

  updateDashboard() {
    if (!this.stats) return;

    // Update stats cards
    document.getElementById('total-emails').textContent = this.stats.totalEmails || 0;
    document.getElementById('accuracy-rate').textContent = 
      Math.round((this.stats.accuracy || 0) * 100) + '%';
    
    const activeCategories = this.settings?.categories ? 
      Object.keys(this.settings.categories).filter(cat => 
        this.settings.categories[cat].enabled
      ).length : 15;
    document.getElementById('categories-active').textContent = activeCategories;

    // Update category chart
    this.updateCategoryChart();

    // Update recent activity
    this.updateRecentActivity();
  }

  updateCategoryChart() {
    const chartContainer = document.getElementById('category-chart');
    if (!chartContainer || !this.stats?.categoryBreakdown) return;

    chartContainer.innerHTML = '';

    const categories = [
      { name: 'business', label: 'Business', color: '#2c3e50' },
      { name: 'customerSupport', label: 'Customer Support', color: '#3498db' },
      { name: 'eventsInvitations', label: 'Events & Invitations', color: '#e67e22' },
      { name: 'financeBills', label: 'Finance & Bills', color: '#9b59b6' },
      { name: 'jobApplication', label: 'Job Application', color: '#27ae60' },
      { name: 'newsletters', label: 'Newsletters', color: '#34495e' },
      { name: 'personal', label: 'Personal', color: '#96ceb4' },
      { name: 'promotions', label: 'Promotions', color: '#ff6b35' },
      { name: 'reminders', label: 'Reminders', color: '#e74c3c' },
      { name: 'travelBookings', label: 'Travel & Bookings', color: '#1abc9c' }
    ];

    const total = Object.values(this.stats.categoryBreakdown).reduce((sum, count) => sum + count, 0);

    categories.forEach(category => {
      const count = this.stats.categoryBreakdown[category.name] || 0;
      const percentage = total > 0 ? (count / total) * 100 : 0;

      const chartItem = document.createElement('div');
      chartItem.className = 'chart-item';
      chartItem.innerHTML = `
        <div class="chart-color" style="background-color: ${category.color}"></div>
        <div class="chart-label">${category.label}</div>
        <div class="chart-bar">
          <div class="chart-fill" style="width: ${percentage}%; background-color: ${category.color}"></div>
        </div>
        <div class="chart-value">${count}</div>
      `;

      chartContainer.appendChild(chartItem);
    });
  }

  updateRecentActivity() {
    const activityList = document.getElementById('recent-activity-list');
    if (!activityList) return;

    // Placeholder for recent activity
    activityList.innerHTML = `
      <div class="activity-item">
        <div class="activity-category" style="background-color: #4ecdc4;">NOTIF</div>
        <div class="activity-text">Classified system notification</div>
        <div class="activity-time">2m ago</div>
      </div>
      <div class="activity-item">
        <div class="activity-category" style="background-color: #ff6b35;">MARK</div>
        <div class="activity-text">Detected promotional email</div>
        <div class="activity-time">5m ago</div>
      </div>
      <div class="activity-item">
        <div class="activity-category" style="background-color: #e74c3c;">RESP</div>
        <div class="activity-text">Important email needs response</div>
        <div class="activity-time">8m ago</div>
      </div>
    `;
  }

  updateCategories() {
    const categoriesList = document.getElementById('categories-list');
    if (!categoriesList || !this.settings?.categories) return;

    categoriesList.innerHTML = '';

    const categories = [
      { name: 'business', label: 'Business', color: '#2c3e50' },
      { name: 'customerSupport', label: 'Customer Support', color: '#3498db' },
      { name: 'eventsInvitations', label: 'Events & Invitations', color: '#e67e22' },
      { name: 'financeBills', label: 'Finance & Bills', color: '#9b59b6' },
      { name: 'jobApplication', label: 'Job Application', color: '#27ae60' },
      { name: 'newsletters', label: 'Newsletters', color: '#34495e' },
      { name: 'personal', label: 'Personal', color: '#96ceb4' },
      { name: 'promotions', label: 'Promotions', color: '#ff6b35' },
      { name: 'reminders', label: 'Reminders', color: '#e74c3c' },
      { name: 'travelBookings', label: 'Travel & Bookings', color: '#1abc9c' }
    ];

    categories.forEach(category => {
      const settings = this.settings.categories[category.name] || {};
      const enabled = settings.enabled !== false;
      const confidence = settings.confidence || 0.7;

      const categoryItem = document.createElement('div');
      categoryItem.className = 'category-item';
      categoryItem.innerHTML = `
        <div class="category-header">
          <div class="category-name">
            <div class="category-color" style="background-color: ${category.color}"></div>
            <div class="category-title">${category.label}</div>
          </div>
          <label class="toggle category-toggle">
            <input type="checkbox" ${enabled ? 'checked' : ''} data-category="${category.name}">
            <span class="slider"></span>
          </label>
        </div>
        <div class="category-settings">
          <label>Confidence Threshold:</label>
          <input type="range" min="0.1" max="1.0" step="0.1" value="${confidence}" 
                 data-category="${category.name}" class="confidence-slider">
          <span class="range-value">${Math.round(confidence * 100)}%</span>
        </div>
      `;

      // Add event listeners
      const toggle = categoryItem.querySelector('input[type="checkbox"]');
      toggle.addEventListener('change', () => {
        this.updateCategoryEnabled(category.name, toggle.checked);
      });

      const slider = categoryItem.querySelector('.confidence-slider');
      slider.addEventListener('input', () => {
        const value = parseFloat(slider.value);
        categoryItem.querySelector('.range-value').textContent = Math.round(value * 100) + '%';
        this.updateCategoryConfidence(category.name, value);
      });

      categoriesList.appendChild(categoryItem);
    });
  }

  updateTraining() {
    // Update training status
    document.getElementById('training-examples').textContent = 
      this.stats?.trainingExamples || 0;
    
    document.getElementById('last-training').textContent = 
      this.stats?.lastTraining ? new Date(this.stats.lastTraining).toLocaleDateString() : 'Never';
    
    document.getElementById('model-version').textContent = 
      this.settings?.modelVersion || '1.0.0';
  }

  updateSettings() {
    if (!this.settings) return;

    // Update checkboxes and inputs
    const showConfidence = document.getElementById('show-confidence');
    if (showConfidence) {
      showConfidence.checked = this.settings.showConfidence || false;
    }

    const labelPosition = document.getElementById('label-position');
    if (labelPosition) {
      labelPosition.value = this.settings.labelPosition || 'right';
    }

    const confidenceThreshold = document.getElementById('confidence-threshold');
    if (confidenceThreshold) {
      confidenceThreshold.value = this.settings.confidenceThreshold || 0.7;
      document.querySelector('.range-value').textContent = 
        Math.round((this.settings.confidenceThreshold || 0.7) * 100) + '%';
    }

    const autoLearn = document.getElementById('auto-learn');
    if (autoLearn) {
      autoLearn.checked = this.settings.autoLearn !== false;
    }
  }

  async updateSetting(key, value) {
    try {
      const newSettings = { [key]: value };
      await this.sendMessage({ action: 'updateSettings', settings: newSettings });
      
      // Update local settings
      this.settings = { ...this.settings, [key]: value };
      
    } catch (error) {
      console.error('Error updating setting:', error);
      this.showError('Failed to update setting');
    }
  }

  async updateCategoryEnabled(categoryName, enabled) {
    const categories = { ...this.settings.categories };
    if (!categories[categoryName]) {
      categories[categoryName] = {};
    }
    categories[categoryName].enabled = enabled;

    await this.updateSetting('categories', categories);
  }

  async updateCategoryConfidence(categoryName, confidence) {
    const categories = { ...this.settings.categories };
    if (!categories[categoryName]) {
      categories[categoryName] = {};
    }
    categories[categoryName].confidence = confidence;

    await this.updateSetting('categories', categories);
  }

  async resetCategories() {
    if (confirm('Reset all categories to default settings?')) {
      try {
        this.showLoading(true);
        await this.sendMessage({ action: 'resetCategories' });
        await this.loadSettings();
        this.updateCategories();
        this.showSuccess('Categories reset to defaults');
      } catch (error) {
        console.error('Error resetting categories:', error);
        this.showError('Failed to reset categories');
      } finally {
        this.showLoading(false);
      }
    }
  }

  async retrainModel() {
    try {
      this.showLoading(true, 'Retraining model...');
      
      await this.sendMessage({ action: 'retrainModel' });
      
      await this.loadStats();
      this.updateTraining();
      
      this.showSuccess('Model retrained successfully');
    } catch (error) {
      console.error('Error retraining model:', error);
      this.showError('Failed to retrain model');
    } finally {
      this.showLoading(false);
    }
  }

  async resetModel() {
    if (confirm('Reset the machine learning model? This will clear all training data.')) {
      try {
        this.showLoading(true, 'Resetting model...');
        
        await this.sendMessage({ action: 'resetModel' });
        
        await this.loadStats();
        this.updateTraining();
        
        this.showSuccess('Model reset successfully');
      } catch (error) {
        console.error('Error resetting model:', error);
        this.showError('Failed to reset model');
      } finally {
        this.showLoading(false);
      }
    }
  }

  exportTrainingData() {
    // Placeholder for export functionality
    this.showSuccess('Export functionality coming soon');
  }

  importTrainingData() {
    // Placeholder for import functionality  
    this.showSuccess('Import functionality coming soon');
  }

  addCustomCategory() {
    const name = prompt('Enter category name:');
    if (name && name.trim()) {
      // Placeholder for adding custom categories
      this.showSuccess('Custom categories coming in future update');
    }
  }

  async clearAllData() {
    if (confirm('Clear all extension data? This cannot be undone.')) {
      try {
        this.showLoading(true, 'Clearing data...');
        
        // Clear storage
        await chrome.storage.local.clear();
        await chrome.storage.sync.clear();
        
        // Reinitialize
        await this.loadSettings();
        await this.loadStats();
        this.initializeUI();
        
        this.showSuccess('All data cleared');
      } catch (error) {
        console.error('Error clearing data:', error);
        this.showError('Failed to clear data');
      } finally {
        this.showLoading(false);
      }
    }
  }

  showLoading(show, text = 'Processing...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = overlay?.querySelector('.loading-text');
    
    if (overlay) {
      overlay.classList.toggle('show', show);
      if (loadingText) {
        loadingText.textContent = text;
      }
    }
    
    this.isLoading = show;
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // Simple notification system
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // In a real implementation, you'd show a toast notification
    // For now, we'll use the browser's notification system
    if (type === 'error') {
      console.error(message);
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.sboxPopup = new SBOXPopup();
});