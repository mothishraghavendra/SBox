# SBOX - Smart Email Categorizer

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/YOUR_USERNAME/sbox)s
[![Chrome](https://img.shields.io/badge/chrome-extension-orange.svg)](https://www.google.com/chrome/)
[![TensorFlow.js](https://img.shields.io/badge/tensorflow.js-ML-ff6f00.svg)](https://www.tensorflow.org/js)

🧠 **AI-Powered Email Categorization for Gmail**

SBOX is a Chrome Extension that uses supervised neural networks to automatically categorize emails in Gmail. It intelligently labels emails using 10 real-world categories trained on actual email data to help you manage your inbox more efficiently.

![SBOX Demo](docs/demo-screenshot.png)

## 🎯 Features

### 🤖 **Machine Learning Classification**
- **Supervised Neural Networks** powered by TensorFlow.js
- **10 Real-World Categories**: Business, Customer Support, Events & Invitations, Finance & Bills, Job Application, Newsletters, Personal, Promotions, Reminders, Travel & Bookings
- **Trained on 1,000+ Real Emails** from Hugging Face dataset
- **Real-time Processing** as you browse your inbox
- **Continuous Learning** from your corrections

### 📧 **Gmail Integration**  
- **Seamless Integration** with Gmail interface
- **Visual Labels** displayed next to email subjects
- **Non-intrusive Design** that doesn't break Gmail functionality
- **Instant Classification** of incoming emails

### 🎨 **Smart Interface**
- **Color-coded Labels** for easy recognition
- **Confidence Indicators** show classification certainty  
- **Click-to-Correct** labels for training the model
- **Customizable Settings** for categories and thresholds

### 🔒 **Privacy-First**
- **100% Local Processing** - no data leaves your device
- **No External Servers** - all AI runs in your browser
- **GDPR Compliant** - your emails stay private
- **Zero Data Collection** - we don't track or store anything

## 🚀 Installation

### Step 1: Download the Extension

**Option A: Clone with Git**
```bash
git clone https://github.com/YOUR_USERNAME/sbox.git
cd sbox
```

**Option B: Download ZIP**
1. Click the green "Code" button at the top of this page
2. Select "Download ZIP"
3. Extract the ZIP file to a folder on your computer (e.g., `C:\SBOX` or `~/SBOX`)

### Step 2: Download TensorFlow.js Library

The extension requires TensorFlow.js for machine learning. Download it to the `lib` folder:

**Windows (PowerShell):**
```powershell
cd path\to\sbox
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js" -OutFile "lib\tensorflow.min.js"
```

**Mac/Linux (Terminal):**
```bash
cd path/to/sbox
curl https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js -o lib/tensorflow.min.js
```

**Manual Download:**
- Visit: https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js
- Right-click → "Save As..." → Save to `sbox/lib/tensorflow.min.js`

### Step 3: Load Extension in Chrome

1. **Open Chrome Extensions Page**
   - Open Google Chrome browser
   - Type `chrome://extensions/` in the address bar and press Enter
   - Or click the menu (⋮) → **Extensions** → **Manage Extensions**

2. **Enable Developer Mode**
   - Look for the **"Developer mode"** toggle in the top-right corner
   - Click to turn it **ON** (the toggle should be blue/enabled)

3. **Load the Extension**
   - Click the **"Load unpacked"** button (appears after enabling Developer mode)
   - Browse to and select your SBOX folder (the folder containing `manifest.json`)
   - Click **"Select Folder"** or **"Open"**

4. **Verify Installation**
   - You should see "SBOX - Smart Email Categorizer" in your extensions list
   - The extension should be enabled (toggle is ON)
   - The SBOX icon appears in your Chrome toolbar (top-right)

### Step 4: Configure and Use

1. **Click the SBOX icon** in your Chrome toolbar
2. **Enable the extension** using the toggle switch in the popup
3. **Adjust settings** (optional):
   - Navigate to the **Categories** tab to enable/disable specific categories
   - Go to **Settings** tab to adjust confidence thresholds
   - Default settings work great for most users

4. **Open Gmail**
   - Navigate to https://mail.google.com
   - Log in to your Gmail account
   - Wait 2-3 seconds for the extension to initialize

5. **See It in Action**
   - Colored labels will appear next to your email subjects
   - Click any label to change its category (this helps train the AI)
   - The more you correct, the smarter it gets!

### Troubleshooting

**Extension not loading?**
- Make sure you selected the correct folder (containing `manifest.json`)
- Check that Developer mode is enabled

**Labels not appearing in Gmail?**
- Click the SBOX icon and verify the toggle is ON
- Refresh your Gmail page (F5 or Ctrl+R)
- Open browser console (F12) and check for any SBOX errors

**TensorFlow.js errors?**
- Verify `tensorflow.min.js` exists in the `lib/` folder
- Re-download the file if needed

For detailed troubleshooting, see [INSTALLATION.md](INSTALLATION.md)

## 📖 How It Works

### Machine Learning Pipeline

```mermaid
graph LR
    A[Email Content] --> B[Text Processing]
    B --> C[Feature Extraction] 
    C --> D[Neural Network]
    D --> E[Category Prediction]
    E --> F[Label Display]
    F --> G[User Feedback]
    G --> H[Model Training]
    H --> D
```

### Categories

| Category | Description | Color | Example Keywords |
|----------|-------------|-------|------------------|
| **Business** | Meeting requests, quarterly reports, team communications | 🔵 Dark Blue | meeting, quarterly, team, conference, project |
| **Customer Support** | Help requests, support tickets, assistance inquiries | 💙 Blue | support, help, assistance, issue, problem, ticket |
| **Events & Invitations** | Party invites, celebrations, RSVPs | 🟠 Orange | invitation, event, party, celebration, rsvp |
| **Finance & Bills** | Invoices, billing statements, payment notifications | 🟣 Purple | invoice, bill, payment, finance, account, statement |
| **Job Application** | Career opportunities, employment, interview requests | 🟢 Green | job, application, position, career, employment, interview |
| **Newsletters** | Regular publications, digest emails, subscriptions | ⚫ Dark Gray | newsletter, digest, weekly, monthly, subscription |
| **Personal** | Friends, family, personal correspondence | 🌿 Light Green | personal, friend, family, hello, catch up |
| **Promotions** | Sales offers, discounts, marketing campaigns | 🔴 Red-Orange | sale, discount, offer, promotion, deal, coupon |
| **Reminders** | Deadline notifications, upcoming events | ❤️ Red (pulse) | reminder, don't forget, remember, upcoming, due |
| **Travel & Bookings** | Flight confirmations, hotel reservations, trip planning | 🌊 Teal | travel, booking, flight, hotel, reservation, trip |

### Training Process

1. **Initial Training**: Pre-loaded with 1,000 real email examples from Hugging Face dataset
2. **Active Learning**: Learns from your corrections when you click labels
3. **Continuous Improvement**: Model accuracy improves over time with your feedback
4. **Local Storage**: All training data stays on your device for complete privacy

## ⚙️ Configuration

### Extension Settings

Access settings by clicking the SBOX icon in your Chrome toolbar:

#### **Dashboard Tab**
- View classification statistics
- See category breakdowns
- Monitor recent activity

#### **Categories Tab**  
- Enable/disable specific categories
- Adjust confidence thresholds per category
- Customize category colors (future update)

#### **Training Tab**
- View training statistics
- Manually retrain the model
- Export/import training data (future update)  
- Reset model to defaults

#### **Settings Tab**
- Toggle confidence indicators
- Change label positioning
- Set global confidence threshold
- Privacy and data management

### Advanced Configuration

For developers who want to customize the extension:

```javascript
// Modify category definitions in background/background.js
const categories = {
  marketing: { 
    enabled: true, 
    color: '#ff6b35', 
    confidence: 0.7,
    keywords: ['sale', 'discount', 'promotion']
  },
  // Add custom categories...
}
```

## 🧪 Development

### Project Structure

```
SBOX/
├── manifest.json           # Extension manifest (Manifest V3)
├── background/
│   └── background.js      # Service worker, ML model management
├── content/
│   ├── gmail.js          # Gmail integration
│   ├── emailLabeler.js   # Label creation and management  
│   └── styles.css        # Visual styling for labels
├── ml/
│   └── emailClassifier.js # Neural network implementation
├── popup/
│   ├── popup.html        # Extension popup interface
│   ├── popup.css         # Popup styling
│   └── popup.js          # Popup functionality
├── lib/
│   └── tensorflow.min.js # TensorFlow.js library
├── icons/
│   └── *.png             # Extension icons
└── README.md             # This file
```

### Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **ML Framework**: TensorFlow.js
- **Extension API**: Chrome Extensions Manifest V3
- **Storage**: Chrome Storage API
- **Architecture**: Content Scripts + Background Service Worker

### Building from Source

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/sbox.git
   cd sbox
   ```

2. **Install Dependencies**
   ```bash
   # Download TensorFlow.js
   curl https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js -o lib/tensorflow.min.js
   ```

3. **Load Extension**
   - Open `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked" and select the `sbox` folder

### Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔧 Troubleshooting

### Common Issues

#### Extension Not Working
- ✅ Check that the extension is enabled in `chrome://extensions/`
- ✅ Verify TensorFlow.js library is downloaded to `lib/tensorflow.min.js`
- ✅ Refresh Gmail and ensure you're on `mail.google.com`

#### Labels Not Appearing  
- ✅ Click the SBOX icon and ensure the extension toggle is ON
- ✅ Check if Gmail layout changed (we update for new Gmail versions)
- ✅ Try refreshing the page after enabling the extension

#### Poor Classification Accuracy
- ✅ Train the model by correcting misclassified labels  
- ✅ Ensure you have enough training examples (10+ per category)
- ✅ Consider resetting and retraining if accuracy degrades

#### Performance Issues
- ✅ Close other Chrome tabs to free up memory
- ✅ Check if other extensions conflict with SBOX
- ✅ Restart Chrome browser

### Debug Mode

Enable debug logging in the console:

```javascript
// In browser console on Gmail page
window.sboxDebug = true;
```

### Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/YOUR_USERNAME/sbox/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/sbox/discussions)
- 📖 **Documentation**: [Installation Guide](INSTALLATION.md) | [Testing Guide](TESTING_GUIDE.md)
- 🤝 **Contributing**: [Contribution Guidelines](CONTRIBUTING.md)

## 🔒 Privacy & Security

### Privacy Policy

- **No Data Collection**: SBOX doesn't collect, store, or transmit any personal data
- **Local Processing**: All email analysis happens on your device
- **No External Connections**: The extension works entirely offline
- **Open Source**: Full transparency with public source code

### Security Features

- **Manifest V3**: Uses the latest, most secure extension standard
- **Content Security Policy**: Prevents code injection attacks  
- **Minimal Permissions**: Only requests necessary Gmail access
- **No External Resources**: All code runs locally

### Data Storage

| Data Type | Location | Purpose | Can Be Cleared |
|-----------|----------|---------|----------------|
| Settings | Chrome Sync Storage | User preferences | ✅ Yes |
| Training Data | Chrome Local Storage | Model improvement | ✅ Yes |  
| Statistics | Chrome Local Storage | Usage analytics | ✅ Yes |
| Model Weights | Browser Memory | Classification | ✅ Yes |

## 📊 Performance

### Benchmarks

- **Classification Speed**: ~10ms per email
- **Memory Usage**: ~15MB (including TensorFlow.js)
- **CPU Impact**: Minimal background processing
- **Battery Impact**: Negligible

### Browser Support

- ✅ **Chrome**: 88+ (recommended)
- ✅ **Edge**: 88+ (Chromium-based)
- ❌ **Firefox**: Not supported (uses Manifest V2)
- ❌ **Safari**: Not supported

## 🛣️ Roadmap

### Version 1.1 (Coming Soon)
- [ ] Custom category creation
- [ ] Bulk email operations
- [ ] Training data import/export
- [ ] Improved mobile support

### Version 1.2 (Future)
- [ ] Multi-language support
- [ ] Advanced ML models (BERT, GPT)
- [ ] Integration with other email providers
- [ ] Team sharing of trained models

### Version 2.0 (Long-term)
- [ ] Smart reply suggestions
- [ ] Email prioritization
- [ ] Calendar integration
- [ ] Advanced analytics dashboard

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **TensorFlow.js Team** - For the amazing ML framework
- **Gmail Team** - For providing a great email platform
- **Chrome Extensions Team** - For the powerful extension APIs
- **Open Source Community** - For inspiration and feedback

## 📈 Stats

![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/sbox?style=social)
![GitHub forks](https://img.shields.io/github/forks/YOUR_USERNAME/sbox?style=social)
![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/sbox)
![GitHub pull requests](https://img.shields.io/github/issues-pr/YOUR_USERNAME/sbox)

## 🌟 Acknowledgments

This project uses the [imnim/multiclass-email-classification](https://huggingface.co/datasets/imnim/multiclass-email-classification) dataset from Hugging Face for training the machine learning model.

---

**Made with ❤️ for productivity enthusiasts**

*SBOX - Smart Box for Smart People*