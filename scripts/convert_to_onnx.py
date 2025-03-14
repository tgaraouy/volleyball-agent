import tensorflow as tf
import tf2onnx
import json
import os

def convert_model():
    # Load the model from the TensorFlow.js format
    model_dir = os.path.join('model', 'volleyball_pose_model', 'web_model')
    model = tf.saved_model.load(model_dir)
    
    # Convert the model to ONNX format
    output_path = os.path.join('server', 'src', 'models', 'volleyball_analysis.onnx')
    
    # Convert to ONNX
    spec = (tf.TensorSpec((None, 17, 3), tf.float32, name="input"),)
    output_path = tf2onnx.convert.from_keras(model, input_signature=spec, output_path=output_path)
    
    print(f"Model converted and saved to {output_path}")

if __name__ == "__main__":
    convert_model() 