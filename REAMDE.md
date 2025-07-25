# Aegis AI - Smart Patient Monitoring System

## 🏥 Project Overview

**Aegis AI** is an AI-Integrated Smart Patient Monitoring System that enhances patient recovery, safety, and emotional well-being through remote monitoring. Using advanced AI technologies, it predicts health trends and provides guidance, much like a human caregiver would.

This innovative software creates a personalized, evolving digital model of each patient, enabling predictive care, real-time interaction, and continuous companionship—minimizing the need for constant human supervision.

**Not just monitoring — we predict, personalize, and emotionally support recovery with a smart, caring digital companion.**

### 🎯 Problem Statement

Post-surgery patients often perform restricted movements unknowingly, which can delay recovery or cause serious complications. Traditional monitoring systems are reactive rather than proactive, and lack the emotional support component crucial for patient well-being.

### 💡 Solution

Aegis AI addresses these challenges by:
- **Predictive Analysis**: Using computer vision and AI to detect potentially harmful movements before they cause damage
- **Personalized Care**: Creating individual patient profiles that adapt and learn over time
- **Emotional Support**: Providing companionship and encouragement through AI-powered interactions
- **Real-time Monitoring**: Continuous surveillance with intelligent alerts and notifications
- **Remote Care**: Enabling healthcare providers to monitor multiple patients efficiently

## ✨ Key Features

### 🔍 Intelligent Monitoring
- **Real-time Video Analysis**: Continuous monitoring using computer vision and BLIP image captioning
- **Behavior Pattern Recognition**: AI-powered analysis of patient movements and activities
- **Predictive Health Insights**: Early detection of concerning behaviors or health trends
- **Movement Restriction Compliance**: Monitoring for post-surgery movement restrictions

### 🤖 AI-Powered Interactions
- **Smart Chat Interface**: Interactive AI companion powered by Google's Gemini AI
- **Personalized Responses**: Context-aware conversations based on patient history and current state
- **Emotional Support**: Providing encouragement and companionship during recovery
- **Health Guidance**: AI-driven recommendations and reminders

### 📊 Comprehensive Dashboard
- **Behavior Analysis Timeline**: Chronological view of patient activities and behaviors
- **Knowledge Base Visualization**: Categorized observations about patient, actions, objects, and environment
- **Activity Charts**: Visual representation of activity levels and trends over time
- **Patient Profile Management**: Detailed patient information and medical history tracking

### 🚨 Smart Notifications
- **Email Alerts**: Configurable email notifications for healthcare providers
- **Real-time Alerts**: Immediate notifications for concerning behaviors or emergencies
- **Customizable Settings**: Flexible notification preferences and thresholds

## 🛠️ Technology Stack

### Backend
- **Python 3.8+**: Core monitoring and AI processing
- **Node.js & Express.js**: Web server and API endpoints
- **Google Gemini AI**: Advanced language model for patient interactions
- **Transformers (BLIP)**: Image captioning and computer vision
- **OpenCV**: Real-time video processing and analysis

### Frontend
- **HTML5 & JavaScript**: Interactive web interface
- **Tailwind CSS**: Modern, responsive styling
- **Chart.js**: Data visualization and analytics

### AI & Machine Learning
- **BLIP (Salesforce)**: Image-to-text captioning model
- **Google Generative AI**: Conversational AI and behavior analysis
- **PyTorch**: Deep learning framework for model inference
- **Computer Vision**: Real-time image processing and analysis

### Communication
- **Nodemailer**: Email notification system
- **Twilio**: SMS and communication services (optional)

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **Python** 3.8 or higher
- **NPM** (v6 or higher)
- **Webcam** or camera device
- **Google Gemini API Key**
- **Sufficient storage** for image snapshots and model caching

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Aegis AI"
```

### 2. Install Python Dependencies

```bash
pip install opencv-python torch transformers pillow google-generativeai requests
```

### 3. Install Node.js Dependencies

```bash
npm install
```

### 4. Configure API Keys

Edit the configuration in `index.py`:

```python
GEMINI_API_KEY = "your-gemini-api-key-here"
HF_API_TOKEN = "your-huggingface-token-here"  # Optional
```

### 5. Set Up Directory Structure

The following directories will be created automatically:
- `snapshots/` - Stores captured images
- `models/` - Caches AI models locally
- `public/` - Web interface files

### 6. Configure Patient Information

Edit `patient_info.json` with actual patient details:

```json
{
    "personal": {
        "name": "Patient Name",
        "age": "XX",
        "gender": "Male/Female",
        "height": "XXX cm",
        "weight": "XX kg"
    },
    "medical": {
        "diagnosis": "Primary diagnosis",
        "symptoms": ["symptom1", "symptom2"],
        "medications": ["medication1", "medication2"],
        "allergies": ["allergy1", "allergy2"],
        "medical_history": "Relevant medical history"
    },
    "monitoring": {
        "start_date": "YYYY-MM-DD",
        "reason": "Monitoring reason",
        "concerns": ["concern1", "concern2"]
    }
}
```

## 🎮 Usage

### Starting the System

1. **Start the AI Monitoring System**:
   ```bash
   python index.py
   ```
   This will:
   - Initialize the camera and AI models
   - Begin capturing and analyzing images
   - Start behavior analysis and pattern recognition

2. **Start the Web Dashboard** (in a separate terminal):
   ```bash
   npm start
   ```
   For development with auto-restart:
   ```bash
   npm run dev
   ```

3. **Access the Dashboard**:
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Using the Dashboard

- **Monitor Patient Activity**: View real-time behavior analysis and activity timeline
- **Chat with AI**: Use the chat interface to ask questions about the patient's condition
- **Review Analytics**: Examine activity charts and behavior patterns
- **Manage Notifications**: Configure email alerts and notification settings
- **Patient Profile**: View and update patient information and medical history

## 📁 Project Structure

```
Aegis AI/
├── index.py                    # Main Python monitoring script
├── server.js                   # Express.js web server
├── package.json               # Node.js dependencies
├── patient_info.json          # Patient profile data
├── notification_settings.json # Alert configuration
├── public/
│   ├── index.html             # Main dashboard interface
│   └── app.js                 # Frontend JavaScript
├── snapshots/                 # Captured images storage
├── models/                    # AI model cache
├── behavior_analysis.json     # Behavior analysis data
├── captions.json             # Image captions data
├── data.json                 # Knowledge base data
└── vital_signs.json          # Vital signs data
```

## ⚙️ Configuration

### Monitoring Settings

Adjust monitoring intervals in `index.py`:

```python
CAPTURE_INTERVAL = 15    # Image capture frequency (seconds)
ANALYSIS_INTERVAL = 15   # Behavior analysis frequency (seconds)
```

### Notification Settings

Configure email alerts in the dashboard or edit `notification_settings.json`:

```json
{
  "emails": ["doctor@hospital.com", "nurse@hospital.com"],
  "enableEmailAlerts": true
}
```

### Dashboard Refresh Rate

Modify data refresh interval in `public/app.js`:

```javascript
setInterval(loadData, 60000); // Refresh every 60 seconds
```

## 🔧 Troubleshooting

### Common Issues

- **Camera Access Denied**: Ensure webcam permissions are granted
- **Model Loading Errors**: Check internet connection for initial model download
- **API Key Issues**: Verify Gemini API key is valid and has sufficient quota
- **Port Conflicts**: Change the port in `server.js` if 3000 is already in use
- **Data Not Loading**: Ensure Python script is running and generating JSON files

### Performance Optimization

- **GPU Acceleration**: Install CUDA-compatible PyTorch for faster processing
- **Model Caching**: Models are cached locally after first download
- **Image Quality**: Adjust capture resolution for better performance vs. quality balance

### Logs and Debugging

- **Python Logs**: Check console output from `python index.py`
- **Server Logs**: Monitor Express.js server console
- **Browser Console**: Check for frontend JavaScript errors
- **File Permissions**: Ensure write permissions for JSON data files

## 🤝 Contributing

We welcome contributions to improve Aegis AI! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, questions, or feature requests:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting section above

## 🔮 Future Enhancements

- **Mobile App**: Companion mobile application for caregivers
- **Advanced Analytics**: Machine learning-based health predictions
- **Integration**: Hospital management system integration
- **Multi-Patient**: Support for monitoring multiple patients simultaneously
- **Voice Interaction**: Voice-based patient interaction capabilities
- **Wearable Integration**: Support for smartwatch and fitness tracker data

---

**Aegis AI - Transforming Patient Care Through Intelligent Monitoring** 🏥✨
