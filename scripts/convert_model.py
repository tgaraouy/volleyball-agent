import tensorflow as tf
import tensorflowjs as tfjs
import json
import os

# Paths
input_model_path = '../model/volleyball_pose_model/volleyball_technique_model.keras'
input_labels_path = '../model/volleyball_pose_model/volleyball_technique_labels.json'
output_dir = '../model/volleyball_pose_model/web_model'

# Load and convert the model
print("Loading Keras model...")
model = tf.keras.models.load_model(input_model_path)

# Create output directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

# Convert the model to TensorFlow.js format
print("Converting model to TensorFlow.js format...")
tfjs.converters.save_keras_model(model, output_dir)

# Copy and rename the labels file
print("Copying labels file...")
with open(input_labels_path, 'r') as f:
    labels = json.load(f)

with open(os.path.join(output_dir, 'labels.json'), 'w') as f:
    json.dump(labels, f)

print("Conversion complete! Files saved to:", output_dir) 