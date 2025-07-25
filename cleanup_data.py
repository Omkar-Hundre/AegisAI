#!/usr/bin/env python3
"""
Script to clean up duplicate entries in JSON files
"""
import json
import os
from datetime import datetime

def clean_json_file(filename, key_field='timestamp'):
    """Clean duplicate entries from a JSON file based on a key field"""
    if not os.path.exists(filename):
        print(f"File {filename} does not exist, skipping...")
        return
    
    try:
        with open(filename, 'r') as f:
            data = json.load(f)
        
        if not isinstance(data, list):
            print(f"File {filename} is not a list, skipping...")
            return
        
        # Remove duplicates based on key field
        seen = set()
        cleaned_data = []
        
        for item in data:
            if isinstance(item, dict) and key_field in item:
                key_value = item[key_field]
                if key_value not in seen:
                    seen.add(key_value)
                    cleaned_data.append(item)
            else:
                # Keep items that don't have the key field
                cleaned_data.append(item)
        
        # Write back cleaned data
        with open(filename, 'w') as f:
            json.dump(cleaned_data, f, indent=4)
        
        removed_count = len(data) - len(cleaned_data)
        print(f"Cleaned {filename}: removed {removed_count} duplicate entries")
        
    except Exception as e:
        print(f"Error cleaning {filename}: {str(e)}")

def main():
    print("Cleaning up JSON files...")
    
    # Clean caption and analysis files
    clean_json_file('captions.json', 'timestamp')
    clean_json_file('behavior_analysis.json', 'timestamp')
    
    print("Cleanup completed!")

if __name__ == "__main__":
    main()
