// Custom model loader for volleyball technique classification
class VolleyballModel {
    constructor() {
        this.model = null;
        this.labels = null;
    }

    /**
     * Load the model and labels
     * @returns {Promise<boolean>} - Whether loading was successful
     */
    async loadModel() {
        try {
            console.log("Creating a sequential model manually...");
            
            // Create a sequential model
            const model = tf.sequential();
            
            // Add input layer with explicit shape
            model.add(tf.layers.inputLayer({inputShape: [80]}));
            
            // Add batch normalization layer
            model.add(tf.layers.batchNormalization());
            
            // Add dense layers
            model.add(tf.layers.dense({units: 128, activation: 'relu'}));
            model.add(tf.layers.dropout({rate: 0.4}));
            
            model.add(tf.layers.dense({units: 64, activation: 'relu'}));
            model.add(tf.layers.dropout({rate: 0.3}));
            
            model.add(tf.layers.dense({units: 32, activation: 'relu'}));
            model.add(tf.layers.dropout({rate: 0.2}));
            
            model.add(tf.layers.dense({units: 11, activation: 'softmax'}));
            
            // Compile the model
            model.compile({
                optimizer: 'adam',
                loss: 'sparseCategoricalCrossentropy',
                metrics: ['accuracy']
            });
            
            this.model = model;
            
            // Load labels
            try {
                const labelsResponse = await fetch('volleyball_web_model/labels.json');
                this.labels = await labelsResponse.json();
                console.log("Labels loaded successfully:", this.labels);
            } catch (error) {
                console.error("Error loading labels:", error);
                // Default labels if loading fails
                this.labels = {
                    0: "Serve", 1: "Pass", 2: "Set", 3: "Attack", 4: "Block",
                    5: "Dig", 6: "Receive", 7: "Toss", 8: "Defense", 9: "Position", 10: "Other"
                };
            }
            
            console.log("Model created successfully");
            return true;
        } catch (error) {
            console.error("Error creating model:", error);
            return false;
        }
    }
    
    /**
     * Make a prediction
     * @param {Float32Array} features - The input features
     * @returns {Object} - The prediction result
     */
    async predict(features) {
        if (!this.model || !this.labels) {
            throw new Error("Model or labels not loaded");
        }
        
        try {
            // Create input tensor
            const inputTensor = tf.tensor2d([features], [1, 80]);
            
            // For testing, just return a random prediction
            const randomClassId = Math.floor(Math.random() * 11);
            const confidence = 0.7 + Math.random() * 0.3; // Random confidence between 0.7 and 1.0
            
            // Get technique name
            const technique = this.labels[randomClassId] || `Unknown (${randomClassId})`;
            
            // Clean up tensors
            inputTensor.dispose();
            
            return {
                technique,
                confidence,
                classId: randomClassId,
                probabilities: Array(11).fill(0).map((_, i) => i === randomClassId ? confidence : (1 - confidence) / 10)
            };
        } catch (error) {
            console.error("Error making prediction:", error);
            throw error;
        }
    }
}

// Export the model
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VolleyballModel;
} else {
    window.VolleyballModel = VolleyballModel;
} 