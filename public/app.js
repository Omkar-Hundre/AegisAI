// Global variables
let knowledgeBase = {};
let behaviorsData = [];
let chatHistory = [];
let patientInfo = null;

// Global variables for vital signs
let heartRateData = Array(20).fill(75);
let systolicData = Array(20).fill(110);
let diastolicData = Array(20).fill(70);
let ecgData = Array(50).fill(0);
let fullEcgData = Array(200).fill(0);
let vitalSignsCharts = {};
let lastTimestamp = Date.now();

// Voice communication variables
let isListening = false;
let speechRecognition = null;
let speechSynthesis = window.speechSynthesis;
let isSpeaking = false;

// DOM elements
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const refreshBtn = document.getElementById('refresh-btn');
const analysisTimeline = document.getElementById('analysis-timeline');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const patientInfoBanner = document.getElementById('patient-info-banner');
const patientDetailsBtn = document.getElementById('patient-details-btn');
const patientModal = document.getElementById('patient-modal');
const closePatientModalBtn = document.getElementById('close-patient-modal');
const addPatientBtn = document.getElementById('add-patient-btn');
const patientInputModal = document.getElementById('patient-input-modal');
const closePatientInputModalBtn = document.getElementById('close-patient-input-modal');
const patientForm = document.getElementById('patient-form');
const cancelPatientFormBtn = document.getElementById('cancel-patient-form');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    loadPatientInfo();
    
    // Initialize vital signs monitoring
    initVitalSigns();
    
    // Add refresh button handler
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadData);
    }

    // Chat input handlers
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    // Patient modal handlers
    if (patientDetailsBtn) {
        patientDetailsBtn.addEventListener('click', () => {
            patientModal.classList.remove('hidden');
        });
    }
    
    if (closePatientModalBtn) {
        closePatientModalBtn.addEventListener('click', () => {
            patientModal.classList.add('hidden');
        });
    }
    
    // Patient input modal handlers
    if (addPatientBtn) {
        addPatientBtn.addEventListener('click', () => {
            fillPatientForm();
            patientInputModal.classList.remove('hidden');
        });
    }
    
    if (closePatientInputModalBtn) {
        closePatientInputModalBtn.addEventListener('click', () => {
            patientInputModal.classList.add('hidden');
        });
    }
    
    if (cancelPatientFormBtn) {
        cancelPatientFormBtn.addEventListener('click', () => {
            patientInputModal.classList.add('hidden');
        });
    }
    
    if (patientForm) {
        patientForm.addEventListener('submit', handlePatientFormSubmit);
    }
    
    // Load chat history from localStorage
    loadChatHistory();
    
    // Initialize simulation panel
    initSimulationPanel();
    
    // Initialize notification settings
    initNotificationSettings();
});

// Load data from server
async function loadData() {
    try {
        // Update status to loading
        statusText.textContent = 'Loading Data...';
        
        // Load behavior analysis data
        const behaviorsResponse = await fetch('/behavior_analysis.json');
        if (behaviorsResponse.ok) {
            behaviorsData = await behaviorsResponse.json();
            updateBehaviorTimeline();
        }
        
        // Load knowledge base data
        const knowledgeResponse = await fetch('/data.json');
        if (knowledgeResponse.ok) {
            knowledgeBase = await knowledgeResponse.json();
            updateKnowledgeBase();
        }
        
        // Update status
        statusText.textContent = 'System Active';
        
        // Set refresh interval
        if (!window.dataRefreshInterval) {
            window.dataRefreshInterval = setInterval(loadData, 30000); // Refresh every 30 seconds
        }
    } catch (error) {
        console.error('Error loading data:', error);
        statusText.textContent = 'Data Load Error';
    }
}

// Load patient information
async function loadPatientInfo() {
    try {
        console.log('Loading patient information...');
        const response = await fetch('/patient_info.json');
        
        if (!response.ok) {
            console.log('Patient info not found or not accessible:', response.status, response.statusText);
            throw new Error('Patient info not found');
        }
        
        patientInfo = await response.json();
        console.log('Patient info loaded successfully:', patientInfo);
        updatePatientInfoUI();
    } catch (error) {
        console.error('Error loading patient info:', error);
    }
}

// Update UI with patient information
function updatePatientInfoUI() {
    console.log('Updating patient info UI with:', patientInfo);
    
    if (!patientInfo) {
        console.log('No patient info available, skipping UI update');
        return;
    }
    
    try {
        // Update banner
        document.getElementById('patient-name').textContent = patientInfo.personal.name;
        document.getElementById('patient-age').textContent = patientInfo.personal.age;
        document.getElementById('patient-diagnosis').textContent = patientInfo.medical.diagnosis;
        patientInfoBanner.classList.remove('hidden');
        
        // Update modal
        document.getElementById('modal-patient-name').textContent = patientInfo.personal.name;
        document.getElementById('modal-patient-age').textContent = patientInfo.personal.age;
        document.getElementById('modal-patient-gender').textContent = patientInfo.personal.gender;
        document.getElementById('modal-patient-height').textContent = patientInfo.personal.height;
        document.getElementById('modal-patient-weight').textContent = patientInfo.personal.weight;
        document.getElementById('modal-patient-diagnosis').textContent = patientInfo.medical.diagnosis;
        document.getElementById('modal-monitoring-date').textContent = patientInfo.monitoring.start_date;
        document.getElementById('modal-monitoring-reason').textContent = patientInfo.monitoring.reason;
        
        // Update lists
        updateList('modal-patient-symptoms', patientInfo.medical.symptoms);
        updateList('modal-patient-medications', patientInfo.medical.medications);
        updateList('modal-patient-allergies', patientInfo.medical.allergies);
        updateList('modal-patient-concerns', patientInfo.monitoring.concerns);
        
        // Update medical history
        document.getElementById('modal-patient-history').textContent = patientInfo.medical.medical_history;
        
        console.log('Patient info UI updated successfully');
    } catch (error) {
        console.error('Error updating patient info UI:', error);
    }
}

// Helper function to update lists
function updateList(elementId, items) {
    const element = document.getElementById(elementId);
    element.innerHTML = '';
    
    if (items && items.length > 0) {
        items.forEach(item => {
            if (item && item.trim()) {
                const li = document.createElement('li');
                li.textContent = item.trim();
                element.appendChild(li);
            }
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'None';
        li.classList.add('text-gray-500');
        element.appendChild(li);
    }
}

// Update status indicator
function setStatus(state, message) {
    statusText.textContent = message;
    
    // Remove all state classes
    statusIndicator.querySelector('span').classList.remove(
        'bg-green-400', 'bg-yellow-400', 'bg-red-400', 'animate-pulse'
    );
    
    // Apply appropriate state class
    switch (state) {
        case 'success':
        case 'active':
            statusIndicator.querySelector('span').classList.add('bg-green-400');
            break;
        case 'loading':
            statusIndicator.querySelector('span').classList.add('bg-yellow-400', 'animate-pulse');
            break;
        case 'error':
            statusIndicator.querySelector('span').classList.add('bg-red-400');
            break;
    }
}

// Update behavior timeline
function updateBehaviorTimeline() {
    analysisTimeline.innerHTML = '';
    
    if (behaviorsData.length === 0) {
        analysisTimeline.innerHTML = '<p class="text-gray-500 italic">No behavior data available yet.</p>';
        return;
    }
    
    // Sort by timestamp (newest first)
    const sortedData = [...behaviorsData].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Take only the most recent 10 entries
    const recentData = sortedData.slice(0, 10);
    
    recentData.forEach(entry => {
        const timeFormatted = moment(entry.timestamp).format('h:mm A');
        const dateFormatted = moment(entry.timestamp).format('MMM D');
        
        const behavior = entry.behavior;
        
        const entryElement = document.createElement('div');
        entryElement.className = 'mb-4 bg-white rounded-lg shadow-sm p-3 border-l-4 border-blue-500';
        
        entryElement.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-semibold text-blue-600">${timeFormatted}</span>
                <span class="text-xs text-gray-500">${dateFormatted}</span>
            </div>
            <div class="space-y-1 text-sm">
                <p><span class="font-medium">Action:</span> ${behavior.action}</p>
                <p><span class="font-medium">Posture:</span> ${behavior.posture}</p>
                <p><span class="font-medium">Emotion:</span> ${behavior.emotion}</p>
                <p><span class="font-medium">Activity:</span> ${behavior.activity}</p>
                ${behavior.medical_relevance ? `<p class="text-red-600"><span class="font-medium">Medical Relevance:</span> ${behavior.medical_relevance}</p>` : ''}
            </div>
        `;
        
        analysisTimeline.appendChild(entryElement);
    });
}

// Update knowledge base visualization
function updateKnowledgeBase() {
    // Clear existing lists
    document.getElementById('appearance-list').innerHTML = '';
    document.getElementById('behaviors-list').innerHTML = '';
    document.getElementById('emotions-list').innerHTML = '';
    document.getElementById('environment-list').innerHTML = '';
    
    // Check if knowledge base has the expected structure
    if (!knowledgeBase || typeof knowledgeBase !== 'object') {
        console.error('Invalid knowledge base structure:', knowledgeBase);
        return;
    }
    
    // Update appearance list
    if (knowledgeBase.appearance && Array.isArray(knowledgeBase.appearance)) {
        const appearanceList = document.getElementById('appearance-list');
        knowledgeBase.appearance.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            appearanceList.appendChild(li);
        });
    }
    
    // Update behaviors list
    if (knowledgeBase.behaviors && Array.isArray(knowledgeBase.behaviors)) {
        const behaviorsList = document.getElementById('behaviors-list');
        knowledgeBase.behaviors.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            behaviorsList.appendChild(li);
        });
    }
    
    // Update environment list
    if (knowledgeBase.environment && Array.isArray(knowledgeBase.environment)) {
        const environmentList = document.getElementById('environment-list');
        knowledgeBase.environment.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            environmentList.appendChild(li);
        });
    }
    
    // Update medical indicators list (if it exists)
    if (knowledgeBase.medical_indicators && Array.isArray(knowledgeBase.medical_indicators)) {
        // Create the list if it doesn't exist
        let medicalList = document.getElementById('medical-indicators-list');
        if (!medicalList) {
            const medicalSection = document.createElement('div');
            medicalSection.className = 'bg-red-50 p-3 rounded-lg mt-4';
            medicalSection.innerHTML = `
                <h4 class="font-medium text-red-800 mb-1">Medical Indicators</h4>
                <ul id="medical-indicators-list" class="list-disc pl-5 text-sm"></ul>
            `;
            document.getElementById('environment-list').parentNode.appendChild(medicalSection);
            medicalList = document.getElementById('medical-indicators-list');
        }
        
        knowledgeBase.medical_indicators.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            medicalList.appendChild(li);
        });
    }
}

// Create activity timeline chart using behavior analysis data
function updateActivityChart() {
    const ctx = document.getElementById('activity-chart').getContext('2d');
    
    // Destroy previous chart instance if it exists
    if (window.activityChart) {
        window.activityChart.destroy();
    }
    
    // Prepare data for chart
    const timestamps = behaviorsData.map(entry => formatTimestamp(entry.timestamp));
    
    // Count words in each analysis as a simple activity measure
    const activityLevels = behaviorsData.map(entry => {
        const words = entry.analysis.split(' ').length;
        return Math.min(words, 100); // Cap at 100 for visualization purposes
    });
    
    // Create new chart
    window.activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                label: 'Activity Level',
                data: activityLevels,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: 'rgba(59, 130, 246, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Activity Complexity'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            }
        }
    });
}

// Format timestamp for display
function formatTimestamp(timestamp) {
    return moment(timestamp).format('MM/DD HH:mm');
}

// Send message to Gemini API
async function sendMessage() {
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Add user message to UI
    addMessageToChat('user', message);
    
    // Clear input
    chatInput.value = '';
    
    try {
        // Show AI is thinking
        const thinkingId = addThinkingMessage();
        
        // Prepare context from knowledge base and behavior data
        const context = prepareGeminiContext();
        
        // Call Gemini API with server endpoint
        const response = await fetch('/gemini-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                context: context,
                history: chatHistory
            })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        
        // Remove thinking message
        removeThinkingMessage(thinkingId);
        
        // Add AI response to UI
        addMessageToChat('ai', data.response);
        
        // Save to chat history
        saveChatMessage('user', message);
        saveChatMessage('ai', data.response);
        
    } catch (error) {
        console.error('Error sending message:', error);
        const thinkingElement = document.getElementById(thinkingId);
        if (thinkingElement) {
            thinkingElement.remove();
        }
        addMessageToChat('ai', 'Sorry, I encountered an error while processing your request. Please try again.');
    }
}

// Simplified message formatting
function formatMessage(text) {
    if (!text) return '';
    
    // Basic formatting only
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
        .replace(/\n/g, '<br>')                            // Line breaks
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')       // Escape HTML
        .replace(/&lt;strong&gt;/g, '<strong>')            // Allow strong tags
        .replace(/&lt;\/strong&gt;/g, '</strong>')
        .replace(/&lt;em&gt;/g, '<em>')                    // Allow em tags
        .replace(/&lt;\/em&gt;/g, '</em>')
        .replace(/&lt;br&gt;/g, '<br>');                   // Allow br tags
}

// Add message to chat UI
function addMessageToChat(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.className = sender === 'user' ? 'flex justify-end mb-4' : 'flex justify-start mb-4';
    
    const bubbleClass = sender === 'user' 
        ? 'bg-blue-600 text-white rounded-lg py-2 px-4 max-w-[80%]' 
        : 'bg-gray-200 rounded-lg py-2 px-4 max-w-[80%]';
    
    // Format the message if it's from AI
    const formattedMessage = sender === 'ai' ? formatMessage(message) : message;
    
    messageElement.innerHTML = `
        <div class="${bubbleClass}">
            <div class="text-sm message-content">${formattedMessage}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // If this is an AI response and voice is active, speak it
    if (sender === 'ai' && isListening) {
        // Use a timeout to ensure the speech starts after the UI updates
        setTimeout(() => speakResponse(message), 100);
    }
}

// Add thinking message and return its ID
function addThinkingMessage() {
    const id = 'thinking-' + Date.now();
    const messageElement = document.createElement('div');
    messageElement.className = 'flex justify-start mb-4';
    messageElement.id = id;
    
    messageElement.innerHTML = `
        <div class="bg-gray-200 rounded-lg py-2 px-4 max-w-[80%]">
            <p class="text-sm flex items-center">
                <span class="mr-2">Thinking</span>
                <span class="flex space-x-1">
                    <span class="h-2 w-2 bg-gray-600 rounded-full animate-pulse" style="animation-delay: 0s"></span>
                    <span class="h-2 w-2 bg-gray-600 rounded-full animate-pulse" style="animation-delay: 0.2s"></span>
                    <span class="h-2 w-2 bg-gray-600 rounded-full animate-pulse" style="animation-delay: 0.4s"></span>
                </span>
            </p>
        </div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return id;
}

// Remove thinking message
function removeThinkingMessage(id) {
    const thinkingElement = document.getElementById(id);
    if (thinkingElement) {
        thinkingElement.remove();
    }
}

// Prepare context for Gemini API from knowledge base and behavior data
function prepareGeminiContext() {
    // Extract the latest behavior analysis (just the most recent one)
    const latestBehavior = behaviorsData.length > 0 ? 
        behaviorsData[behaviorsData.length - 1] : null;
    
    const latestBehaviorText = latestBehavior ? 
        `[${latestBehavior.timestamp}] Action: ${latestBehavior.behavior.action}, Emotion: ${latestBehavior.behavior.emotion}` : 
        "No behavior data available";
    
    // Simplified knowledge base context
    const knowledgeBaseContext = "Knowledge base contains information about appearance, behaviors, and environment.";
    
    return {
        latestBehaviors: latestBehaviorText,
        knowledgeBase: knowledgeBaseContext,
        requestBriefResponse: true // Flag to request brief responses
    };
}

// Save chat message to history
function saveChatMessage(sender, message) {
    chatHistory.push({
        role: sender === 'user' ? 'user' : 'assistant',
        content: message,
        timestamp: new Date().toISOString()
    });
    
    // Save to localStorage
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

// Load chat history from localStorage
function loadChatHistory() {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
        try {
            chatHistory = JSON.parse(savedHistory);
            
            // Display chat history
            chatHistory.forEach(msg => {
                addMessageToChat(msg.role === 'user' ? 'user' : 'ai', msg.content);
            });
        } catch (e) {
            console.error('Error loading chat history:', e);
            chatHistory = [];
        }
    } else {
        // Add initial greeting
        addMessageToChat('ai', "Hello! I'm your AI assistant. I can help you understand the behavior data being collected. What would you like to know?");
    }
}

// Fill patient form with existing data if available
function fillPatientForm() {
    if (!patientForm) return;
    
    if (patientInfo) {
        // Personal information
        document.getElementById('patient-name-input').value = patientInfo.personal.name || '';
        document.getElementById('patient-age-input').value = patientInfo.personal.age || '';
        document.getElementById('patient-gender-input').value = patientInfo.personal.gender || '';
        document.getElementById('patient-height-input').value = patientInfo.personal.height || '';
        document.getElementById('patient-weight-input').value = patientInfo.personal.weight || '';
        
        // Medical information
        document.getElementById('patient-diagnosis-input').value = patientInfo.medical.diagnosis || '';
        document.getElementById('patient-symptoms-input').value = patientInfo.medical.symptoms ? patientInfo.medical.symptoms.join(', ') : '';
        document.getElementById('patient-medications-input').value = patientInfo.medical.medications ? patientInfo.medical.medications.join(', ') : '';
        document.getElementById('patient-allergies-input').value = patientInfo.medical.allergies ? patientInfo.medical.allergies.join(', ') : '';
        document.getElementById('patient-history-input').value = patientInfo.medical.medical_history || '';
        
        // Monitoring information
        document.getElementById('monitoring-reason-input').value = patientInfo.monitoring.reason || '';
        document.getElementById('monitoring-concerns-input').value = patientInfo.monitoring.concerns ? patientInfo.monitoring.concerns.join(', ') : '';
    } else {
        // Clear the form if no patient info exists
        patientForm.reset();
        
        // Set today's date as the default start date
        const today = new Date().toISOString().split('T')[0];
        // If there's a hidden start date field, set it
        const startDateInput = document.getElementById('monitoring-start-date-input');
        if (startDateInput) {
            startDateInput.value = today;
        }
    }
}

// Handle patient form submission
async function handlePatientFormSubmit(e) {
    e.preventDefault();
    console.log('Form submission started');
    
    // Create patient info object from form data
    const newPatientInfo = {
        personal: {
            name: document.getElementById('patient-name-input').value,
            age: document.getElementById('patient-age-input').value,
            gender: document.getElementById('patient-gender-input').value,
            height: document.getElementById('patient-height-input').value,
            weight: document.getElementById('patient-weight-input').value
        },
        medical: {
            diagnosis: document.getElementById('patient-diagnosis-input').value,
            symptoms: document.getElementById('patient-symptoms-input').value.split(',').map(item => item.trim()).filter(item => item),
            medications: document.getElementById('patient-medications-input').value.split(',').map(item => item.trim()).filter(item => item),
            allergies: document.getElementById('patient-allergies-input').value.split(',').map(item => item.trim()).filter(item => item),
            medical_history: document.getElementById('patient-history-input').value
        },
        monitoring: {
            start_date: patientInfo && patientInfo.monitoring && patientInfo.monitoring.start_date 
                ? patientInfo.monitoring.start_date 
                : new Date().toISOString().split('T')[0],
            reason: document.getElementById('monitoring-reason-input').value,
            concerns: document.getElementById('monitoring-concerns-input').value.split(',').map(item => item.trim()).filter(item => item)
        }
    };
    
    console.log('New patient info:', newPatientInfo);
    
    try {
        // Show loading state
        const submitBtn = patientForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;
        
        // Send the data to the server
        console.log('Sending data to server...');
        const response = await fetch('/save-patient-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newPatientInfo)
        });
        
        // Reset button state
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save patient information');
        }
        
        console.log('Server response successful');
        
        // Update local patient info
        patientInfo = newPatientInfo;
        updatePatientInfoUI();
        
        // Close the modal
        patientInputModal.classList.add('hidden');
        
        // Show success message
        alert('Patient information saved successfully!');
        
    } catch (error) {
        console.error('Error saving patient info:', error);
        alert('Failed to save patient information: ' + error.message);
    }
}

// Initialize vital signs monitoring
function initVitalSigns() {
    // Initialize charts
    initHeartRateChart();
    initBloodPressureChart();
    initEcgChart();
    initFullEcgChart();
    
    // Start data generation
    generateVitalSignsData();
    
    // Set interval for continuous data generation
    setInterval(generateVitalSignsData, 1000); // Update every second
}

// Initialize heart rate chart
function initHeartRateChart() {
    const ctx = document.getElementById('heart-rate-chart').getContext('2d');
    
    vitalSignsCharts.heartRate = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [{
                label: 'Heart Rate',
                data: heartRateData,
                borderColor: 'rgba(220, 38, 38, 1)',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                borderWidth: 1.5,
                tension: 0.4,
                pointRadius: 0,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                y: {
                    min: 40,
                    max: 120,
                    display: false
                },
                x: {
                    display: false
                }
            },
            animation: {
                duration: 0
            }
        }
    });
}

// Initialize blood pressure chart
function initBloodPressureChart() {
    const ctx = document.getElementById('bp-chart').getContext('2d');
    
    vitalSignsCharts.bloodPressure = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [
                {
                    label: 'Systolic',
                    data: systolicData,
                    borderColor: 'rgba(37, 99, 235, 1)',
                    backgroundColor: 'rgba(37, 99, 235, 0)',
                    borderWidth: 1.5,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Diastolic',
                    data: diastolicData,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0)',
                    borderWidth: 1.5,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                y: {
                    min: 40,
                    max: 140,
                    display: false
                },
                x: {
                    display: false
                }
            },
            animation: {
                duration: 0
            }
        }
    });
}

// Initialize ECG chart
function initEcgChart() {
    const ctx = document.getElementById('ecg-chart').getContext('2d');
    
    vitalSignsCharts.ecg = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(50).fill(''),
            datasets: [{
                label: 'ECG',
                data: ecgData,
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0)',
                borderWidth: 1.5,
                tension: 0,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            },
            scales: {
                y: {
                    min: -1,
                    max: 1.5,
                    display: false
                },
                x: {
                    display: false
                }
            },
            animation: {
                duration: 0
            }
        }
    });
}

// Initialize full ECG chart
function initFullEcgChart() {
    const ctx = document.getElementById('full-ecg-chart').getContext('2d');
    
    vitalSignsCharts.fullEcg = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(200).fill(''),
            datasets: [{
                label: 'ECG',
                data: fullEcgData,
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                borderWidth: 1.5,
                tension: 0,
                pointRadius: 0,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    min: -1,
                    max: 1.5,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        display: false
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 0
            }
        }
    });
}

// Generate ECG waveform
function generateEcgPoint(time) {
    // Simulate a normal ECG waveform
    const t = time % 1;
    
    // P wave
    if (t < 0.2) {
        return 0.25 * Math.sin(t * Math.PI / 0.2);
    }
    // PR segment
    else if (t < 0.3) {
        return 0;
    }
    // QRS complex
    else if (t < 0.4) {
        if (t < 0.33) return -0.3; // Q
        else if (t < 0.36) return 1.2; // R
        else return -0.2; // S
    }
    // ST segment
    else if (t < 0.6) {
        return 0.1;
    }
    // T wave
    else if (t < 0.8) {
        return 0.3 * Math.sin((t - 0.6) * Math.PI / 0.2);
    }
    // TP segment
    else {
        return 0;
    }
}

// Generate vital signs data
function generateVitalSignsData() {
    const now = Date.now();
    const deltaTime = (now - lastTimestamp) / 1000; // Time difference in seconds
    lastTimestamp = now;
    
    // Generate heart rate (normal range: 60-100 BPM)
    // Slight random variations around a base value
    let baseHeartRate = 75;
    if (heartRateData.length > 0) {
        baseHeartRate = heartRateData[heartRateData.length - 1];
    }
    
    // Add small random change (-2 to +2)
    const heartRateChange = Math.random() * 4 - 2;
    let newHeartRate = baseHeartRate + heartRateChange;
    
    // Keep within normal range
    newHeartRate = Math.max(60, Math.min(100, newHeartRate));
    heartRateData.push(newHeartRate);
    
    // Limit data points
    if (heartRateData.length > 20) {
        heartRateData.shift();
    }
    
    // Update heart rate display
    document.getElementById('heart-rate-value').textContent = Math.round(newHeartRate) + ' BPM';
    
    // Generate blood pressure (normal range: systolic 90-120, diastolic 60-80)
    let baseSystolic = 110;
    let baseDiastolic = 70;
    
    if (systolicData.length > 0) {
        baseSystolic = systolicData[systolicData.length - 1];
        baseDiastolic = diastolicData[diastolicData.length - 1];
    }
    
    // Add small random changes
    const systolicChange = Math.random() * 3 - 1.5;
    const diastolicChange = Math.random() * 2 - 1;
    
    let newSystolic = baseSystolic + systolicChange;
    let newDiastolic = baseDiastolic + diastolicChange;
    
    // Keep within normal ranges
    newSystolic = Math.max(90, Math.min(120, newSystolic));
    newDiastolic = Math.max(60, Math.min(80, newDiastolic));
    
    systolicData.push(newSystolic);
    diastolicData.push(newDiastolic);
    
    // Limit data points
    if (systolicData.length > 20) {
        systolicData.shift();
        diastolicData.shift();
    }
    
    // Update blood pressure display
    document.getElementById('bp-value').textContent = 
        Math.round(newSystolic) + '/' + Math.round(newDiastolic) + ' mmHg';
    
    // Generate ECG data
    // We'll generate multiple points per update to create a smoother waveform
    const ecgFrequency = newHeartRate / 60; // Beats per second
    const ecgPeriod = 1 / ecgFrequency; // Seconds per beat
    
    // Generate 10 ECG points per update for the small chart
    const smallEcgPoints = [];
    for (let i = 0; i < 10; i++) {
        const t = (deltaTime * (i/10)) % ecgPeriod / ecgPeriod;
        smallEcgPoints.push(generateEcgPoint(t));
    }
    
    // Add to ECG data
    ecgData = [...ecgData, ...smallEcgPoints];
    
    // Limit data points for small ECG chart
    if (ecgData.length > 50) {
        ecgData = ecgData.slice(ecgData.length - 50);
    }
    
    // Generate 20 ECG points for the full chart
    for (let i = 0; i < 20; i++) {
        const t = (deltaTime * (i/20)) % ecgPeriod / ecgPeriod;
        fullEcgData.push(generateEcgPoint(t));
    }
    
    // Limit data points for full ECG chart
    if (fullEcgData.length > 200) {
        fullEcgData = fullEcgData.slice(fullEcgData.length - 200);
    }
    
    // Update charts
    updateVitalSignsCharts();
    
    // Store vital signs data every 10 seconds
    if (Math.floor(now / 10000) !== Math.floor((now - deltaTime * 1000) / 10000)) {
        storeVitalSignsData();
    }
    
    // Occasionally simulate abnormal readings for testing (1% chance)
    if (Math.random() < 0.01) {
        simulateAbnormalReading();
    }
}

// Simulate abnormal reading for testing
function simulateAbnormalReading() {
    const abnormalType = Math.random() < 0.5 ? 'heartRate' : 'bloodPressure';
    
    if (abnormalType === 'heartRate') {
        // Simulate high heart rate
        const highHeartRate = 110 + Math.random() * 30; // 110-140 BPM
        heartRateData[heartRateData.length - 1] = highHeartRate;
        document.getElementById('heart-rate-value').textContent = Math.round(highHeartRate) + ' BPM';
    } else {
        // Simulate high blood pressure
        const highSystolic = 140 + Math.random() * 30; // 140-170 mmHg
        const highDiastolic = 90 + Math.random() * 20; // 90-110 mmHg
        systolicData[systolicData.length - 1] = highSystolic;
        diastolicData[diastolicData.length - 1] = highDiastolic;
        document.getElementById('bp-value').textContent = 
            Math.round(highSystolic) + '/' + Math.round(highDiastolic) + ' mmHg';
    }
    
    // Update charts
    updateVitalSignsCharts();
    
    // Store and alert
    storeVitalSignsData();
}

// Update vital signs charts
function updateVitalSignsCharts() {
    // Update heart rate chart
    vitalSignsCharts.heartRate.data.datasets[0].data = [...heartRateData];
    vitalSignsCharts.heartRate.update();
    
    // Update blood pressure chart
    vitalSignsCharts.bloodPressure.data.datasets[0].data = [...systolicData];
    vitalSignsCharts.bloodPressure.data.datasets[1].data = [...diastolicData];
    vitalSignsCharts.bloodPressure.update();
    
    // Update ECG chart
    vitalSignsCharts.ecg.data.datasets[0].data = [...ecgData];
    vitalSignsCharts.ecg.update();
    
    // Update full ECG chart
    vitalSignsCharts.fullEcg.data.datasets[0].data = [...fullEcgData];
    vitalSignsCharts.fullEcg.update();
}

// Improved voice initialization
function initVoiceCommunication() {
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Speech recognition not supported');
        return;
    }
    
    console.log('Initializing speech recognition');
    
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = false;
    speechRecognition.lang = 'en-US';
    
    // Handle results
    speechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Speech recognized:', transcript);
        document.getElementById('chat-input').value = transcript;
        sendMessage();
    };
    
    // Handle end of speech
    speechRecognition.onend = () => {
        console.log('Speech recognition ended, isSpeaking:', isSpeaking);
        
        // Only restart if we're still in listening mode and not currently speaking
        if (isListening && !isSpeaking) {
            console.log('Restarting speech recognition');
            try {
                speechRecognition.start();
            } catch (e) {
                console.error('Error restarting speech recognition:', e);
                updateMicButtonState(false);
                isListening = false;
            }
        } else {
            // Don't restart if we're speaking
            console.log('Not restarting speech recognition');
        }
    };
    
    // Handle errors
    speechRecognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            alert('Microphone access denied. Please enable microphone access to use voice input.');
            isListening = false;
            updateMicButtonState(false);
        }
    };
    
    // Add voice button
    addVoiceButton();
    console.log('Voice communication initialized');
}

// Fix microphone button to ensure it's visible
function addVoiceButton() {
    // Check if mic button already exists
    if (document.getElementById('mic-btn')) {
        console.log('Mic button already exists');
        return;
    }
    
    const micButton = document.createElement('button');
    micButton.id = 'mic-btn';
    micButton.type = 'button'; // Prevent form submission
    micButton.className = 'ml-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg p-2 flex items-center justify-center';
    micButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>';
    
    // Insert before send button
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn && sendBtn.parentNode) {
        sendBtn.parentNode.insertBefore(micButton, sendBtn);
        console.log('Mic button added successfully');
    } else {
        console.error('Send button not found');
    }
    
    // Add click event
    micButton.addEventListener('click', toggleVoiceInput);
}

// Improved toggle voice input function
function toggleVoiceInput() {
    if (!speechRecognition) {
        console.error('Speech recognition not initialized');
        return;
    }
    
    console.log('Toggling voice input, current state:', isListening);
    
    if (isListening) {
        // Stop listening
        isListening = false;
        try {
            speechRecognition.stop();
            console.log('Speech recognition stopped');
        } catch (e) {
            console.error('Error stopping speech recognition:', e);
        }
        updateMicButtonState(false);
    } else {
        // Start listening
        isListening = true;
        try {
            speechRecognition.start();
            console.log('Speech recognition started');
        } catch (e) {
            console.error('Error starting speech recognition:', e);
            isListening = false;
        }
        updateMicButtonState(true);
        
        // Show listening indicator
        addListeningIndicator();
    }
}

// Update mic button state (active/inactive)
function updateMicButtonState(active) {
    const micButton = document.getElementById('mic-btn');
    if (!micButton) return;
    
    if (active) {
        micButton.classList.remove('bg-gray-200', 'hover:bg-gray-300', 'text-gray-700');
        micButton.classList.add('bg-red-500', 'hover:bg-red-600', 'text-white', 'pulse-animation');
    } else {
        micButton.classList.remove('bg-red-500', 'hover:bg-red-600', 'text-white', 'pulse-animation');
        micButton.classList.add('bg-gray-200', 'hover:bg-gray-300', 'text-gray-700');
        
        // Remove listening indicator if it exists
        const indicator = document.getElementById('listening-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
}

// Add listening indicator to chat
function addListeningIndicator() {
    // Remove existing indicator if any
    const existingIndicator = document.getElementById('listening-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Create new indicator
    const indicator = document.createElement('div');
    indicator.id = 'listening-indicator';
    indicator.className = 'flex justify-center items-center p-2 mb-4';
    indicator.innerHTML = `
        <div class="bg-red-100 text-red-800 rounded-full px-3 py-1 text-sm flex items-center">
            <span class="mr-2">Listening</span>
            <span class="flex space-x-1">
                <span class="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" style="animation-delay: 0ms"></span>
                <span class="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" style="animation-delay: 300ms"></span>
                <span class="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" style="animation-delay: 600ms"></span>
            </span>
        </div>
    `;
    
    // Add to chat messages container
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to shorten text for speech
function shortenForSpeech(text) {
    // Remove markdown formatting
    let cleaned = text.replace(/\*\*|__|\*|_|`|#|<[^>]*>/g, '');
    
    // Replace newlines with spaces
    cleaned = cleaned.replace(/\n/g, ' ');
    
    // Limit to 100 words maximum
    const words = cleaned.split(' ');
    if (words.length > 100) {
        cleaned = words.slice(0, 100).join(' ') + '...';
    }
    
    return cleaned.trim();
}

// Updated speak function with shortened text
function speakResponse(text) {
    if (!window.speechSynthesis) {
        console.error('Speech synthesis not supported');
        return;
    }
    
    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    // Shorten the text for speech
    const shortenedText = shortenForSpeech(text);
    
    // Create utterance with shortened text
    const utterance = new SpeechSynthesisUtterance(shortenedText);
    utterance.lang = 'en-US';
    utterance.rate = 1.1; // Slightly faster rate
    
    // Set speaking state
    isSpeaking = true;
    
    // Handle speech end
    utterance.onend = () => {
        isSpeaking = false;
        if (isListening && speechRecognition) {
            setTimeout(() => {
                try {
                    speechRecognition.start();
                } catch (e) {
                    console.error('Error restarting speech recognition:', e);
                }
            }, 500);
        }
    };
    
    // Speak the shortened text
    speechSynthesis.speak(utterance);
}

// Add CSS for pulse animation
function addVoiceStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        .pulse-animation {
            animation: pulse 1.5s infinite;
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
        }
        
        .animate-pulse {
            animation: bounce 1.5s infinite;
        }
    `;
    document.head.appendChild(styleElement);
}

// Initialize voice features when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Add voice styles
    addVoiceStyles();
    
    // Initialize voice communication
    initVoiceCommunication();
    
    // Load voices when available (for some browsers)
    if (speechSynthesis) {
        speechSynthesis.onvoiceschanged = () => {
            // Voices loaded
        };
    }
});

// Add direct event listener for mic button
document.addEventListener('DOMContentLoaded', function() {
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) {
        micBtn.addEventListener('click', toggleVoiceInput);
        console.log('Added click event to existing mic button');
    } else {
        console.error('Mic button not found in DOM');
    }
});

// Store vital signs data in JSON file
async function storeVitalSignsData() {
    // Get current vital signs
    const vitalData = {
        timestamp: new Date().toISOString(),
        heartRate: heartRateData[heartRateData.length - 1],
        bloodPressure: {
            systolic: systolicData[systolicData.length - 1],
            diastolic: diastolicData[diastolicData.length - 1]
        },
        ecg: {
            status: calculateEcgStatus(ecgData)
        }
    };
    
    // Check if any values are abnormal
    const abnormalReadings = checkAbnormalVitals(vitalData);
    vitalData.abnormalReadings = abnormalReadings;
    
    try {
        // Send data to server to store in JSON file
        const response = await fetch('/store-vitals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(vitalData)
        });
        
        if (!response.ok) {
            throw new Error('Failed to store vital signs data');
        }
        
        // If abnormal readings detected, alert the user and AI
        if (abnormalReadings.length > 0) {
            alertAbnormalVitals(abnormalReadings, vitalData);
        }
        
    } catch (error) {
        console.error('Error storing vital signs:', error);
    }
}

// Calculate ECG status (simplified)
function calculateEcgStatus(ecgData) {
    // Simple algorithm to detect irregularities
    // In a real app, this would be more sophisticated
    const variance = calculateVariance(ecgData);
    if (variance > 100) return "irregular";
    return "normal";
}

// Calculate variance of array
function calculateVariance(array) {
    const mean = array.reduce((sum, val) => sum + val, 0) / array.length;
    return array.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / array.length;
}

// Check for abnormal vital signs
function checkAbnormalVitals(vitalData) {
    const abnormal = [];
    
    // Check heart rate (normal: 60-100 BPM)
    if (vitalData.heartRate > 100) {
        abnormal.push({
            type: "heartRate",
            value: vitalData.heartRate,
            severity: vitalData.heartRate > 120 ? "high" : "moderate",
            message: `Heart rate elevated at ${Math.round(vitalData.heartRate)} BPM`
        });
    } else if (vitalData.heartRate < 60) {
        abnormal.push({
            type: "heartRate",
            value: vitalData.heartRate,
            severity: vitalData.heartRate < 50 ? "high" : "moderate",
            message: `Heart rate low at ${Math.round(vitalData.heartRate)} BPM`
        });
    }
    
    // Check blood pressure (normal: systolic 90-120, diastolic 60-80)
    if (vitalData.bloodPressure.systolic > 120) {
        abnormal.push({
            type: "bloodPressure",
            value: `${Math.round(vitalData.bloodPressure.systolic)}/${Math.round(vitalData.bloodPressure.diastolic)}`,
            severity: vitalData.bloodPressure.systolic > 140 ? "high" : "moderate",
            message: `Blood pressure elevated at ${Math.round(vitalData.bloodPressure.systolic)}/${Math.round(vitalData.bloodPressure.diastolic)} mmHg`
        });
    }
    
    // Check ECG
    if (vitalData.ecg.status === "irregular") {
        abnormal.push({
            type: "ecg",
            value: "Irregular",
            severity: "high",
            message: "Irregular ECG pattern detected"
        });
    }
    
    return abnormal;
}

// Alert function for abnormal vital signs
async function alertAbnormalVitals(abnormalReadings, vitalData) {
    // Create alert message
    const alertMessage = abnormalReadings.map(reading => reading.message).join(", ");
    
    // Show alert notification
    showAlertNotification(alertMessage, abnormalReadings[0].severity);
    
    // Show "contacts notified" message
    showContactsNotifiedMessage();
    
    // Send alert to AI assistant
    sendAlertToAI(abnormalReadings, vitalData);
    
    // Send notifications to configured contacts
    await sendAlertNotifications(alertMessage, vitalData, abnormalReadings[0].severity);
}

// Show alert notification
function showAlertNotification(message, severity) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
        severity === 'high' ? 'bg-red-500' : 'bg-yellow-500'
    } text-white max-w-sm z-50 animate-pulse`;
    
    alertDiv.innerHTML = `
        <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span class="font-bold">Alert:</span>
            <span class="ml-2">${message}</span>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Remove after 10 seconds
    setTimeout(() => {
        alertDiv.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => alertDiv.remove(), 500);
    }, 10000);
}

// Show "contacts notified" message
function showContactsNotifiedMessage() {
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'fixed top-4 right-4 p-4 rounded-lg shadow-lg bg-green-500 text-white max-w-sm z-50';
    
    notificationDiv.innerHTML = `
        <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Emergency contacts notified via email</span>
        </div>
    `;
    
    document.body.appendChild(notificationDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notificationDiv.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => notificationDiv.remove(), 500);
    }, 5000);
}

// Send alert to AI assistant
function sendAlertToAI(abnormalReadings, vitalData) {
    // Create a message for the AI about the abnormal readings
    const alertType = abnormalReadings[0].type;
    const severity = abnormalReadings[0].severity;
    
    // Add AI message about the alert
    addMessageToChat('ai', `⚠️ Alert: Abnormal vital signs detected - ${abnormalReadings.map(r => r.message).join(", ")}. I'll provide recommendations to address this.`);
    
    // Get recommendations from AI
    getVitalSignsRecommendations(alertType, severity, vitalData);
}

// Get recommendations from AI for abnormal vital signs
async function getVitalSignsRecommendations(alertType, severity, vitalData) {
    try {
        // Show AI is thinking
        const thinkingId = addThinkingMessage();
        
        // Prepare context
        const context = prepareGeminiContext();
        
        // Add vital signs data to context with more detailed information
        context.vitalSigns = {
            alertType,
            severity,
            readings: {
                heartRate: Math.round(vitalData.heartRate),
                bloodPressure: {
                    systolic: Math.round(vitalData.bloodPressure.systolic),
                    diastolic: Math.round(vitalData.bloodPressure.diastolic)
                },
                ecgStatus: vitalData.ecg.status
            },
            abnormalReadings: vitalData.abnormalReadings || []
        };
        
        // Create a specific message for recommendations with clear medical context
        const message = `As a medical professional, please provide specific recommendations to address the following vital sign issue: ${alertType} (severity: ${severity}). 
Current readings: Heart rate is ${Math.round(vitalData.heartRate)} BPM, Blood pressure is ${Math.round(vitalData.bloodPressure.systolic)}/${Math.round(vitalData.bloodPressure.diastolic)} mmHg, ECG status is ${vitalData.ecg.status}.
Please provide medical advice for immediate actions and when the patient should seek emergency care.`;
        
        // Call Gemini API with modified request
        const response = await fetch('/gemini-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                context,
                history: [], // Use empty history to ensure fresh medical response
                role: "medical_advisor" // Add role to signal server this is a medical request
            })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        
        // Remove thinking message
        removeThinkingMessage(thinkingId);
        
        // Add AI response to UI
        addMessageToChat('ai', data.response);
        
        // Save to chat history
        saveChatMessage('ai', data.response);
        
    } catch (error) {
        console.error('Error getting vital signs recommendations:', error);
        addMessageToChat('ai', 'I was unable to provide recommendations at this time. Please consult a healthcare professional if you are concerned about these readings.');
    }
}

// Send alert notifications to configured contacts
async function sendAlertNotifications(alertMessage, vitalData, severity) {
    try {
        const response = await fetch('/send-alert-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                alertMessage,
                vitalData,
                severity
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send alert notifications');
        }
        
        const result = await response.json();
        console.log('Alert notifications sent:', result);
        
    } catch (error) {
        console.error('Error sending alert notifications:', error);
    }
}

// Initialize simulation panel
function initSimulationPanel() {
    const toggleSimPanelBtn = document.getElementById('toggle-sim-panel');
    const simPanel = document.getElementById('sim-panel');
    const simHighHrBtn = document.getElementById('sim-high-hr-btn');
    const simHighBpBtn = document.getElementById('sim-high-bp-btn');
    const simIrregularEcgBtn = document.getElementById('sim-irregular-ecg-btn');
    const simMultipleBtn = document.getElementById('sim-multiple-btn');
    
    // Toggle simulation panel visibility
    if (toggleSimPanelBtn && simPanel) {
        toggleSimPanelBtn.addEventListener('click', () => {
            simPanel.classList.toggle('hidden');
        });
    }
    
    // Simulate high heart rate
    if (simHighHrBtn) {
        simHighHrBtn.addEventListener('click', () => {
            const hrInput = document.getElementById('sim-heart-rate');
            const highHeartRate = hrInput ? parseFloat(hrInput.value) : 130;
            simulateHighHeartRate(highHeartRate);
        });
    }
    
    // Simulate high blood pressure
    if (simHighBpBtn) {
        simHighBpBtn.addEventListener('click', () => {
            const systolicInput = document.getElementById('sim-systolic');
            const diastolicInput = document.getElementById('sim-diastolic');
            const highSystolic = systolicInput ? parseFloat(systolicInput.value) : 160;
            const highDiastolic = diastolicInput ? parseFloat(diastolicInput.value) : 100;
            simulateHighBloodPressure(highSystolic, highDiastolic);
        });
    }
    
    // Simulate irregular ECG
    if (simIrregularEcgBtn) {
        simIrregularEcgBtn.addEventListener('click', () => {
            simulateIrregularEcg();
        });
    }
    
    // Simulate multiple issues
    if (simMultipleBtn) {
        simMultipleBtn.addEventListener('click', () => {
            simulateMultipleIssues();
        });
    }
}

// Simulate high heart rate
function simulateHighHeartRate(rate = 130) {
    // Update the last heart rate data point
    heartRateData[heartRateData.length - 1] = rate;
    
    // Update display
    document.getElementById('heart-rate-value').textContent = Math.round(rate) + ' BPM';
    
    // Update chart
    updateVitalSignsCharts();
    
    // Store and alert
    storeVitalSignsData();
    
    console.log(`Simulated high heart rate: ${rate} BPM`);
}

// Simulate high blood pressure
function simulateHighBloodPressure(systolic = 160, diastolic = 100) {
    // Update the last blood pressure data points
    systolicData[systolicData.length - 1] = systolic;
    diastolicData[diastolicData.length - 1] = diastolic;
    
    // Update display
    document.getElementById('bp-value').textContent = 
        Math.round(systolic) + '/' + Math.round(diastolic) + ' mmHg';
    
    // Update chart
    updateVitalSignsCharts();
    
    // Store and alert
    storeVitalSignsData();
    
    console.log(`Simulated high blood pressure: ${systolic}/${diastolic} mmHg`);
}

// Simulate irregular ECG
function simulateIrregularEcg() {
    // Create irregular pattern in ECG data
    for (let i = 0; i < ecgData.length; i++) {
        if (i % 3 === 0) {
            ecgData[i] = ecgData[i] * (1.5 + Math.random() * 0.5);
        } else if (i % 7 === 0) {
            ecgData[i] = ecgData[i] * 0.3;
        }
    }
    
    // Update chart
    updateVitalSignsCharts();
    
    // Store with irregular ECG status
    const vitalData = {
        timestamp: new Date().toISOString(),
        heartRate: heartRateData[heartRateData.length - 1],
        bloodPressure: {
            systolic: systolicData[systolicData.length - 1],
            diastolic: diastolicData[diastolicData.length - 1]
        },
        ecg: {
            status: "irregular"
        },
        abnormalReadings: [{
            type: "ecg",
            value: "Irregular",
            severity: "high",
            message: "Irregular ECG pattern detected"
        }]
    };
    
    // Alert about irregular ECG
    alertAbnormalVitals(vitalData.abnormalReadings, vitalData);
    
    // Store data
    storeVitalSignsData();
    
    console.log('Simulated irregular ECG');
}

// Simulate multiple issues
function simulateMultipleIssues() {
    // Set high heart rate
    const highHeartRate = 135 + Math.random() * 15;
    heartRateData[heartRateData.length - 1] = highHeartRate;
    document.getElementById('heart-rate-value').textContent = Math.round(highHeartRate) + ' BPM';
    
    // Set high blood pressure
    const highSystolic = 165 + Math.random() * 15;
    const highDiastolic = 105 + Math.random() * 10;
    systolicData[systolicData.length - 1] = highSystolic;
    diastolicData[diastolicData.length - 1] = highDiastolic;
    document.getElementById('bp-value').textContent = 
        Math.round(highSystolic) + '/' + Math.round(highDiastolic) + ' mmHg';
    
    // Create irregular pattern in ECG data
    for (let i = 0; i < ecgData.length; i++) {
        if (i % 4 === 0) {
            ecgData[i] = ecgData[i] * (1.7 + Math.random() * 0.5);
        } else if (i % 6 === 0) {
            ecgData[i] = ecgData[i] * 0.2;
        }
    }
    
    // Update charts
    updateVitalSignsCharts();
    
    // Create vital data with multiple issues
    const vitalData = {
        timestamp: new Date().toISOString(),
        heartRate: highHeartRate,
        bloodPressure: {
            systolic: highSystolic,
            diastolic: highDiastolic
        },
        ecg: {
            status: "irregular"
        },
        abnormalReadings: [
            {
                type: "heartRate",
                value: highHeartRate,
                severity: "high",
                message: `Heart rate elevated at ${Math.round(highHeartRate)} BPM`
            },
            {
                type: "bloodPressure",
                value: `${Math.round(highSystolic)}/${Math.round(highDiastolic)}`,
                severity: "high",
                message: `Blood pressure elevated at ${Math.round(highSystolic)}/${Math.round(highDiastolic)} mmHg`
            },
            {
                type: "ecg",
                value: "Irregular",
                severity: "high",
                message: "Irregular ECG pattern detected"
            }
        ]
    };
    
    // Alert about multiple issues
    alertAbnormalVitals(vitalData.abnormalReadings, vitalData);
    
    // Store data
    storeVitalSignsData();
    
    console.log('Simulated multiple issues');
}

// Initialize notification settings with predefined contacts
async function initNotificationSettings() {
    const notificationSettingsBtn = document.getElementById('notification-settings-btn');
    const notificationSettingsModal = document.getElementById('notification-settings-modal');
    const closeNotificationSettings = document.getElementById('close-notification-settings');
    const notificationSettingsForm = document.getElementById('notification-settings-form');
    const testNotificationsBtn = document.getElementById('test-notifications');
    
    // Load notification settings
    await loadNotificationSettings();
    
    // Open notification settings modal
    if (notificationSettingsBtn) {
        notificationSettingsBtn.addEventListener('click', () => {
            notificationSettingsModal.classList.remove('hidden');
        });
    }
    
    // Close notification settings modal
    if (closeNotificationSettings) {
        closeNotificationSettings.addEventListener('click', () => {
            notificationSettingsModal.classList.add('hidden');
        });
    }
    
    // Save notification settings
    if (notificationSettingsForm) {
        notificationSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveNotificationSettings();
            notificationSettingsModal.classList.add('hidden');
        });
    }
    
    // Test notifications
    if (testNotificationsBtn) {
        testNotificationsBtn.addEventListener('click', async () => {
            await testNotifications();
        });
    }
}

// Load notification settings from server
async function loadNotificationSettings() {
    try {
        const response = await fetch('/notification-settings');
        
        if (!response.ok) {
            throw new Error('Failed to load notification settings');
        }
        
        const settings = await response.json();
        
        // Update form fields
        const emailAlertsCheckbox = document.getElementById('enable-email-alerts');
        const emailsTextarea = document.getElementById('notification-emails');
        
        if (emailAlertsCheckbox) emailAlertsCheckbox.checked = settings.enableEmailAlerts;
        if (emailsTextarea) emailsTextarea.value = settings.emails.join('\n');
        
    } catch (error) {
        console.error('Error loading notification settings:', error);
    }
}

// Save notification settings to server
async function saveNotificationSettings() {
    try {
        const enableEmailAlerts = document.getElementById('enable-email-alerts')?.checked || false;
        const emailsText = document.getElementById('notification-emails')?.value || '';
        
        // Parse emails
        const emails = emailsText.split('\n')
            .map(email => email.trim())
            .filter(email => email.length > 0);
        
        const settings = {
            enableEmailAlerts,
            emails
        };
        
        const response = await fetch('/save-notification-settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save notification settings');
        }
        
        const result = await response.json();
        console.log('Notification settings saved:', result);
        
        // Show success message
        showNotification('Notification settings saved successfully', 'success');
        
    } catch (error) {
        console.error('Error saving notification settings:', error);
        showNotification('Failed to save notification settings', 'error');
    }
}

// Test notifications
async function testNotifications() {
    try {
        // Save settings first
        await saveNotificationSettings();
        
        // Create test data
        const testVitalData = {
            timestamp: new Date().toISOString(),
            heartRate: 130,
            bloodPressure: {
                systolic: 160,
                diastolic: 100
            },
            ecg: {
                status: "normal"
            }
        };
        
        // Send test notification
        const response = await fetch('/send-alert-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                alertMessage: "This is a test alert notification",
                vitalData: testVitalData,
                severity: "test"
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send test notifications');
        }
        
        const result = await response.json();
        console.log('Test notifications sent:', result);
        
        // Show success message
        showNotification(`Test notifications sent: ${result.emailsSent} emails`, 'success');
        
        // If there are preview URLs (Ethereal), show them
        if (result.emailResults && result.emailResults.some(r => r.previewUrl)) {
            const previewUrls = result.emailResults
                .filter(r => r.previewUrl)
                .map(r => `<a href="${r.previewUrl}" target="_blank" class="text-blue-500 underline">View email sent to ${r.to}</a>`)
                .join('<br>');
            
            if (previewUrls) {
                showEmailPreviewLinks(previewUrls);
            }
        }
        
    } catch (error) {
        console.error('Error sending test notifications:', error);
        showNotification('Failed to send test notifications', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notificationDiv = document.createElement('div');
    
    const bgColor = type === 'success' ? 'bg-green-500' : 
                   type === 'error' ? 'bg-red-500' : 
                   'bg-blue-500';
    
    notificationDiv.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${bgColor} text-white max-w-sm z-50`;
    
    notificationDiv.innerHTML = `
        <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notificationDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notificationDiv.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => notificationDiv.remove(), 500);
    }, 5000);
}

// Show email preview links
function showEmailPreviewLinks(linksHtml) {
    const previewDiv = document.createElement('div');
    previewDiv.className = 'fixed top-20 right-4 p-4 rounded-lg shadow-lg bg-white text-black max-w-md z-50 border border-gray-300';
    
    previewDiv.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <h3 class="font-bold">Email Preview Links</h3>
            <button class="text-gray-500 hover:text-gray-700" onclick="this.parentElement.parentElement.remove()">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </button>
        </div>
        <div class="text-sm">
            <p class="mb-2">These are test emails using Ethereal. Click the links below to view them:</p>
            ${linksHtml}
        </div>
    `;
    
    document.body.appendChild(previewDiv);
    
    // Remove after 2 minutes
    setTimeout(() => {
        if (previewDiv.parentElement) {
            previewDiv.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => {
                if (previewDiv.parentElement) {
                    previewDiv.remove();
                }
            }, 500);
        }
    }, 120000);
}

// Test notifications with specific contacts
async function testNotificationsWithSpecificContacts() {
    try {
        // Create test data
        const testVitalData = {
            timestamp: new Date().toISOString(),
            heartRate: 130,
            bloodPressure: {
                systolic: 160,
                diastolic: 100
            },
            ecg: {
                status: "normal"
            }
        };
        
        // Send test notification
        const response = await fetch('/send-alert-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                alertMessage: "This is a test alert notification",
                vitalData: testVitalData,
                severity: "test"
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send test notifications');
        }
        
        const result = await response.json();
        console.log('Test notifications sent:', result);
        
        // Show success message
        showNotification(`Test notifications sent: ${result.emailsSent} emails`, 'success');
        
    } catch (error) {
        console.error('Error sending test notifications:', error);
        showNotification('Failed to send test notifications', 'error');
    }
}

// Add initialization for notification settings
document.addEventListener('DOMContentLoaded', function() {
    // Initialize notification settings
    initNotificationSettings();
    
    // Add a button to the UI to test notifications
    const testButton = document.createElement('button');
    testButton.className = 'fixed bottom-4 left-4 p-4 rounded-lg shadow-lg bg-blue-500 text-white';
    testButton.textContent = 'Test Email Notification';
    testButton.addEventListener('click', testNotificationsWithSpecificContacts);
    document.body.appendChild(testButton);
}); 
