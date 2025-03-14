import React, { useState, useRef, useEffect } from 'react';
import { CameraIcon, StopIcon, ExclamationTriangleIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import PoseAnalysisService from '../services/PoseAnalysisService';

const TechniqueAnalyzer = ({ drillId, onAnalysisComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [stream, setStream] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [realtimeFeedback, setRealtimeFeedback] = useState(null);
    const [cameraError, setCameraError] = useState(null);
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const frameIntervalRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        // Initialize pose detection service
        PoseAnalysisService.initialize().catch(console.error);

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
            }
            PoseAnalysisService.dispose();
        };
    }, [stream]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setCameraError(null);
        } catch (error) {
            console.error('Error accessing camera:', error);
            setCameraError(
                error.name === 'NotFoundError' 
                    ? 'No camera detected on your device. Please upload a video instead.'
                    : error.name === 'NotAllowedError'
                    ? 'Camera access was denied. Please check your permissions or upload a video instead.'
                    : 'Unable to access camera. Please try uploading a video instead.'
            );
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('video/')) {
            alert('Please upload a video file');
            return;
        }

        setIsAnalyzing(true);
        try {
            const videoElement = document.createElement('video');
            videoElement.src = URL.createObjectURL(file);
            await videoElement.play();

            // Analyze multiple frames from the video
            const analyses = [];
            const duration = videoElement.duration;
            const interval = duration / 10; // Analyze 10 frames throughout the video

            for (let time = 0; time < duration; time += interval) {
                videoElement.currentTime = time;
                await new Promise(resolve => setTimeout(resolve, 100)); // Wait for frame to load
                const analysis = await PoseAnalysisService.analyzePose(videoElement);
                analyses.push(analysis);
            }

            // Aggregate the analyses
            const result = aggregateAnalyses(analyses);
            setAnalysisResult(result);
            onAnalysisComplete?.(result);

            // Clean up
            URL.revokeObjectURL(videoElement.src);
        } catch (error) {
            console.error('Error analyzing video:', error);
            alert('Failed to analyze video. Please try again.');
        } finally {
            setIsAnalyzing(false);
            event.target.value = ''; // Reset file input
        }
    };

    const startRecording = () => {
        if (!stream) return;

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            await analyzeVideo(blob);
        };

        // Start real-time frame analysis
        frameIntervalRef.current = setInterval(captureAndAnalyzeFrame, 1000); // Analyze every second

        mediaRecorder.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
            }
        }
    };

    const captureAndAnalyzeFrame = async () => {
        if (!videoRef.current) return;

        try {
            const analysis = await PoseAnalysisService.analyzePose(videoRef.current);
            setRealtimeFeedback(analysis);
        } catch (error) {
            console.error('Error analyzing frame:', error);
        }
    };

    const analyzeVideo = async (videoBlob) => {
        setIsAnalyzing(true);
        try {
            // Create a video element to analyze the recorded video
            const videoElement = document.createElement('video');
            videoElement.src = URL.createObjectURL(videoBlob);
            
            // Wait for video metadata to load
            await new Promise((resolve) => {
                videoElement.onloadedmetadata = resolve;
                videoElement.onerror = (e) => {
                    console.error('Error loading video:', e);
                    throw new Error('Failed to load video');
                };
            });
            
            await videoElement.play();
            // Ensure video is ready
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Analyze multiple frames from the video
            const analyses = [];
            const duration = videoElement.duration;
            const interval = Math.max(1, duration / 10); // Analyze at least 10 frames, minimum 1 second apart

            for (let time = 0; time < duration; time += interval) {
                videoElement.currentTime = time;
                // Wait for frame to be ready
                await new Promise(resolve => {
                    videoElement.onseeked = resolve;
                });
                const analysis = await PoseAnalysisService.analyzePose(videoElement);
                if (analysis && analysis.formScore > 0) {
                    analyses.push(analysis);
                }
            }

            if (analyses.length === 0) {
                throw new Error('No valid poses detected in the video');
            }

            // Aggregate the analyses
            const result = aggregateAnalyses(analyses);
            setAnalysisResult(result);
            onAnalysisComplete?.(result);

            // Clean up
            URL.revokeObjectURL(videoElement.src);
        } catch (error) {
            console.error('Error analyzing video:', error);
            alert('Failed to analyze video: ' + error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const aggregateAnalyses = (analyses) => {
        // Calculate average form score
        const avgScore = Math.round(
            analyses.reduce((sum, a) => sum + a.formScore, 0) / analyses.length
        );

        // Collect unique observations and recommendations
        const observations = [...new Set(analyses.flatMap(a => a.observations))];
        const recommendations = [...new Set(analyses.flatMap(a => a.recommendations))];

        return {
            formScore: avgScore,
            observations,
            recommendations
        };
    };

    return (
        <div className="flex flex-col space-y-4">
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                {stream ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                        {cameraError ? (
                            <div className="text-center space-y-4">
                                <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500 mx-auto" />
                                <p className="text-lg font-medium">{cameraError}</p>
                                <div className="flex flex-col items-center space-y-4">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full flex items-center space-x-2"
                                    >
                                        <ArrowUpTrayIcon className="w-5 h-5" />
                                        <span>Upload Video</span>
                                    </button>
                                    <button
                                        onClick={startCamera}
                                        className="text-blue-400 hover:text-blue-300 text-sm"
                                    >
                                        Try camera again
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={startCamera}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full flex items-center space-x-2"
                            >
                                <CameraIcon className="w-5 h-5" />
                                <span>Start Camera</span>
                            </button>
                        )}
                    </div>
                )}
                
                {realtimeFeedback && (
                    <div className="absolute top-4 left-4 right-4 bg-black bg-opacity-50 text-white p-4 rounded-lg">
                        <p className="text-sm font-medium">Real-time Feedback:</p>
                        <ul className="mt-2 list-disc list-inside text-sm">
                            {realtimeFeedback.observations.map((obs, index) => (
                                <li key={index}>{obs}</li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {stream && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                        {!isRecording ? (
                            <button
                                onClick={startRecording}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full flex items-center space-x-2"
                            >
                                <CameraIcon className="w-5 h-5" />
                                <span>Record</span>
                            </button>
                        ) : (
                            <button
                                onClick={stopRecording}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-full flex items-center space-x-2"
                            >
                                <StopIcon className="w-5 h-5" />
                                <span>Stop</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
            />

            {isAnalyzing && (
                <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-blue-600 text-sm">Analyzing your technique...</p>
                </div>
            )}

            {analysisResult && (
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>
                    <div className="space-y-2">
                        <div>
                            <span className="font-medium">Form Score:</span>
                            <span className="ml-2">{analysisResult.formScore}/10</span>
                        </div>
                        <div>
                            <span className="font-medium">Key Observations:</span>
                            <ul className="list-disc list-inside ml-4">
                                {analysisResult.observations.map((obs, index) => (
                                    <li key={index}>{obs}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <span className="font-medium">Recommendations:</span>
                            <ul className="list-disc list-inside ml-4">
                                {analysisResult.recommendations.map((rec, index) => (
                                    <li key={index}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechniqueAnalyzer; 