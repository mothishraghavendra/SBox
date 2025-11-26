// SBOX Background Service Worker
// Handles extension lifecycle, storage management, and ML model initialization

class SBOXBackground {
  constructor() {
    this.initializeExtension();
  }

  initializeExtension() {
    // Initialize storage with default settings
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.setDefaultSettings();
        this.initializeTrainingData();
      } else if (details.reason === 'update') {
        this.handleUpdate();
      }
    });

    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
  }

  async setDefaultSettings() {
    try {
      const defaultSettings = {
        enabled: true,
        categories: {
          business: { enabled: true, color: '#2c3e50', confidence: 0.7 },
        customerSupport: { enabled: true, color: '#e74c3c', confidence: 0.7 },
        eventsInvitations: { enabled: true, color: '#9b59b6', confidence: 0.7 },
        financeBills: { enabled: true, color: '#27ae60', confidence: 0.7 },
        jobApplication: { enabled: true, color: '#f39c12', confidence: 0.7 },
        newsletters: { enabled: true, color: '#16a085', confidence: 0.7 },
        personal: { enabled: true, color: '#3498db', confidence: 0.7 },
        promotions: { enabled: true, color: '#e67e22', confidence: 0.7 },
        reminders: { enabled: true, color: '#8e44ad', confidence: 0.7 },
        travelBookings: { enabled: true, color: '#34495e', confidence: 0.7 }
      },
      modelVersion: '1.0.0',
      autoLearn: true,
      showConfidence: false,
      labelPosition: 'right'
      };

      await chrome.storage.sync.set({ sboxSettings: defaultSettings });
    } catch (error) {
      console.error('SBOX: Error setting default settings:', error);
    }
  }

  async initializeTrainingData() {
    try {
      // Initialize with training patterns based on the dataset
      const initialTrainingData = {
      business: [
        { keywords: ['meeting', 'quarterly', 'team', 'conference', 'project', 'office'], weight: 1.0 },
        { keywords: ['review', 'report', 'policy', 'update', 'deadline', 'client'], weight: 0.9 },
        { keywords: ['company', 'department', 'business', 'corporate', 'professional'], weight: 0.8 }
      ],
      customerSupport: [
        { keywords: ['support', 'help', 'assistance', 'issue', 'problem', 'ticket'], weight: 1.0 },
        { keywords: ['customer', 'service', 'inquiry', 'complaint', 'resolution'], weight: 0.9 },
        { keywords: ['technical', 'troubleshoot', 'contact us', 'help desk'], weight: 0.8 }
      ],
      eventsInvitations: [
        { keywords: ['invitation', 'event', 'party', 'celebration', 'rsvp'], weight: 1.0 },
        { keywords: ['wedding', 'birthday', 'meeting', 'conference', 'gathering'], weight: 0.9 },
        { keywords: ['join us', 'attend', 'venue', 'date', 'time'], weight: 0.8 }
      ],
      financeBills: [
        { keywords: ['invoice', 'bill', 'payment', 'finance', 'account', 'statement'], weight: 1.0 },
        { keywords: ['due', 'amount', 'balance', 'transaction', 'receipt'], weight: 0.9 },
        { keywords: ['bank', 'credit', 'debit', 'paypal', 'charge'], weight: 0.8 }
      ],
      jobApplication: [
        { keywords: ['job', 'application', 'position', 'career', 'employment'], weight: 1.0 },
        { keywords: ['interview', 'resume', 'cv', 'hiring', 'candidate'], weight: 0.9 },
        { keywords: ['opportunity', 'role', 'vacancy', 'recruit'], weight: 0.8 }
      ],
      newsletters: [
        { keywords: ['newsletter', 'digest', 'weekly', 'monthly', 'update'], weight: 1.0 },
        { keywords: ['subscription', 'blog', 'article', 'news', 'bulletin'], weight: 0.9 },
        { keywords: ['unsubscribe', 'mailing list', 'featured', 'latest'], weight: 0.8 }
      ],
      personal: [
        { keywords: ['personal', 'friend', 'family', 'private', 'individual'], weight: 1.0 },
        { keywords: ['hello', 'how are you', 'catch up', 'see you'], weight: 0.9 },
        { keywords: ['regards', 'love', 'best wishes', 'take care'], weight: 0.8 }
      ],
      promotions: [
        { keywords: ['sale', 'discount', 'offer', 'promotion', 'deal', 'coupon'], weight: 1.0 },
        { keywords: ['special', 'limited time', 'save', 'percentage off'], weight: 0.9 },
        { keywords: ['buy now', 'shop', 'exclusive', 'bargain'], weight: 0.8 }
      ],
      reminders: [
        { keywords: ['reminder', 'dont forget', 'remember', 'upcoming', 'due'], weight: 1.0 },
        { keywords: ['deadline', 'appointment', 'meeting', 'scheduled'], weight: 0.9 },
        { keywords: ['follow up', 'action required', 'pending'], weight: 0.8 }
      ],
      travelBookings: [
        { keywords: ['travel', 'booking', 'flight', 'hotel', 'reservation'], weight: 1.0 },
        { keywords: ['trip', 'vacation', 'check-in', 'confirmation', 'itinerary'], weight: 0.9 },
        { keywords: ['airline', 'airport', 'destination', 'departure'], weight: 0.8 }
      ]
      };

      await chrome.storage.local.set({ trainingData: initialTrainingData });
    } catch (error) {
      console.error('SBOX: Error initializing training data:', error);
    }
  }

  async handleUpdate() {
    // Handle extension updates
    const result = await chrome.storage.sync.get(['sboxSettings']);
    if (result.sboxSettings) {
      // Merge new settings with existing ones
      const currentSettings = result.sboxSettings;
      // Add any new categories or settings that weren't in the previous version
      await this.setDefaultSettings();
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'getSettings':
          const settings = await this.getSettings();
          sendResponse({ success: true, data: settings });
          break;

        case 'updateSettings':
          await this.updateSettings(request.settings);
          sendResponse({ success: true });
          break;

        case 'addTrainingData':
          await this.addTrainingData(request.category, request.emailData);
          sendResponse({ success: true });
          break;

        case 'getStats':
          const stats = await this.getStats();
          sendResponse({ success: true, data: stats });
          break;

        case 'resetModel':
          await this.resetModel();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('SBOX Background Error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getSettings() {
    const result = await chrome.storage.sync.get(['sboxSettings']);
    return result.sboxSettings || {};
  }

  async updateSettings(newSettings) {
    const currentSettings = await this.getSettings();
    const mergedSettings = { ...currentSettings, ...newSettings };
    await chrome.storage.sync.set({ sboxSettings: mergedSettings });
  }

  async addTrainingData(category, emailData) {
    const result = await chrome.storage.local.get(['trainingData']);
    const trainingData = result.trainingData || {};
    
    if (!trainingData[category]) {
      trainingData[category] = [];
    }

    // Extract features from email data
    const features = this.extractFeatures(emailData);
    trainingData[category].push({
      features: features,
      timestamp: Date.now(),
      source: 'user_training'
    });

    await chrome.storage.local.set({ trainingData });
  }

  extractFeatures(emailData) {
    const { subject, body, sender } = emailData;
    const text = `${subject} ${body}`.toLowerCase();
    
    return {
      wordCount: text.split(' ').length,
      hasNumbers: /\d/.test(text),
      hasUrls: /http[s]?:\/\//.test(text),
      senderDomain: sender.split('@')[1] || '',
      keywords: this.extractKeywords(text),
      sentiment: this.analyzeSentiment(text)
    };
  }

  extractKeywords(text) {
    // Simple keyword extraction (in production, use more sophisticated NLP)
    const words = text.match(/\b\w{3,}\b/g) || [];
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'its', 'said', 'each', 'make', 'most', 'over', 'such', 'time', 'very', 'what', 'with', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'would', 'there', 'use'];
    
    return words
      .filter(word => !stopWords.includes(word) && word.length > 2)
      .slice(0, 10); // Top 10 keywords
  }

  analyzeSentiment(text) {
    // Simple sentiment analysis (in production, use more sophisticated models)
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'urgent', 'problem'];
    
    const positive = positiveWords.filter(word => text.includes(word)).length;
    const negative = negativeWords.filter(word => text.includes(word)).length;
    
    return positive - negative;
  }

  async getStats() {
    const result = await chrome.storage.local.get(['emailStats']);
    const defaultStats = {
      totalEmails: 0,
      categorizedEmails: 0,
      accuracy: 0,
      categoryBreakdown: {},
      lastUpdated: Date.now()
    };
    
    return result.emailStats || defaultStats;
  }

  async resetModel() {
    // Reset training data and statistics
    await chrome.storage.local.clear();
    await this.initializeTrainingData();
    
    // Reset stats
    const defaultStats = {
      totalEmails: 0,
      categorizedEmails: 0,
      accuracy: 0,
      categoryBreakdown: {},
      lastUpdated: Date.now()
    };
    
    await chrome.storage.local.set({ emailStats: defaultStats });
  }
}

// Initialize the background service
new SBOXBackground();