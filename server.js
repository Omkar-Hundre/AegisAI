const express = require('express');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON requests
app.use(express.json());

// Load notification settings from file or create default
let notificationSettings = {
  emails: [],
  enableEmailAlerts: false
};

try {
  const settingsData = fs.readFileSync(path.join(__dirname, 'notification_settings.json'), 'utf8');
  notificationSettings = JSON.parse(settingsData);
} catch (err) {
  console.log('No notification settings file found, using defaults');
  // Create default settings file
  fs.writeFileSync(
    path.join(__dirname, 'notification_settings.json'), 
    JSON.stringify(notificationSettings, null, 2)
  );
}

// Initialize email transporter
let emailTransporter;

// Create a test account on Ethereal for development
async function setupEmailTransporter() {
  try {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    
    // Create a transporter using the test account
    emailTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    
    console.log('Ethereal Email account created for testing:');
    console.log(`- Username: ${testAccount.user}`);
    console.log(`- Password: ${testAccount.pass}`);
    console.log('- View sent emails at: https://ethereal.email');
  } catch (error) {
    console.error('Failed to create Ethereal test account:', error);
    
    // Fallback to a simple transport that just logs emails
    emailTransporter = {
      sendMail: (mailOptions) => {
        console.log('==================');
        console.log('EMAIL NOTIFICATION');
        console.log('==================');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Body:', mailOptions.text);
        console.log('==================');
        return Promise.resolve({ messageId: 'dev-mode-id' });
      }
    };
  }
}

// Call the setup function immediately
setupEmailTransporter();

// Endpoint to save notification settings
app.post('/save-notification-settings', (req, res) => {
  try {
    const { emails, enableEmailAlerts } = req.body;
    
    notificationSettings = {
      emails: emails || [],
      enableEmailAlerts: enableEmailAlerts || false
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'notification_settings.json'), 
      JSON.stringify(notificationSettings, null, 2)
    );
    
    res.json({ success: true, message: 'Notification settings saved successfully' });
  } catch (error) {
    console.error('Error saving notification settings:', error);
    res.status(500).json({ success: false, error: 'Failed to save notification settings' });
  }
});

// Endpoint to get notification settings
app.get('/notification-settings', (req, res) => {
  res.json(notificationSettings);
});

// Endpoint to send notifications
app.post('/send-alert-notification', async (req, res) => {
  try {
    const { alertMessage, vitalData, severity } = req.body;
    
    // Get full patient info
    let patientInfo = null;
    let patientName = "Unknown";
    let patientOverview = "No patient information available";
    let medicalState = "No medical information available";
    
    try {
      const patientData = fs.readFileSync(path.join(__dirname, 'patient_info.json'), 'utf8');
      patientInfo = JSON.parse(patientData);
      patientName = patientInfo.personal.name || "Unknown";
      
      // Create patient overview
      patientOverview = `
Patient: ${patientInfo.personal.name}
Age: ${patientInfo.personal.age}
Gender: ${patientInfo.personal.gender}
Height: ${patientInfo.personal.height} cm
Weight: ${patientInfo.personal.weight} kg`;
      
      // Create medical state summary
      medicalState = `
Diagnosis: ${patientInfo.medical.diagnosis}
Symptoms: ${patientInfo.medical.symptoms.join(', ') || 'None reported'}
Medications: ${patientInfo.medical.medications.join(', ') || 'None reported'}
Allergies: ${patientInfo.medical.allergies.join(', ') || 'None reported'}
Medical History: ${patientInfo.medical.medical_history || 'None provided'}
Monitoring Reason: ${patientInfo.monitoring.reason}
Monitoring Since: ${patientInfo.monitoring.start_date}
Specific Concerns: ${patientInfo.monitoring.concerns.join(', ') || 'None specified'}`;
      
    } catch (err) {
      console.log('No patient info file found or invalid format');
    }
    
    // Format the alert message with more details
    const formattedEmailMessage = `
ALERT: ${severity.toUpperCase()} SEVERITY
Time: ${new Date().toLocaleString()}
Issue: ${alertMessage}

VITAL SIGNS:
- Heart Rate: ${Math.round(vitalData.heartRate)} BPM
- Blood Pressure: ${Math.round(vitalData.bloodPressure.systolic)}/${Math.round(vitalData.bloodPressure.diastolic)} mmHg
- ECG Status: ${vitalData.ecg.status}

PATIENT OVERVIEW:
${patientOverview}

MEDICAL STATE:
${medicalState}

Please check the monitoring dashboard for more details.
`;
    
    let emailsSent = 0;
    let emailResults = [];
    
    // Send email notifications if enabled
    if (notificationSettings.enableEmailAlerts && notificationSettings.emails.length > 0) {
      for (const email of notificationSettings.emails) {
        try {
          const info = await emailTransporter.sendMail({
            from: '"Patient Monitoring System" <alerts@monitoring-system.com>',
            to: email,
            subject: `Patient Alert: ${severity.toUpperCase()} - ${alertMessage}`,
            text: formattedEmailMessage
          });
          
          emailsSent++;
          
          // For Ethereal emails, provide the preview URL
          if (info.messageId && info.preview) {
            console.log(`Email sent to ${email}`);
            console.log(`Preview URL: ${info.preview}`);
            emailResults.push({
              to: email,
              status: 'sent',
              previewUrl: info.preview
            });
          } else {
            console.log(`Email sent to ${email}`);
            emailResults.push({
              to: email,
              status: 'sent'
            });
          }
        } catch (emailError) {
          console.error(`Failed to send email to ${email}:`, emailError);
          emailResults.push({
            to: email,
            status: 'failed',
            error: emailError.message
          });
        }
      }
    }
    
    res.json({ 
      success: true, 
      emailsSent,
      emailResults,
      message: `Notifications sent: ${emailsSent} emails`
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to send notifications' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve JSON files from root directory
app.get('/behavior_analysis.json', (req, res) => {
    fs.readFile(path.join(__dirname, 'behavior_analysis.json'), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read behavior analysis data' });
        }
        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData);
        } catch (error) {
            res.status(500).json({ error: 'Invalid JSON data' });
        }
    });
});

app.get('/data.json', (req, res) => {
    fs.readFile(path.join(__dirname, 'data.json'), 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read knowledge base data' });
        }
        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData);
        } catch (error) {
            res.status(500).json({ error: 'Invalid JSON data' });
        }
    });
});

app.get('/patient_info.json', (req, res) => {
    fs.readFile(path.join(__dirname, 'patient_info.json'), 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'Patient information not found' });
        }
        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData);
        } catch (error) {
            res.status(500).json({ error: 'Invalid JSON data' });
        }
    });
});

// Initialize Google Generative AI with your API key
const GEMINI_API_KEY = "GEMINI_API_KEY"; // This should be your Gemini API key
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Endpoint to serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint for Gemini chat
app.post('/gemini-chat', async (req, res) => {
    try {
        const { message, context, history, role } = req.body;
        
        // Get full patient info from file
        let patientInfo = null;
        try {
            const patientData = fs.readFileSync(path.join(__dirname, 'patient_info.json'), 'utf8');
            patientInfo = JSON.parse(patientData);
        } catch (err) {
            console.log('No patient info file found or invalid format');
        }
        
        // Format the context for Gemini
        const contextStr = formatContextForGemini(context, patientInfo);
        
        // Convert chat history to Gemini format
        const formattedHistory = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }],
        }));
        
        // Create a chat session
        let chatSession;
        
        if (formattedHistory.length > 0) {
            // Start chat with history
            chatSession = model.startChat({
                history: formattedHistory,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                },
            });
        } else {
            // Start fresh chat
            chatSession = model.startChat({
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                },
            });
        }
        
        // Customize prompt based on role
        let prompt;
        
        if (role === "medical_advisor") {
            // Medical advisor prompt with specific instructions for vital signs alerts
            prompt = `
You are an AI medical advisor for a patient monitoring system. You have access to the following vital signs data:

${JSON.stringify(context.vitalSigns, null, 2)}

Patient information:
${patientInfo ? JSON.stringify(patientInfo, null, 2) : "No patient information available"}

IMPORTANT: You MUST act as a qualified medical professional. Provide specific, actionable medical advice based on the abnormal vital signs detected. Include:
1. What these readings indicate
2. Immediate actions the caregiver should take
3. When emergency medical attention is necessary
4. Possible causes of these readings

Based on this data, please respond to the following request:
${message}`;
        } else {
            // Standard behavior analysis prompt
            prompt = `
You are an AI assistant for a behavior analysis system. You have access to the following data about a person being monitored:

${contextStr}

Based on this data, please respond to the following question or request:
${message}`;
        }

        // Get response from Gemini
        const result = await chatSession.sendMessage(prompt);
        const response = result.response.text();
        
        res.json({ response });
    } catch (error) {
        console.error('Error with Gemini API:', error);
        res.status(500).json({ error: 'Failed to communicate with Gemini API', details: error.message });
    }
});

// Format context for Gemini with full patient info
function formatContextForGemini(context, fullPatientInfo) {
    const { latestBehaviors, knowledgeBase } = context;
    
    // Format patient info section
    let patientInfoSection = '';
    if (fullPatientInfo) {
        patientInfoSection = `PATIENT INFORMATION:
Full Name: ${fullPatientInfo.personal.name}
Age: ${fullPatientInfo.personal.age}
Gender: ${fullPatientInfo.personal.gender}
Height: ${fullPatientInfo.personal.height} cm
Weight: ${fullPatientInfo.personal.weight} kg

Medical Details:
- Diagnosis: ${fullPatientInfo.medical.diagnosis}
- Symptoms: ${fullPatientInfo.medical.symptoms.join(', ') || 'None reported'}
- Medications: ${fullPatientInfo.medical.medications.join(', ') || 'None reported'}
- Allergies: ${fullPatientInfo.medical.allergies.join(', ') || 'None reported'}
- Medical History: ${fullPatientInfo.medical.medical_history || 'None provided'}

Monitoring Information:
- Start Date: ${fullPatientInfo.monitoring.start_date}
- Reason for Monitoring: ${fullPatientInfo.monitoring.reason}
- Specific Concerns: ${fullPatientInfo.monitoring.concerns.join(', ') || 'None specified'}`;
    }
    
    return `
${patientInfoSection ? patientInfoSection + '\n\n' : ''}

LATEST BEHAVIOR ANALYSIS:
${latestBehaviors}

KNOWLEDGE BASE OBSERVATIONS:
${knowledgeBase}

As an AI assistant for this behavior monitoring system, your role is to provide insights, answer questions about the observed behaviors, and help the user understand patterns in the data. Be concise but thorough. If there's insufficient data to answer a question confidently, acknowledge that limitation.

When analyzing the patient's behavior, consider their medical condition (${fullPatientInfo ? fullPatientInfo.medical.diagnosis : 'unknown'}) and provide relevant insights that could be helpful for their care.`;
}

// Endpoint to save patient information
app.post('/save-patient-info', (req, res) => {
    const patientInfo = req.body;
    
    // Validate the data
    if (!patientInfo || !patientInfo.personal || !patientInfo.medical || !patientInfo.monitoring) {
        return res.status(400).json({ error: 'Invalid patient information format' });
    }
    
    // Additional validation
    if (!patientInfo.personal.name || !patientInfo.personal.age) {
        return res.status(400).json({ error: 'Name and age are required' });
    }
    
    if (!patientInfo.medical.diagnosis) {
        return res.status(400).json({ error: 'Diagnosis is required' });
    }
    
    if (!patientInfo.monitoring.reason) {
        return res.status(400).json({ error: 'Reason for monitoring is required' });
    }
    
    // Ensure arrays are properly initialized
    patientInfo.medical.symptoms = Array.isArray(patientInfo.medical.symptoms) ? patientInfo.medical.symptoms : [];
    patientInfo.medical.medications = Array.isArray(patientInfo.medical.medications) ? patientInfo.medical.medications : [];
    patientInfo.medical.allergies = Array.isArray(patientInfo.medical.allergies) ? patientInfo.medical.allergies : [];
    patientInfo.monitoring.concerns = Array.isArray(patientInfo.monitoring.concerns) ? patientInfo.monitoring.concerns : [];
    
    // Save to file
    fs.writeFile(path.join(__dirname, 'patient_info.json'), JSON.stringify(patientInfo, null, 4), (err) => {
        if (err) {
            console.error('Error saving patient info:', err);
            return res.status(500).json({ error: 'Failed to save patient information: ' + err.message });
        }
        
        res.json({ success: true, message: 'Patient information saved successfully' });
    });
});

// Endpoint to store vital signs data
app.post('/store-vitals', (req, res) => {
    const vitalData = req.body;
    
    // Validate the data
    if (!vitalData || !vitalData.timestamp || !vitalData.heartRate) {
        return res.status(400).json({ error: 'Invalid vital signs data format' });
    }
    
    // Read existing data
    fs.readFile(path.join(__dirname, 'vital_signs.json'), 'utf8', (err, data) => {
        let vitalSigns = [];
        
        if (!err) {
            try {
                vitalSigns = JSON.parse(data);
                if (!Array.isArray(vitalSigns)) {
                    vitalSigns = [];
                }
            } catch (e) {
                console.error('Error parsing vital signs data:', e);
                vitalSigns = [];
            }
        }
        
        // Add new data
        vitalSigns.push(vitalData);
        
        // Limit to last 1000 readings
        if (vitalSigns.length > 1000) {
            vitalSigns = vitalSigns.slice(-1000);
        }
        
        // Save to file
        fs.writeFile(path.join(__dirname, 'vital_signs.json'), JSON.stringify(vitalSigns, null, 2), (writeErr) => {
            if (writeErr) {
                console.error('Error saving vital signs data:', writeErr);
                return res.status(500).json({ error: 'Failed to save vital signs data' });
            }
            
            res.json({ success: true });
        });
    });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
