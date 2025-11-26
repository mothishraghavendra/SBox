// SBOX Email Classifier
// Neural network-based email categorization system using TensorFlow.js

class EmailClassifier {
  constructor() {
    this.model = null;
    this.isModelLoaded = false;
    this.isInitializing = false;
    this.categories = ['business', 'customerSupport', 'eventsInvitations', 'financeBills', 'jobApplication', 'newsletters', 'personal', 'promotions', 'reminders', 'travelBookings'];
    this.vocabularySize = 10000;
    this.maxSequenceLength = 100;
    this.vocabulary = new Map();
    this.trainingData = null;
    this.initializeAsync();
  }

  async initializeAsync() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    
    try {
      console.log('SBOX: Initializing EmailClassifier...');
      await this.loadModel();
      console.log('SBOX: EmailClassifier initialized successfully');
    } catch (error) {
      console.error('SBOX: Error initializing EmailClassifier:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  async loadModel() {
    try {
      // Try to load existing model from storage
      const savedModel = await this.loadSavedModel();
      if (savedModel) {
        this.model = savedModel;
        this.isModelLoaded = true;
        console.log('SBOX: Loaded saved model');
      } else {
        // Create new model if none exists
        await this.createModel();
        console.log('SBOX: Created new model');
      }
    } catch (error) {
      console.error('SBOX: Error loading model:', error);
      await this.createModel(); // Fallback to new model
    }
  }

  async loadSavedModel() {
    try {
      // Try to load training data from the dataset
      await this.loadDatasetTrainingData();
      return null; // Still create new model each time, but with better training data
    } catch (error) {
      console.error('SBOX: Error loading saved model:', error);
      return null;
    }
  }

  async loadDatasetTrainingData() {
    try {
      // Load the training data from our processed dataset
      const response = await fetch(chrome.runtime.getURL('data/email_training_data.json'));
      if (response.ok) {
        const trainingData = await response.json();
        console.log('SBOX: Loaded dataset training data:', trainingData.total_examples, 'examples');
        
        // Process and store the training data
        await this.processDatasetTraining(trainingData);
      }
    } catch (error) {
      console.log('SBOX: Dataset training data not found, using default patterns');
    }
  }

  async processDatasetTraining(datasetTraining) {
    try {
      const processedData = {};
      
      // Initialize categories
      this.categories.forEach(cat => {
        processedData[cat] = [];
      });

      // Process each example from the dataset
      for (const example of datasetTraining.examples) {
        const category = this.mapDatasetLabelToCategory(example.primary_label);
        if (category && processedData[category]) {
          const features = this.extractFeaturesFromText(example.text);
          processedData[category].push({
            features: features,
            keywords: this.extractKeywordsFromText(example.text),
            timestamp: Date.now(),
            source: 'dataset'
          });
        }
      }

      // Store in chrome storage for training
      await chrome.storage.local.set({ 
        datasetTrainingData: processedData,
        datasetLoaded: true 
      });

      console.log('SBOX: Processed dataset training data for categories:', Object.keys(processedData));
    } catch (error) {
      console.error('SBOX: Error processing dataset training:', error);
    }
  }

  mapDatasetLabelToCategory(datasetLabel) {
    const mapping = {
      'Business': 'business',
      'Customer Support': 'customerSupport', 
      'Events & Invitations': 'eventsInvitations',
      'Finance & Bills': 'financeBills',
      'Job Application': 'jobApplication',
      'Newsletters': 'newsletters',
      'Personal': 'personal',
      'Promotions': 'promotions',
      'Reminders': 'reminders',
      'Travel & Bookings': 'travelBookings'
    };
    return mapping[datasetLabel];
  }

  extractFeaturesFromText(text) {
    const lowerText = text.toLowerCase();
    return {
      wordCount: text.split(' ').length,
      hasNumbers: /\d/.test(text),
      hasUrls: /http[s]?:\/\//.test(text),
      hasEmail: /@/.test(text),
      hasPhone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text),
      sentenceCount: text.split(/[.!?]+/).length,
      avgWordLength: text.split(' ').reduce((sum, word) => sum + word.length, 0) / text.split(' ').length,
      keywords: this.extractKeywordsFromText(text)
    };
  }

  extractKeywordsFromText(text) {
    const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'its', 'said', 'each', 'make', 'most', 'over', 'such', 'time', 'very', 'what', 'with', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'would', 'there', 'use', 'will', 'about', 'like', 'just', 'that', 'this']);
    
    return words
      .filter(word => !stopWords.has(word) && word.length > 2)
      .slice(0, 15); // Top 15 keywords
  }

  async createModel() {
    try {
      // Build vocabulary from training data
      await this.buildVocabulary();

      // Create neural network architecture
      this.model = tf.sequential({
        layers: [
          // Embedding layer for text vectorization
          tf.layers.embedding({
            inputDim: this.vocabularySize,
            outputDim: 64,
            inputLength: this.maxSequenceLength
          }),
          
          // LSTM layers for sequence processing
          tf.layers.lstm({
            units: 64,
            returnSequences: true,
            dropout: 0.2,
            recurrentDropout: 0.2
          }),
          
          tf.layers.lstm({
            units: 32,
            dropout: 0.2,
            recurrentDropout: 0.2
          }),
          
          // Dense layers for classification
          tf.layers.dense({
            units: 32,
            activation: 'relu'
          }),
          
          tf.layers.dropout({ rate: 0.3 }),
          
          tf.layers.dense({
            units: this.categories.length,
            activation: 'softmax'
          })
        ]
      });

      // Compile model
      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      this.isModelLoaded = true;
      
      // Train with initial data
      await this.initialTraining();
      
    } catch (error) {
      console.error('SBOX: Error creating model:', error);
      throw error;
    }
  }

  async buildVocabulary() {
    try {
      // Get training data from storage
      const result = await new Promise((resolve, reject) => {
        try {
          chrome.storage.local.get(['trainingData'], (result) => {
            if (chrome.runtime.lastError) {
              console.warn('SBOX: Error loading training data for vocabulary:', chrome.runtime.lastError);
              resolve({ trainingData: {} });
            } else {
              resolve(result);
            }
          });
        } catch (error) {
          console.warn('SBOX: Exception loading training data for vocabulary:', error);
          resolve({ trainingData: {} });
        }
      });
      
      const trainingData = result.trainingData || {};
      const words = new Set();
      
      // Extract words from all categories
      for (const category of Object.keys(trainingData)) {
        const categoryData = trainingData[category];
        for (const item of categoryData) {
          if (item.keywords) {
            item.keywords.forEach(keyword => words.add(keyword.toLowerCase()));
          }
        }
      }

      // Build vocabulary mapping
      this.vocabulary.clear();
      Array.from(words).slice(0, this.vocabularySize - 2).forEach((word, index) => {
        this.vocabulary.set(word, index + 2); // Reserve 0 for padding, 1 for unknown
      });
      
      console.log(`SBOX: Built vocabulary with ${this.vocabulary.size} words`);
    } catch (error) {
      console.error('SBOX: Error building vocabulary:', error);
    }
  }

  async initialTraining() {
    try {
      const trainingData = await this.prepareTrainingData();
      if (trainingData.inputs.length > 0) {
        await this.trainModel(trainingData.inputs, trainingData.labels);
      }
    } catch (error) {
      console.error('SBOX: Error in initial training:', error);
    }
  }

  async prepareTrainingData() {
    const result = await new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(['trainingData'], (result) => {
          if (chrome.runtime.lastError) {
            console.warn('SBOX: Error loading training data:', chrome.runtime.lastError);
            resolve({ trainingData: {} });
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        console.warn('SBOX: Exception loading training data:', error);
        resolve({ trainingData: {} });
      }
    });
    
    const trainingData = result.trainingData || {};
    const inputs = [];
    const labels = [];

    for (let catIndex = 0; catIndex < this.categories.length; catIndex++) {
      const category = this.categories[catIndex];
      const categoryData = trainingData[category] || [];

      for (const item of categoryData) {
        if (item.keywords && item.keywords.length > 0) {
          // Convert keywords to sequence
          const sequence = this.textToSequence(item.keywords.join(' '));
          inputs.push(sequence);

          // Create one-hot encoded label
          const label = new Array(this.categories.length).fill(0);
          label[catIndex] = 1;
          labels.push(label);
        }
      }
    }

    return { inputs, labels };
  }

  textToSequence(text) {
    const words = text.toLowerCase().split(/\W+/);
    const sequence = words
      .map(word => this.vocabulary.get(word) || 1) // 1 for unknown words
      .slice(0, this.maxSequenceLength);
    
    // Pad sequence to maxSequenceLength
    while (sequence.length < this.maxSequenceLength) {
      sequence.push(0); // 0 for padding
    }
    
    return sequence;
  }

  async trainModel(inputs, labels) {
    if (!this.model || inputs.length === 0) {
      return;
    }

    try {
      const xs = tf.tensor2d(inputs);
      const ys = tf.tensor2d(labels);

      await this.model.fit(xs, ys, {
        epochs: 10,
        batchSize: 32,
        validationSplit: 0.2,
        verbose: 0
      });

      xs.dispose();
      ys.dispose();
      
      console.log('SBOX: Model training completed');
    } catch (error) {
      console.error('SBOX: Training error:', error);
    }
  }

  async classifyEmail(emailData) {
    // Wait for initialization to complete if still initializing
    if (this.isInitializing) {
      console.log('SBOX: Waiting for classifier initialization...');
      await this.waitForInitialization();
    }
    
    if (!this.isModelLoaded || !this.model) {
      return this.fallbackClassification(emailData);
    }

    try {
      const { subject, body, sender } = emailData;
      const text = `${subject} ${body}`;
      
      // Convert text to sequence
      const sequence = this.textToSequence(text);
      const input = tf.tensor2d([sequence]);
      
      // Make prediction
      const prediction = this.model.predict(input);
      if (!prediction) {
        console.warn('SBOX: Model prediction returned null');
        input.dispose();
        return this.fallbackClassification(emailData);
      }
      
      const probabilities = await prediction.data();
      if (!probabilities || probabilities.length === 0) {
        console.warn('SBOX: No probabilities returned from model');
        input.dispose();
        prediction.dispose();
        return this.fallbackClassification(emailData);
      }
      
      // Find best category
      let bestCategory = 'personal'; // default
      let bestConfidence = 0;
      
      for (let i = 0; i < this.categories.length; i++) {
        if (probabilities[i] > bestConfidence) {
          bestConfidence = probabilities[i];
          bestCategory = this.categories[i];
        }
      }

      // Clean up tensors
      input.dispose();
      prediction.dispose();

      return {
        category: bestCategory,
        confidence: bestConfidence,
        allProbabilities: Array.from(probabilities)
      };

    } catch (error) {
      console.error('SBOX: Classification error:', error);
      return this.fallbackClassification(emailData);
    }
  }

  async waitForInitialization(timeout = 10000) {
    const startTime = Date.now();
    while (this.isInitializing) {
      if (Date.now() - startTime > timeout) {
        console.warn('SBOX: Initialization timeout, using fallback');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  fallbackClassification(emailData) {
    // Simple rule-based fallback when ML model is not available
    const { subject, body, sender } = emailData;
    const text = `${subject} ${body}`.toLowerCase();
    
    // Business
    if (this.containsAny(text, ['meeting', 'quarterly', 'team', 'conference', 'project', 'business', 'office'])) {
      return { category: 'business', confidence: 0.8, source: 'fallback' };
    }
    
    // Customer Support
    if (this.containsAny(text, ['support', 'help', 'assistance', 'issue', 'problem', 'ticket', 'customer service'])) {
      return { category: 'customerSupport', confidence: 0.8, source: 'fallback' };
    }
    
    // Events & Invitations
    if (this.containsAny(text, ['invitation', 'event', 'party', 'celebration', 'rsvp', 'wedding', 'birthday'])) {
      return { category: 'eventsInvitations', confidence: 0.8, source: 'fallback' };
    }
    
    // Finance & Bills
    if (this.containsAny(text, ['invoice', 'bill', 'payment', 'finance', 'account', 'statement', 'bank'])) {
      return { category: 'financeBills', confidence: 0.8, source: 'fallback' };
    }
    
    // Job Application
    if (this.containsAny(text, ['job', 'application', 'position', 'career', 'employment', 'interview', 'hiring'])) {
      return { category: 'jobApplication', confidence: 0.8, source: 'fallback' };
    }
    
    // Newsletters
    if (this.containsAny(text, ['newsletter', 'digest', 'weekly', 'monthly', 'subscription', 'mailing list'])) {
      return { category: 'newsletters', confidence: 0.8, source: 'fallback' };
    }
    
    // Promotions
    if (this.containsAny(text, ['sale', 'discount', 'offer', 'promotion', 'deal', 'coupon', 'special'])) {
      return { category: 'promotions', confidence: 0.8, source: 'fallback' };
    }
    
    // Reminders  
    if (this.containsAny(text, ['reminder', 'dont forget', 'remember', 'upcoming', 'due', 'deadline'])) {
      return { category: 'reminders', confidence: 0.8, source: 'fallback' };
    }
    
    // Travel & Bookings
    if (this.containsAny(text, ['travel', 'booking', 'flight', 'hotel', 'reservation', 'trip', 'vacation'])) {
      return { category: 'travelBookings', confidence: 0.8, source: 'fallback' };
    }
    
    // Default to personal
    return { category: 'personal', confidence: 0.5, source: 'fallback' };
  }

  containsAny(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }

  async addTrainingExample(emailData, category) {
    try {
      // Add to storage for future training
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'addTrainingData',
          category: category,
          emailData: emailData
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });

      // Retrain model with new data
      await this.retrainModel();
      
    } catch (error) {
      console.error('SBOX: Error adding training example:', error);
    }
  }

  async retrainModel() {
    try {
      const trainingData = await this.prepareTrainingData();
      if (trainingData.inputs.length > 0) {
        await this.trainModel(trainingData.inputs, trainingData.labels);
      }
    } catch (error) {
      console.error('SBOX: Error retraining model:', error);
    }
  }

  getCategoryColor(category) {
    const colors = {
      business: '#2c3e50',
      customerSupport: '#3498db',
      eventsInvitations: '#e67e22',
      financeBills: '#9b59b6',
      jobApplication: '#27ae60',
      newsletters: '#34495e',
      personal: '#96ceb4',
      promotions: '#ff6b35',
      reminders: '#e74c3c',
      travelBookings: '#1abc9c'
    };
    return colors[category] || '#95a5a6';
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
}

// Initialize classifier with error handling
function initializeClassifier() {
  try {
    if (window.sboxClassifier) {
      console.log('SBOX: Classifier already exists, skipping initialization');
      return;
    }
    
    console.log('SBOX: Creating EmailClassifier instance...');
    window.sboxClassifier = new EmailClassifier();
    
    // Add debugging methods
    window.sboxClassifier.debug = {
      getStatus: () => ({
        isLoaded: window.sboxClassifier.isModelLoaded,
        isInitializing: window.sboxClassifier.isInitializing,
        categories: window.sboxClassifier.categories,
        modelExists: !!window.sboxClassifier.model,
        trainingDataSize: window.sboxClassifier.trainingData?.length || 0
      })
    };
    
  } catch (error) {
    console.error('SBOX: Failed to initialize classifier:', error);
  }
}

// Initialize when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeClassifier);
} else {
  setTimeout(initializeClassifier, 10);
}