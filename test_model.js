// Test script for volleyball model loading
async function testModel() {
    try {
        console.log("Loading model...");
        const model = await tf.loadLayersModel('volleyball_web_model/model.json');
        console.log("Model loaded successfully!");
        
        // Log model information
        console.log("Model summary:");
        model.summary();
        
        console.log("Input shape:", model.inputs[0].shape);
        console.log("Output shape:", model.outputs[0].shape);
        
        // Create a random input tensor with the correct shape
        const randomInput = tf.randomNormal([1, 80]);
        console.log("Making prediction with random data...");
        
        // Make a prediction
        const prediction = await model.predict(randomInput);
        const predictionData = await prediction.data();
        console.log("Prediction result:", predictionData);
        
        // Clean up
        randomInput.dispose();
        prediction.dispose();
        
        console.log("Test completed successfully!");
        return true;
    } catch (error) {
        console.error("Error testing model:", error);
        return false;
    }
}

// Run the test when the script is loaded
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        const resultElement = document.createElement('div');
        resultElement.style.padding = '20px';
        resultElement.style.fontFamily = 'Arial, sans-serif';
        resultElement.innerHTML = '<h2>Testing Volleyball Model...</h2>';
        document.body.appendChild(resultElement);
        
        testModel().then(success => {
            if (success) {
                resultElement.innerHTML += '<p style="color: green">✓ Model loaded and tested successfully!</p>';
            } else {
                resultElement.innerHTML += '<p style="color: red">✗ Model test failed. Check console for details.</p>';
            }
        });
    });
} 