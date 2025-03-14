"""
Extract TensorFlow.js model from Keras model file.
This script converts a Keras model file to TensorFlow.js format.
"""

import os
import json
import subprocess
import sys

def convert_keras_to_tfjs(keras_model_path, output_dir):
    """
    Convert a Keras model to TensorFlow.js format.
    
    Args:
        keras_model_path: Path to the Keras model file (.keras or .h5)
        output_dir: Directory to save the TensorFlow.js model files
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Check if tensorflowjs_converter is installed
    try:
        subprocess.run(["tensorflowjs_converter", "--version"], 
                      check=True, 
                      stdout=subprocess.PIPE, 
                      stderr=subprocess.PIPE)
    except (subprocess.SubprocessError, FileNotFoundError):
        print("Error: tensorflowjs_converter not found.")
        print("Please install it with: pip install tensorflowjs")
        return False
    
    # Convert the model
    print(f"Converting {keras_model_path} to TensorFlow.js format...")
    try:
        result = subprocess.run(
            [
                "tensorflowjs_converter",
                "--input_format=keras",
                keras_model_path,
                output_dir
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        print("Conversion successful!")
        print(f"Model files saved to: {output_dir}")
        
        # List the generated files
        files = os.listdir(output_dir)
        print("\nGenerated files:")
        for file in files:
            file_size = os.path.getsize(os.path.join(output_dir, file))
            print(f"- {file} ({file_size} bytes)")
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error during conversion: {e}")
        print(f"stderr: {e.stderr.decode()}")
        return False

def create_labels_file(labels_dict, output_dir):
    """
    Create a labels.json file in the output directory.
    
    Args:
        labels_dict: Dictionary mapping class indices to class names
        output_dir: Directory to save the labels.json file
    """
    labels_path = os.path.join(output_dir, "labels.json")
    with open(labels_path, "w") as f:
        json.dump(labels_dict, f)
    print(f"Labels file saved to: {labels_path}")

def main():
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python extract_tfjs_model.py <keras_model_path> [output_dir]")
        print("Example: python extract_tfjs_model.py volleyball_technique_model.keras web_model")
        return
    
    # Get model path
    keras_model_path = sys.argv[1]
    if not os.path.exists(keras_model_path):
        print(f"Error: Model file {keras_model_path} not found.")
        return
    
    # Get output directory
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "web_model"
    
    # Convert the model
    success = convert_keras_to_tfjs(keras_model_path, output_dir)
    
    if success:
        # Check if labels file exists
        labels_path = os.path.splitext(keras_model_path)[0] + "_labels.json"
        if os.path.exists(labels_path):
            # Load labels
            with open(labels_path, "r") as f:
                labels = json.load(f)
            
            # Create labels file in output directory
            create_labels_file(labels, output_dir)
        else:
            print(f"Warning: Labels file {labels_path} not found.")
            print("You'll need to create a labels.json file manually.")
            
            # Create a sample labels file with placeholder values
            sample_labels = {
                "0": "attack_tempo", 
                "1": "back_attack_defense", 
                "2": "defense_set_attack", 
                "3": "individual_defense",
                "4": "jump_training", 
                "5": "offense_defense_transition", 
                "6": "power_hitting", 
                "7": "serve_pass", 
                "8": "team_communication", 
                "9": "transition", 
                "10": "transition_offense"
            }
            create_labels_file(sample_labels, output_dir)
            print("Created a sample labels.json file with default volleyball techniques.")
            print("Please update it if these labels don't match your model.")

if __name__ == "__main__":
    main() 