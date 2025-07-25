import cv2
import time
import requests
import json
import os
from datetime import datetime
import google.generativeai as genai
from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import torch

# ----------------- CONFIG -----------------

HF_API_TOKEN = "HF_API_TOKEN"
GEMINI_API_KEY = "GEMINI_API_KEY"  # replace with your key
CAPTURE_INTERVAL = 15  # seconds
ANALYSIS_INTERVAL = 15  # seconds (1 minute)
SNAPSHOT_DIR = "snapshots"
CAPTION_FILE = "captions.json"
ANALYSIS_FILE = "behavior_analysis.json"

# ------------- SETUP ----------------------

os.makedirs(SNAPSHOT_DIR, exist_ok=True)
for file in [CAPTION_FILE, ANALYSIS_FILE]:
    if not os.path.exists(file):
        with open(file, "w") as f:
            json.dump([], f)

# Create a models directory if it doesn't exist
MODELS_DIR = "models"
os.makedirs(MODELS_DIR, exist_ok=True)

print("Loading BLIP image captioning model... (this may take a few minutes on first run)")

try:
    # Load the BLIP model and processor with local caching
    processor = BlipProcessor.from_pretrained(
        "Salesforce/blip-image-captioning-base",
        cache_dir=MODELS_DIR
    )
    
    model = BlipForConditionalGeneration.from_pretrained(
        "Salesforce/blip-image-captioning-base",
        cache_dir=MODELS_DIR,
        torch_dtype=torch.float32  # Use float32 for CPU, or torch.float16 for GPU
    )
    
    # Move model to GPU if available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    
    print(f"BLIP model loaded successfully! Using device: {device}")

except Exception as e:
    print(f"Error loading BLIP model: {str(e)}")
    exit(1)

# Gemini setup
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-2.0-flash")

# ------------- BLIP Captioning -----------------

def generate_caption(image_path):
    try:
        # Load and process image
        image = Image.open(image_path).convert('RGB')
        
        # First get a basic caption without any prompt
        inputs = processor(images=image, return_tensors="pt").to(device)
        out = model.generate(**inputs, 
                           max_length=75,
                           num_beams=5,
                           min_length=20,
                           temperature=1.0)
        basic_caption = processor.decode(out[0], skip_special_tokens=True)
        
        # Then get a detailed observation with conditional prompt
        conditional_inputs = processor(
            images=image,
            text="Describe the person in this image, their actions, clothing, and the surrounding environment:",
            return_tensors="pt"
        ).to(device)
        
        detailed_out = model.generate(**conditional_inputs,
                                    max_length=150,
                                    num_beams=5,
                                    min_length=50,
                                    temperature=1.0,
                                    repetition_penalty=1.5)
        
        detailed_caption = processor.decode(detailed_out[0], skip_special_tokens=True)
        
        # Combine both captions for maximum detail
        full_caption = f"{basic_caption} {detailed_caption}"
        return full_caption.strip()
        
    except Exception as e:
        print(f"Caption generation error: {str(e)}")
        return "Caption failed (error during generation)"

# ------------- Save Caption -----------------

def save_caption(timestamp, caption, image_path):
    try:
        with open(CAPTION_FILE, "r") as file:
            data = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        data = []

    # Check if this timestamp already exists to avoid duplicates
    existing_entry = next((item for item in data if item.get("timestamp") == timestamp), None)
    if not existing_entry:
        data.append({
            "timestamp": timestamp,
            "caption": caption,
            "image_path": image_path
        })

        with open(CAPTION_FILE, "w") as file:
            json.dump(data, file, indent=4)

# ------------- Analyze Single Caption -----------------

def analyze_single_caption(caption, timestamp, patient_info):
    """Analyze a single image caption with Gemini and update both analysis and knowledge base"""
    try:
        # Create a context-rich prompt that includes patient information
        medical_context = f"""
Patient Information:
- Diagnosis: {patient_info['medical']['diagnosis']}
- Age: {patient_info['personal']['age']}
- Gender: {patient_info['personal']['gender']}
- Key concerns: {', '.join(patient_info['monitoring']['concerns'])}
"""

        # Get behavioral analysis with a more structured prompt
        analysis_prompt = (
            f"You are analyzing a patient with the following medical context:\n{medical_context}\n\n"
            "Analyze this image caption in the context of the patient's condition and respond in EXACTLY this format (no other text):\n"
            "action: [describe the current action]\n"
            "posture: [describe the body posture]\n"
            "emotion: [describe the emotional state]\n"
            "activity: [describe the current activity]\n"
            "medical_relevance: [note any medically relevant observations]\n"
            f"\nImage Caption: {caption}"
        )

        response = gemini_model.generate_content(analysis_prompt)
        analysis_text = response.text.strip()
        
        # Parse the response into a dictionary
        analysis_dict = {}
        for line in analysis_text.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                analysis_dict[key.strip()] = value.strip()

        # Create analysis entry with proper error checking
        analysis_entry = {
            "timestamp": timestamp,
            "behavior": {
                "action": analysis_dict.get('action', '').strip('[]'),
                "posture": analysis_dict.get('posture', '').strip('[]'),
                "emotion": analysis_dict.get('emotion', '').strip('[]'),
                "activity": analysis_dict.get('activity', '').strip('[]'),
                "medical_relevance": analysis_dict.get('medical_relevance', '').strip('[]')
            }
        }

        # Save to behavior_analysis.json (avoid duplicates)
        try:
            with open(ANALYSIS_FILE, "r") as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            data = []

        # Check if this timestamp already exists to avoid duplicates
        existing_entry = next((item for item in data if item.get("timestamp") == timestamp), None)
        if not existing_entry:
            data.append(analysis_entry)

            with open(ANALYSIS_FILE, "w") as f:
                json.dump(data, f, indent=4)

        # Update knowledge base with similar structure but include medical context
        knowledge_prompt = (
            f"You are analyzing a patient with the following medical context:\n{medical_context}\n\n"
            "Extract information in EXACTLY this format (no other text):\n"
            "appearance: [physical appearance details]\n"
            "behavior: [observed behavior patterns]\n"
            "environment: [surroundings and objects]\n"
            "medical_indicators: [any potential medical indicators observed]\n"
            f"\nFrom caption: {caption}"
        )

        knowledge_response = gemini_model.generate_content(knowledge_prompt)
        knowledge_text = knowledge_response.text.strip()
        
        # Parse knowledge response
        knowledge_dict = {}
        for line in knowledge_text.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                knowledge_dict[key.strip()] = value.strip()

        # Load existing knowledge base or create new one
        knowledge_base = {
            "appearance": [],
            "behaviors": [],
            "environment": [],
            "medical_indicators": []
        }

        # Try to load existing data.json
        try:
            with open('data.json', 'r') as f:
                existing_data = json.load(f)
                # If existing_data is a dictionary with the right structure, use it
                if isinstance(existing_data, dict):
                    for category in knowledge_base:
                        if category in existing_data and isinstance(existing_data[category], list):
                            knowledge_base[category] = existing_data[category].copy()
        except (json.JSONDecodeError, FileNotFoundError):
            # Use the empty knowledge_base we created
            pass

        # Add new information only if it's meaningful and not already present
        for category in knowledge_base:
            new_info = knowledge_dict.get(category, '').strip('[]').strip()

            # Skip empty, generic, or "not applicable" responses
            skip_phrases = [
                'not available', 'no information available', 'none', 'not specified',
                'not applicable', 'unspecified', 'not provided', 'not discernible',
                'none discernible', 'none apparent', 'no person', 'no visible person',
                'not applicable from', 'no physical appearance', ''
            ]

            # Check if the new info is meaningful
            is_meaningful = (new_info and
                           len(new_info.strip()) > 5 and
                           not any(skip_phrase in new_info.lower() for skip_phrase in skip_phrases))

            # Add only if meaningful and not already present
            if is_meaningful and new_info not in knowledge_base[category]:
                knowledge_base[category].append(new_info)

        # Save updated knowledge base
        with open('data.json', 'w') as f:
            json.dump(knowledge_base, f, indent=4)

        return True

    except Exception as e:
        print(f"Analysis error: {str(e)}")
        return False

# ------------- Patient Information -----------------

def get_patient_info():
    """Get patient info from file or create default if not available"""
    try:
        with open("patient_info.json", "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        # Create a default empty patient info structure instead of prompting
        default_patient_info = {
            "personal": {
                "name": "",
                "age": "",
                "gender": "",
                "height": "",
                "weight": ""
            },
            "medical": {
                "diagnosis": "",
                "symptoms": [],
                "medications": [],
                "allergies": [],
                "medical_history": ""
            },
            "monitoring": {
                "start_date": datetime.now().strftime("%Y-%m-%d"),
                "reason": "",
                "concerns": []
            }
        }
        
        # Save the default structure
        with open("patient_info.json", "w") as f:
            json.dump(default_patient_info, f, indent=4)
            
        return default_patient_info

# ------------- Main Loop -----------------

def capture_loop():
    # Get patient info (will use default if not available)
    patient_info = get_patient_info()
    
    # Print startup message
    print("\n" + "="*50)
    print(f"PATIENT MONITORING SYSTEM")
    print(f"Starting monitoring system...")
    print("Patient information can be added or edited through the web interface")
    print("="*50 + "\n")
    
    cam = cv2.VideoCapture(0)
    print("Starting image capture and analysis...")

    while True:
        try:
            ret, frame = cam.read()
            if not ret:
                print("Failed to capture image")
                continue

            # 1. Capture and save image
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            image_path = f"{SNAPSHOT_DIR}/snapshot_{timestamp}.jpg"
            cv2.imwrite(image_path, frame)
            print(f"\nCaptured: {image_path}")

            # 2. Generate caption
            caption = generate_caption(image_path)
            if not caption or "failed" in caption.lower():
                print("Caption generation failed, retrying with next image...")
                time.sleep(CAPTURE_INTERVAL)
                continue

            # 3. Save caption
            save_caption(timestamp, caption, image_path)
            print("Caption saved successfully")

            # 4. Analyze behavior for this image
            print("Analyzing behavior...")
            success = analyze_single_caption(caption, 
                                          datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                                          patient_info)
            
            if success:
                print("Analysis completed and saved")
            else:
                print("Analysis failed")

            # 5. Wait before next capture
            print(f"\nWaiting {CAPTURE_INTERVAL} seconds before next capture...")
            time.sleep(CAPTURE_INTERVAL)

        except KeyboardInterrupt:
            print("\nStopping capture...")
            break
        except Exception as e:
            print(f"Error in capture loop: {str(e)}")
            time.sleep(CAPTURE_INTERVAL)

    cam.release()

# Run
if __name__ == "__main__":
    capture_loop()
