// Feature extraction utilities for volleyball technique classification
class FeatureExtractor {
    constructor() {
        // Initialize any required variables
    }

    /**
     * Extract features from a video frame
     * @param {HTMLVideoElement|HTMLCanvasElement|ImageData} frame - The input frame
     * @returns {Float32Array} - 80-dimensional feature vector
     */
    async extractFeatures(frame) {
        return new Promise((resolve) => {
            tf.tidy(() => {
                try {
                    // Convert frame to tensor and normalize
                    const tensor = tf.browser.fromPixels(frame);
                    const resized = tf.image.resizeBilinear(tensor, [128, 128]);
                    
                    // Convert to grayscale (0.299R + 0.587G + 0.114B)
                    const rgb = tf.split(resized, 3, 2);
                    const gray = tf.add(
                        tf.add(
                            tf.mul(rgb[0], 0.299),
                            tf.mul(rgb[1], 0.587)
                        ),
                        tf.mul(rgb[2], 0.114)
                    );
                    
                    // Prepare gray image for convolution (add batch and channel dimensions)
                    const grayForConv = gray.expandDims(0).expandDims(-1);
                    
                    // Extract edges using Sobel - simplified approach
                    // Create horizontal and vertical Sobel filters
                    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
                    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
                    
                    // Apply filters manually using tf.conv2d
                    const sobelXFilter = tf.tensor4d(
                        sobelX.map(row => row.map(val => [val])),
                        [3, 3, 1, 1]
                    );
                    
                    const sobelYFilter = tf.tensor4d(
                        sobelY.map(row => row.map(val => [val])),
                        [3, 3, 1, 1]
                    );
                    
                    const gx = tf.conv2d(grayForConv, sobelXFilter, 1, 'same').squeeze();
                    const gy = tf.conv2d(grayForConv, sobelYFilter, 1, 'same').squeeze();
                    
                    // Calculate gradient magnitude and angle
                    const mag = tf.sqrt(tf.add(tf.square(gx), tf.square(gy)));
                    const ang = tf.atan2(gy, gx);
                    
                    // Calculate gradient histogram (9 bins)
                    const bins = 9;
                    const hist = new Float32Array(bins);
                    const magData = mag.dataSync();
                    const angData = ang.dataSync();
                    const binSize = (2 * Math.PI) / bins;
                    
                    for (let i = 0; i < magData.length; i++) {
                        // Normalize angle to [0, 2π]
                        let angle = angData[i];
                        if (angle < 0) angle += 2 * Math.PI;
                        
                        const binIndex = Math.floor(angle / binSize);
                        hist[binIndex >= bins ? bins - 1 : binIndex] += magData[i];
                    }
                    
                    // Normalize histogram
                    const histSum = hist.reduce((a, b) => a + b, 0);
                    if (histSum > 0) {
                        for (let i = 0; i < bins; i++) {
                            hist[i] /= histSum;
                        }
                    }
                    
                    // Calculate color histogram (8x8 bins for H and S channels)
                    const hsv = tf.image.rgbToHsv(resized);
                    const [h, s, _] = tf.split(hsv, 3, 2);
                    
                    const hBins = 8;
                    const sBins = 8;
                    const colorHist = new Float32Array(hBins * sBins);
                    
                    const hData = h.dataSync();
                    const sData = s.dataSync();
                    const hBinSize = 1.0 / hBins;
                    const sBinSize = 1.0 / sBins;
                    
                    for (let i = 0; i < hData.length; i++) {
                        const hBin = Math.min(Math.floor(hData[i] / hBinSize), hBins - 1);
                        const sBin = Math.min(Math.floor(sData[i] / sBinSize), sBins - 1);
                        const index = hBin * sBins + sBin;
                        colorHist[index]++;
                    }
                    
                    // Normalize color histogram
                    const colorHistSum = colorHist.reduce((a, b) => a + b, 0);
                    if (colorHistSum > 0) {
                        for (let i = 0; i < colorHist.length; i++) {
                            colorHist[i] /= colorHistSum;
                        }
                    }
                    
                    // Calculate edge statistics
                    const edges = tf.abs(gx).add(tf.abs(gy));
                    const edgesMean = edges.mean().dataSync()[0] / 255.0;
                    const edgesStd = edges.sub(edges.mean()).square().mean().sqrt().dataSync()[0] / 255.0;
                    
                    // Motion features (placeholder - would need frame history for actual implementation)
                    const motionFeatures = new Float32Array(5).fill(0);
                    
                    // Combine all features - ensure exactly 80 dimensions
                    const features = new Float32Array(80);
                    let offset = 0;
                    
                    // Copy gradient histogram (9 values)
                    features.set(hist, offset);
                    offset += hist.length;
                    
                    // Copy color histogram (64 values)
                    features.set(colorHist, offset);
                    offset += colorHist.length;
                    
                    // Copy edge statistics (2 values)
                    features.set([edgesMean, edgesStd], offset);
                    offset += 2;
                    
                    // Copy motion features (5 values) - fill remaining space
                    features.set(motionFeatures, offset);
                    
                    // Verify we have exactly 80 features
                    console.log("Feature vector length:", features.length);
                    
                    resolve(features);
                } catch (error) {
                    console.error("Error extracting features:", error);
                    // Return zeros if there's an error
                    resolve(new Float32Array(80).fill(0));
                }
            });
        });
    }
}

// Export the feature extractor
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeatureExtractor;
} else {
    window.FeatureExtractor = FeatureExtractor;
} 