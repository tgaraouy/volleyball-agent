import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

class PoseAnalysisService {
    constructor() {
        this.detector = null;
        this.techniqueModel = null;
        this.labelMapping = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            await tf.ready();
            
            // Load MoveNet Thunder model
            const model = poseDetection.SupportedModels.MoveNet;
            const detectorConfig = {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
                enableSmoothing: true,
                minPoseScore: 0.15,
                modelUrl: undefined
            };
            this.detector = await poseDetection.createDetector(model, detectorConfig);
            
            // Load custom volleyball technique model
            try {
                this.techniqueModel = await tf.loadGraphModel('/volleyball_pose_model/model.json');
                const response = await fetch('/volleyball_pose_model/labels.json');
                this.labelMapping = await response.json();
                console.log('Volleyball technique classification model loaded successfully');
            } catch (modelError) {
                console.error('Error loading technique model:', modelError);
                // Continue without technique classification
            }
            
            this.isInitialized = true;
            console.log('MoveNet Thunder pose detection model loaded successfully');
        } catch (error) {
            console.error('Error initializing pose detection:', error);
            throw error;
        }
    }

    async analyzePose(videoElement, drillId = null) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Detect poses
            const poses = await this.detector.estimatePoses(videoElement, {
                maxPoses: 1,
                flipHorizontal: false
            });
            
            if (!poses || poses.length === 0) {
                return {
                    formScore: 0,
                    observations: ['No pose detected'],
                    recommendations: ['Please ensure you are visible in the frame']
                };
            }

            const pose = poses[0];
            if (pose.score < 0.25) {
                return {
                    formScore: 0,
                    observations: ['Low confidence in pose detection'],
                    recommendations: ['Please ensure better lighting and that your full body is visible']
                };
            }

            const metrics = this.measurePoseMetrics(pose.keypoints);
            const analysis = this.analyzeForm(metrics, drillId);

            // Add technique classification if model is available
            if (this.techniqueModel && pose.keypoints) {
                try {
                    const techniqueResult = await this.classifyTechnique(pose.keypoints);
                    analysis.techniqueClassification = techniqueResult;
                } catch (classifyError) {
                    console.error('Error classifying technique:', classifyError);
                }
            }

            return analysis;
        } catch (error) {
            console.error('Error analyzing pose:', error);
            throw error;
        }
    }

    async classifyTechnique(keypoints) {
        // Format keypoints to match training data format
        const input = tf.tidy(() => {
            // Flatten keypoints to match model input shape [1, 17, 3]
            const flatKeypoints = keypoints.map(kp => [kp.x, kp.y, kp.score || 0]);
            return tf.tensor(flatKeypoints).expandDims(0);
        });

        try {
            // Get model prediction
            const prediction = await this.techniqueModel.predict(input).array();
            input.dispose();

            // Get top technique
            const scores = prediction[0];
            const topIndex = scores.indexOf(Math.max(...scores));
            const technique = this.labelMapping[topIndex];
            const confidence = scores[topIndex];

            return {
                technique,
                confidence,
                allScores: Object.fromEntries(
                    Object.entries(this.labelMapping).map(([idx, label]) => [
                        label,
                        scores[parseInt(idx)]
                    ])
                )
            };
        } finally {
            input.dispose();
        }
    }

    calculateAngle(p1, p2, p3) {
        if (!p1 || !p2 || !p3) return 0;
        
        const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) -
                       Math.atan2(p1.y - p2.y, p1.x - p2.x);
        let angle = Math.abs(radians * 180.0 / Math.PI);
        if (angle > 180.0) angle = 360 - angle;
        return angle;
    }

    measurePoseMetrics(keypoints) {
        // Important keypoints for volleyball (matching Python implementation)
        const importantIndices = {
            shoulders: [5, 6],
            elbows: [7, 8],
            wrists: [9, 10],
            hips: [11, 12],
            knees: [13, 14],
            ankles: [15, 16]
        };

        // Calculate confidence for each body part
        const confidences = {};
        for (const [part, indices] of Object.entries(importantIndices)) {
            confidences[part] = indices.reduce((sum, idx) => sum + (keypoints[idx]?.score || 0), 0) / indices.length;
        }

        // Calculate overall confidence
        const avgConfidence = Object.values(confidences).reduce((sum, conf) => sum + conf, 0) / Object.keys(confidences).length;

        // Map keypoint indices to body parts (same as Python)
        const keypointMap = {
            nose: keypoints[0],
            leftShoulder: keypoints[5],
            rightShoulder: keypoints[6],
            leftElbow: keypoints[7],
            rightElbow: keypoints[8],
            leftWrist: keypoints[9],
            rightWrist: keypoints[10],
            leftHip: keypoints[11],
            rightHip: keypoints[12],
            leftKnee: keypoints[13],
            rightKnee: keypoints[14],
            leftAnkle: keypoints[15],
            rightAnkle: keypoints[16],
        };

        return {
            // Arm platform angle (for passing)
            armPlatformAngle: this.calculateAngle(
                keypointMap.leftWrist,
                keypointMap.leftElbow,
                keypointMap.rightElbow
            ),

            // Elbow angles (for setting)
            leftElbowAngle: this.calculateAngle(
                keypointMap.leftShoulder,
                keypointMap.leftElbow,
                keypointMap.leftWrist
            ),
            rightElbowAngle: this.calculateAngle(
                keypointMap.rightShoulder,
                keypointMap.rightElbow,
                keypointMap.rightWrist
            ),

            // Knee flexion
            leftKneeFlexion: this.calculateAngle(
                keypointMap.leftHip,
                keypointMap.leftKnee,
                keypointMap.leftAnkle
            ),
            rightKneeFlexion: this.calculateAngle(
                keypointMap.rightHip,
                keypointMap.rightKnee,
                keypointMap.rightAnkle
            ),

            // Alignment metrics
            hipAlignment: Math.abs(keypointMap.leftHip.y - keypointMap.rightHip.y),
            shoulderAlignment: Math.abs(keypointMap.leftShoulder.y - keypointMap.rightShoulder.y),

            // Additional metrics
            heightRatio: (keypointMap.leftHip.y + keypointMap.rightHip.y) / 2,
            footSpacing: Math.abs(keypointMap.leftAnkle.x - keypointMap.rightAnkle.x) /
                        Math.abs(keypointMap.leftShoulder.x - keypointMap.rightShoulder.x),

            // Part-specific confidences
            confidences,
            avgConfidence
        };
    }

    analyzeForm(metrics, drillId = null) {
        // Only analyze if we have good confidence in the pose detection
        if (metrics.avgConfidence < 0.15) { // Match Python threshold
            return {
                formScore: 0,
                observations: ['Pose detection confidence too low'],
                recommendations: ['Please ensure better lighting and full body visibility'],
                confidences: metrics.confidences // Include confidence scores for debugging
            };
        }

        const observations = [];
        const recommendations = [];

        // Basic form checks (with confidence weighting)
        if (metrics.armPlatformAngle < 160 && metrics.confidences.wrists > 0.15) {
            observations.push('Arms not forming a flat platform');
            recommendations.push('Keep your arms straighter when creating the platform');
        }

        if (metrics.hipAlignment > 0.1 && metrics.confidences.hips > 0.15) {
            observations.push('Hips not level');
            recommendations.push('Keep your hips level and square to the target');
        }

        if (metrics.shoulderAlignment > 0.1 && metrics.confidences.shoulders > 0.15) {
            observations.push('Shoulders not level');
            recommendations.push('Maintain level shoulders throughout the movement');
        }

        const avgKneeFlexion = (metrics.leftKneeFlexion + metrics.rightKneeFlexion) / 2;
        if (avgKneeFlexion < 20 && metrics.confidences.knees > 0.15) {
            observations.push('Need more knee bend');
            recommendations.push('Bend your knees more to maintain an athletic position');
        }

        if (metrics.footSpacing < 1.0 && metrics.confidences.ankles > 0.15) {
            observations.push('Feet too close together');
            recommendations.push('Keep feet shoulder-width apart for better balance');
        }

        // Calculate form score based on metrics and confidence
        const formScore = this.calculateFormScore(metrics);

        return {
            formScore,
            observations: observations.length > 0 ? observations : ['Good form!'],
            recommendations: recommendations.length > 0 ? recommendations : ['Keep up the good work!'],
            confidences: metrics.confidences, // Include confidence scores for debugging
            metrics // Include raw metrics for detailed analysis
        };
    }

    calculateFormScore(metrics) {
        if (metrics.avgConfidence < 0.15) return 0;

        // Convert metrics to scores (0-1)
        const platformScore = Math.max(0, Math.min(1, metrics.armPlatformAngle / 180));
        const hipScore = Math.max(0, 1 - metrics.hipAlignment * 10);
        const shoulderScore = Math.max(0, 1 - metrics.shoulderAlignment * 10);
        const kneeScore = Math.max(0, Math.min(1, 
            ((metrics.leftKneeFlexion + metrics.rightKneeFlexion) / 2) / 90));
        const footScore = Math.max(0, Math.min(1, metrics.footSpacing));

        // Weight the scores
        const weightedScore = (
            platformScore * 0.3 +
            hipScore * 0.2 +
            shoulderScore * 0.2 +
            kneeScore * 0.2 +
            footScore * 0.1
        ) * metrics.avgConfidence; // Scale by confidence

        // Convert to 0-10 scale
        return Math.round(weightedScore * 10);
    }

    dispose() {
        if (this.detector) {
            this.detector.dispose();
        }
    }
}

export default new PoseAnalysisService(); 