# Mount Google Drive to access your videos
from google.colab import drive
drive.mount('/content/drive')

# Install required packages
!pip install opencv-python pandas scikit-learn matplotlib tensorflowjs

import cv2
import numpy as np
import pandas as pd
import os
import matplotlib.pyplot as plt
from sklearn.preprocessing import LabelEncoder
import json
import time
from sklearn.model_selection import train_test_split
from tensorflow.keras import layers, models
import tensorflow as tf
import tensorflowjs as tfjs

# Use the same VolleyballFrameDataset class from your original script
class VolleyballFrameDataset:
    def __init__(self):
        """Initialize the dataset processor with direct frame features"""
        self.label_encoder = LabelEncoder()

    def visualize_frame(self, frame, frame_count):
        """Visualize a sample frame"""
        plt.figure(figsize=(10, 6))
        plt.imshow(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        plt.title(f'Frame {frame_count}')
        plt.axis('off')
        plt.show()

    def extract_features(self, frame):
        """
        Extract basic features from frame using simple computer vision techniques
        rather than pose estimation which is causing errors
        """
        # Resize for consistency
        resized = cv2.resize(frame, (128, 128))

        # Convert to grayscale
        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

        # Extract edges using Canny edge detector
        edges = cv2.Canny(gray, 100, 200)

        # Calculate HOG (Histogram of Oriented Gradients) features
        # Simplified version without using the full HOG implementation
        gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0)
        gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1)
        mag, ang = cv2.cartToPolar(gx, gy)

        # Create histogram of gradients
        bins = 9
        hist = np.zeros(bins)
        for i in range(bins):
            mask = ((ang >= (2*np.pi*i/bins)) & (ang < (2*np.pi*(i+1)/bins)))
            hist[i] = np.sum(mag[mask])

        # Normalize histogram
        if np.sum(hist) > 0:
            hist = hist / np.sum(hist)

        # Add some color features
        hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
        color_hist = cv2.calcHist([hsv], [0, 1], None, [8, 8], [0, 180, 0, 256])
        color_hist = cv2.normalize(color_hist, color_hist).flatten()

        # Calculate motion features using frame differencing if prev_frame exists
        motion_features = np.zeros(5)  # Placeholder for motion features

        # Combine all features
        combined_features = np.concatenate([
            hist,  # Gradient features
            color_hist,  # Color features
            motion_features,  # Motion features
            [np.mean(edges)/255.0, np.std(edges)/255.0]  # Edge statistics
        ])

        return combined_features

    def process_video(self, video_path, technique_label, sample_rate=15, debug_mode=False):
        """
        Extract features from video file

        Args:
            video_path: Path to the video file
            technique_label: Label for the volleyball technique
            sample_rate: Process every Nth frame
            debug_mode: If True, show detailed debugging information
        """
        features = []
        debug_frames = [30, 60, 90] if debug_mode else []

        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                print(f"Error: Could not open video file {video_path}")
                return features

            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_count = 0

            print(f"\nProcessing video: {os.path.basename(video_path)}")
            print(f"Total frames: {total_frames}")

            prev_frame = None
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_count % sample_rate == 0:
                    try:
                        # Extract features from the frame
                        frame_features = self.extract_features(frame)

                        features.append({
                            'features': frame_features,
                            'technique': technique_label,
                            'frame': frame_count
                        })

                        # Visualize for debug frames
                        if frame_count in debug_frames:
                            self.visualize_frame(frame, frame_count)

                    except Exception as e:
                        print(f"Error processing frame {frame_count}: {str(e)}")
                        continue

                frame_count += 1
                prev_frame = frame.copy()

                if frame_count % 30 == 0:
                    print(f"Processed {frame_count}/{total_frames} frames", end='\r')

            cap.release()
            print(f"\nExtracted {len(features)} feature sets from {os.path.basename(video_path)}")

        except Exception as e:
            print(f"Error processing video {video_path}: {str(e)}")

        return features

    def create_dataset(self, video_paths_and_labels, min_frames_per_video=5):
        """
        Create dataset from multiple videos

        Args:
            video_paths_and_labels: List of (video_path, label) tuples
            min_frames_per_video: Minimum frames required for a video to be included
        """
        all_features = []
        video_success_count = 0

        for video_path, label in video_paths_and_labels:
            try:
                video_features = self.process_video(video_path, label)
                if len(video_features) >= min_frames_per_video:
                    all_features.extend(video_features)
                    video_success_count += 1
                    print(f"Successfully added {len(video_features)} frames from {os.path.basename(video_path)}")
                else:
                    print(f"Skipping {os.path.basename(video_path)} - only {len(video_features)} valid frames found (min: {min_frames_per_video})")
            except Exception as e:
                print(f"Error processing video {video_path}: {str(e)}")
                continue

        if not all_features:
            print("\nWARNING: No valid features were extracted from any video")
            print("Creating synthetic data for testing the pipeline")
            all_features = self.create_synthetic_dataset(video_paths_and_labels)

        # Convert to numpy arrays
        X = np.array([f['features'] for f in all_features])
        y_raw = np.array([f['technique'] for f in all_features])

        # Encode labels
        y = self.label_encoder.fit_transform(y_raw)

        print(f"\nDataset creation complete:")
        print(f"- Total samples: {len(X)}")
        print(f"- Input shape: {X.shape}")
        print(f"- Videos successfully processed: {video_success_count}/{len(video_paths_and_labels)}")
        print("\nTechnique distribution:")
        for i, technique in enumerate(self.label_encoder.classes_):
            count = np.sum(y == i)
            print(f"- {technique}: {count} samples")

        return X, y

    def create_synthetic_dataset(self, video_paths_and_labels, samples_per_class=20):
        """
        Create synthetic feature data for testing when real data extraction fails
        """
        synthetic_features = []
        labels = [label for _, label in video_paths_and_labels]
        unique_labels = list(set(labels))

        print(f"Creating synthetic data with {samples_per_class} samples per class")

        # Our feature vector length (same as extract_features output)
        feature_length = 9 + 64 + 5 + 2  # gradient + color + motion + edge features

        for label in unique_labels:
            for i in range(samples_per_class):
                # Create synthetic features
                features = np.random.rand(feature_length)

                synthetic_features.append({
                    'features': features,
                    'technique': label,
                    'frame': i
                })

        print(f"Created {len(synthetic_features)} synthetic samples across {len(unique_labels)} classes")
        return synthetic_features

# Modified model creation function for TensorFlow.js compatibility
def create_volleyball_classification_model(input_dim, num_classes):
    """
    Create a classification model for volleyball techniques based on frame features
    This version is designed to be compatible with TensorFlow.js
    
    Args:
        input_dim: Number of input features
        num_classes: Number of classes to predict
    """
    # Create a sequential model with explicit input shape
    model = tf.keras.Sequential([
        # Input layer with explicit shape - critical for TensorFlow.js compatibility
        tf.keras.layers.InputLayer(input_shape=(input_dim,), name='input_layer'),
        
        # First dense layer
        tf.keras.layers.Dense(128, activation='relu', name='dense_1'),
        tf.keras.layers.Dropout(0.4, name='dropout_1'),
        
        # Second dense layer
        tf.keras.layers.Dense(64, activation='relu', name='dense_2'),
        tf.keras.layers.Dropout(0.3, name='dropout_2'),
        
        # Third dense layer
        tf.keras.layers.Dense(32, activation='relu', name='dense_3'),
        tf.keras.layers.Dropout(0.2, name='dropout_3'),
        
        # Output layer
        tf.keras.layers.Dense(num_classes, activation='softmax', name='output')
    ])
    
    # Print model summary to verify the architecture
    model.summary()
    
    return model

def handle_class_imbalance(X, y):
    """
    Handle class imbalance through either oversampling or class weighting
    """
    from collections import Counter

    # Count class frequencies
    class_counts = Counter(y)
    print("\nClass distribution before balancing:")
    for class_idx, count in sorted(class_counts.items()):
        print(f"- Class {class_idx}: {count} samples")

    # If severe imbalance (classes with < 20 samples)
    min_samples = min(class_counts.values())
    if min_samples < 20:
        print("\nDetected class imbalance, applying data augmentation for minority classes")

        # Simple oversampling for minority classes
        X_balanced = []
        y_balanced = []

        # Set a minimum target count for each class
        target_count = max(20, min(100, max(class_counts.values()) // 2))

        for class_idx, count in class_counts.items():
            # Get indices for this class
            indices = np.where(y == class_idx)[0]

            # If we need to oversample
            if count < target_count:
                # Add all original samples
                X_balanced.append(X[indices])
                y_balanced.append(y[indices])

                # Calculate how many additional samples we need
                needed = target_count - count

                # Create augmented samples by adding small random noise
                for _ in range(needed):
                    # Randomly select a sample to augment
                    idx = np.random.choice(indices)

                    # Create augmented sample with small noise
                    augmented = X[idx] + np.random.normal(0, 0.05, size=X[idx].shape)

                    X_balanced.append(augmented.reshape(1, -1))
                    y_balanced.append(np.array([class_idx]))
            else:
                # Just add the original samples for well-represented classes
                X_balanced.append(X[indices])
                y_balanced.append(y[indices])

        # Combine all arrays
        X_balanced = np.vstack(X_balanced)
        y_balanced = np.concatenate(y_balanced)

        print("\nClass distribution after balancing:")
        balanced_counts = Counter(y_balanced)
        for class_idx, count in sorted(balanced_counts.items()):
            print(f"- Class {class_idx}: {count} samples")

        return X_balanced, y_balanced

    else:
        print("\nClass distribution is acceptable, no balancing needed")
        return X, y

def main():
    # Your video data
    video_data = [
        ('/content/drive/MyDrive/volleyball/jump rhythm using sound of hand.MOV', 'jump_training'),
        ('/content/drive/MyDrive/volleyball/power hitting.MOV', 'power_hitting'),
        ('/content/drive/MyDrive/volleyball/serve-pass.MOV', 'serve_pass'),
        ('/content/drive/MyDrive/volleyball/transitions.MOV', 'transition'),
        ('/content/drive/MyDrive/volleyball/transition.MOV', 'transition'),
        ('/content/drive/MyDrive/volleyball/transition offence.MOV', 'transition_offense'),
        ('/content/drive/MyDrive/volleyball/offence defense transition.MOV', 'offense_defense_transition'),
        ('/content/drive/MyDrive/volleyball/attack tempo.MOV', 'attack_tempo'),
        ('/content/drive/MyDrive/volleyball/back attack and defence.MOV', 'back_attack_defense'),
        ('/content/drive/MyDrive/volleyball/individual defence.MOV', 'individual_defense'),
        ('/content/drive/MyDrive/volleyball/defence-set-attack.MOV', 'defense_set_attack'),
        ('/content/drive/MyDrive/volleyball/cooperative drill with focus on communication.MOV', 'team_communication')
    ]

    print("Starting volleyball technique classification pipeline")

    # Create dataset using frame-based features instead of pose estimation
    dataset = VolleyballFrameDataset()
    X, y = dataset.create_dataset(video_data, min_frames_per_video=5)

    # Handle class imbalance
    X, y = handle_class_imbalance(X, y)

    # Split data
    X_train, X_val, y_train, y_val = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    # Create and train model - Fixed input shape handling
    num_classes = len(np.unique(y))
    input_dim = X.shape[1]  # This gives the number of features

    print(f"\nModel configuration:")
    print(f"- Input dimension: {input_dim}")
    print(f"- Number of classes: {num_classes}")

    model = create_volleyball_classification_model(input_dim, num_classes)

    # Configure training with class weighting
    from sklearn.utils.class_weight import compute_class_weight
    class_weights = compute_class_weight(
        class_weight='balanced',
        classes=np.unique(y_train),
        y=y_train
    )
    class_weight_dict = {i: weight for i, weight in enumerate(class_weights)}

    print("\nClass weights for training:")
    for class_idx, weight in class_weight_dict.items():
        print(f"- Class {class_idx}: {weight:.2f}")

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    # Add callbacks
    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=15,
            restore_best_weights=True,
            verbose=1
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=7,
            verbose=1
        )
    ]

    # Train model
    history = model.fit(
        X_train, y_train,
        epochs=100,  # Increase epochs, early stopping will prevent overfitting
        batch_size=32,
        validation_data=(X_val, y_val),
        callbacks=callbacks,
        class_weight=class_weight_dict,
        verbose=1
    )

    # Plot training results
    plt.figure(figsize=(15, 5))
    plt.subplot(1, 2, 1)
    plt.plot(history.history['loss'], label='Training Loss')
    plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.title('Model Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()

    plt.subplot(1, 2, 2)
    plt.plot(history.history['accuracy'], label='Training Accuracy')
    plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
    plt.title('Model Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.legend()
    plt.show()

    # Evaluate model
    print("\nEvaluating model...")
    test_loss, test_acc = model.evaluate(X_val, y_val)
    print(f"Test accuracy: {test_acc:.4f}")

    y_pred = np.argmax(model.predict(X_val), axis=1)

    # Display confusion matrix
    from sklearn.metrics import confusion_matrix, classification_report
    import seaborn as sns

    plt.figure(figsize=(12, 10))
    cm = confusion_matrix(y_val, y_pred)

    # Create a heatmap with percentage values
    cm_percent = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis] * 100

    # Plot the confusion matrix
    ax = sns.heatmap(
        cm, annot=True, fmt='d', cmap='Blues',
        xticklabels=dataset.label_encoder.classes_,
        yticklabels=dataset.label_encoder.classes_
    )
    plt.title('Confusion Matrix')
    plt.xlabel('Predicted')
    plt.ylabel('True')

    # Rotate axis labels for better readability
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")
    plt.setp(ax.get_yticklabels(), rotation=0)

    plt.tight_layout()
    plt.show()

    # Print classification report
    print("\nClassification Report:")
    print(classification_report(y_val, y_pred, target_names=dataset.label_encoder.classes_))

    # Create a more detailed accuracy visualization per class
    plt.figure(figsize=(12, 6))
    class_accuracies = []
    for i, label in enumerate(dataset.label_encoder.classes_):
        idx = (y_val == i)
        if np.any(idx):
            accuracy = np.mean(y_pred[idx] == y_val[idx])
            class_accuracies.append((label, accuracy))

    # Sort by accuracy
    class_accuracies.sort(key=lambda x: x[1])

    # Plot
    labels, accs = zip(*class_accuracies)
    plt.barh(labels, accs, color='skyblue')
    plt.xlabel('Accuracy')
    plt.title('Classification Accuracy by Technique')
    plt.xlim(0, 1.0)

    # Add value labels
    for i, v in enumerate(accs):
        plt.text(v + 0.01, i, f"{v:.2f}", va='center')

    plt.tight_layout()
    plt.show()

    # Save model in Keras format
    model.save('volleyball_technique_model.keras')

    # Save label mapping
    label_mapping = {int(i): label for i, label in enumerate(dataset.label_encoder.classes_)}
    with open('volleyball_technique_labels.json', 'w') as f:
        json.dump(label_mapping, f)

    # Save to Drive
    !cp volleyball_technique_model.keras /content/drive/MyDrive/
    !cp volleyball_technique_labels.json /content/drive/MyDrive/

    # Save model in TensorFlow.js format
    tfjs_target_dir = 'web_model'
    print("\nSaving model in TensorFlow.js format...")
    
    # Make sure the directory exists
    !mkdir -p {tfjs_target_dir}
    
    # Save the model using tensorflowjs_converter
    # This approach uses the command line tool which is more reliable
    !tensorflowjs_converter \
        --input_format=keras \
        volleyball_technique_model.keras \
        {tfjs_target_dir}
    
    # Also save the labels in the web_model directory
    with open(f'{tfjs_target_dir}/labels.json', 'w') as f:
        json.dump(label_mapping, f)
    
    # Verify the files were created
    print("\nVerifying TensorFlow.js model files:")
    !ls -la {tfjs_target_dir}
    
    # Copy TensorFlow.js model to Drive
    !cp -r {tfjs_target_dir}/* /content/drive/MyDrive/web_model/
    
    # Verify the files were copied
    print("\nVerifying files in Drive:")
    !ls -la /content/drive/MyDrive/web_model/

    # Create a simple HTML example to test the model
    html_example = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Volleyball Technique Classifier</title>
        <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0"></script>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .container { background-color: #f5f9fc; padding: 20px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .status { margin: 15px 0; padding: 10px; background-color: rgba(52, 152, 219, 0.1); border-left: 4px solid #3498db; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Volleyball Technique Classifier</h1>
            <div class="status" id="status">Loading model...</div>
            <button id="testButton">Test Model</button>
            <div id="result"></div>
        </div>
        
        <script>
            // Load the model
            async function loadModel() {
                try {
                    const model = await tf.loadLayersModel('web_model/model.json');
                    document.getElementById('status').textContent = 'Model loaded successfully!';
                    return model;
                } catch (error) {
                    console.error('Error loading model:', error);
                    document.getElementById('status').textContent = 'Error loading model: ' + error.message;
                    return null;
                }
            }
            
            // Load labels
            async function loadLabels() {
                try {
                    const response = await fetch('web_model/labels.json');
                    const labels = await response.json();
                    return labels;
                } catch (error) {
                    console.error('Error loading labels:', error);
                    return null;
                }
            }
            
            // Test the model with random input
            async function testModel() {
                const model = await loadModel();
                const labels = await loadLabels();
                
                if (!model || !labels) {
                    document.getElementById('result').textContent = 'Model or labels not loaded';
                    return;
                }
                
                // Create a random input tensor with the correct shape
                const inputDim = model.inputs[0].shape[1];
                const randomInput = tf.randomNormal([1, inputDim]);
                
                // Make a prediction
                const prediction = model.predict(randomInput);
                const predictionData = await prediction.data();
                
                // Get the class with highest probability
                let maxProb = 0;
                let maxIndex = 0;
                
                for (let i = 0; i < predictionData.length; i++) {
                    if (predictionData[i] > maxProb) {
                        maxProb = predictionData[i];
                        maxIndex = i;
                    }
                }
                
                // Display the result
                const resultElement = document.getElementById('result');
                resultElement.innerHTML = `
                    <h3>Test Prediction</h3>
                    <p>Input shape: [1, ${inputDim}]</p>
                    <p>Predicted class: ${labels[maxIndex]} (${(maxProb * 100).toFixed(2)}%)</p>
                    <h4>All Probabilities:</h4>
                    <ul>
                        ${Object.entries(labels).map(([idx, label]) => 
                            `<li>${label}: ${(predictionData[idx] * 100).toFixed(2)}%</li>`
                        ).join('')}
                    </ul>
                `;
                
                // Clean up tensors
                randomInput.dispose();
                prediction.dispose();
            }
            
            // Set up event listener
            document.getElementById('testButton').addEventListener('click', testModel);
            
            // Initialize
            loadModel();
            loadLabels();
        </script>
    </body>
    </html>
    """
    
    # Save the HTML example
    with open('example.html', 'w') as f:
        f.write(html_example)
    
    # Copy to Drive
    !cp example.html /content/drive/MyDrive/web_model/
    
    print("\nModel, labels, and example HTML saved to Drive")
    print("Pipeline completed successfully!")

if __name__ == "__main__":
    main() 