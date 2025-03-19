/**
 * Volleyball Coach Mobile App
 * Enhanced mobile interface for volleyball technique analysis
 */

// DOM Elements
const cameraView = document.getElementById('cameraView');
const captureBtn = document.getElementById('captureBtn');
const videoPreview = document.getElementById('videoPreview');
const videoPreviewContainer = document.getElementById('videoPreviewContainer');
const cameraContainer = document.getElementById('cameraContainer');
const analyzeVideoBtn = document.getElementById('analyzeVideoBtn');
const retakeVideoBtn = document.getElementById('retakeVideoBtn');
const uploadVideoBtn = document.getElementById('uploadVideoBtn');
const videoFileInput = document.getElementById('videoFileInput');
const analysisLoader = document.getElementById('analysisLoader');
const analysisError = document.getElementById('analysisError');
const resultContainer = document.getElementById('resultContainer');
const frameGrid = document.getElementById('frameGrid');
const analysisResults = document.getElementById('analysisResults');
const frameCount = document.getElementById('frameCount');
const analysisType = document.getElementById('analysisType');
const newRecordingBtn = document.getElementById('newRecordingBtn');
const logOutput = document.getElementById('logOutput');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const toggleDebugBtn = document.getElementById('toggleDebugBtn');
const debugSection = document.getElementById('debugSection');

// State variables
let stream = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordingTimer = null;
let recordingDuration = 0;
let recordedBlob = null;

// Add log entry
function addLog(message, type = 'info') {
    if (!logOutput) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    if (type === 'error') {
        logEntry.classList.add('text-danger');
    } else if (type === 'success') {
        logEntry.classList.add('text-success');
    }
    
    logEntry.textContent = message;
    logOutput.appendChild(logEntry);
    
    // Auto-scroll to bottom
    logOutput.scrollTop = logOutput.scrollHeight;
}

// Setup camera
async function setupCamera() {
    try {
        // Request camera with audio
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: true
        });
        
        // Display camera feed
        cameraView.srcObject = stream;
        captureBtn.disabled = false;
        
        // Setup recorder
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop = function() {
            // Create video from recorded chunks
            recordedBlob = new Blob(recordedChunks, { type: 'video/mp4' });
            const videoURL = URL.createObjectURL(recordedBlob);
            
            // Show preview
            videoPreview.src = videoURL;
            videoPreviewContainer.style.display = 'block';
            cameraContainer.style.display = 'none';
            
            addLog('Recording completed', 'success');
        };
        
        addLog('Camera initialized successfully');
    } catch (error) {
        console.error('Camera error:', error);
        addLog('Camera access error: ' + error.message, 'error');
        alert('Camera access error: ' + error.message);
    }
}

// Toggle recording
function toggleRecording() {
    if (isRecording) {
        // Stop recording
        mediaRecorder.stop();
        isRecording = false;
        captureBtn.classList.remove('recording');
        
        // Clear timer
        clearInterval(recordingTimer);
        document.getElementById('recordTimer').classList.remove('active');
        
        addLog('Recording stopped');
    } else {
        // Start recording
        recordedChunks = [];
        mediaRecorder.start();
        isRecording = true;
        captureBtn.classList.add('recording');
        
        // Start timer
        recordingDuration = 0;
        updateRecordingTime();
        recordingTimer = setInterval(updateRecordingTime, 1000);
        document.getElementById('recordTimer').classList.add('active');
        
        addLog('Recording started');
    }
}

// Update recording time display
function updateRecordingTime() {
    recordingDuration++;
    const minutes = Math.floor(recordingDuration / 60);
    const seconds = recordingDuration % 60;
    document.getElementById('recordingTime').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Handle file upload
function handleFileUpload() {
    const file = videoFileInput.files[0];
    if (!file) {
        alert('Please select a video file first');
        return;
    }
    
    // Create a blob and URL for the file
    recordedBlob = file;
    const videoURL = URL.createObjectURL(file);
    
    // Show preview
    videoPreview.src = videoURL;
    videoPreviewContainer.style.display = 'block';
    cameraContainer.style.display = 'none';
    
    addLog(`File selected: ${file.name} (${Math.round(file.size / 1024)}KB)`, 'success');
}

// Analyze video
async function analyzeVideo() {
    if (!recordedBlob) {
        alert('No video recorded or uploaded');
        return;
    }
    
    try {
        // Show loading
        analysisLoader.style.display = 'flex';
        analysisError.style.display = 'none';
        
        addLog('Starting technique analysis for video...');
        addLog('Sending video to server for technique analysis...');
        
        // Create form data with video
        const formData = new FormData();
        formData.append('video', recordedBlob, 'recording.mp4');
        formData.append('analysis_type', 'technique');
        formData.append('interval_seconds', '1.0');
        formData.append('max_frames', '5');
        
        // Submit for analysis
        const response = await fetch('/api/volleyball/analyze-video', {
            method: 'POST',
            body: formData
        });
        
        // Process results
        const result = await response.json();
        
        if (result.success) {
            addLog('Server returned video analysis successfully', 'success');
            addLog('Displaying video analysis results');
            
            // Display results
            displayAnalysisResults(result);
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        console.error('Analysis error:', error);
        analysisError.textContent = `Analysis failed: ${error.message}`;
        analysisError.style.display = 'block';
        addLog('Analysis error: ' + error.message, 'error');
    } finally {
        analysisLoader.style.display = 'none';
    }
}

// Display analysis results
function displayAnalysisResults(data) {
    // Clear previous results
    analysisResults.innerHTML = '';
    frameGrid.innerHTML = '';
    
    // Update metadata
    analysisType.textContent = data.analysis_type.charAt(0).toUpperCase() + data.analysis_type.slice(1);
    frameCount.textContent = data.results ? data.results.length : 0;
    
    if (!data.results || data.results.length === 0) {
        analysisResults.innerHTML = '<div class="alert alert-warning">No analysis results available.</div>';
        return;
    }
    
    // Create frame grid items
    data.results.forEach((result, index) => {
        // Create frame item for the grid
        if (result.frame_path) {
            const frameItem = document.createElement('div');
            frameItem.className = 'frame-item';
            
            const frameImg = document.createElement('img');
            frameImg.src = `/temp/${result.frame_path}`;
            frameImg.alt = `Frame ${index + 1}`;
            frameImg.loading = 'lazy';
            
            const frameLabel = document.createElement('div');
            frameLabel.className = 'frame-label';
            frameLabel.textContent = `Frame ${index + 1}`;
            
            frameItem.appendChild(frameImg);
            frameItem.appendChild(frameLabel);
            frameGrid.appendChild(frameItem);
            
            // Make frames clickable to see their analysis
            frameItem.addEventListener('click', () => {
                // Highlight selected frame
                document.querySelectorAll('.frame-item').forEach(item => {
                    item.classList.remove('selected');
                });
                frameItem.classList.add('selected');
                
                // Scroll to and highlight the corresponding analysis
                const analysisItems = document.querySelectorAll('.analysis-item');
                if (analysisItems[index]) {
                    analysisItems[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Flash effect to highlight
                    analysisItems[index].classList.add('highlight-flash');
                    setTimeout(() => {
                        analysisItems[index].classList.remove('highlight-flash');
                    }, 1000);
                }
            });
        }
        
        // Create analysis item
        const analysisItem = document.createElement('div');
        analysisItem.className = 'analysis-item card mb-3';
        
        const analysisHeader = document.createElement('div');
        analysisHeader.className = 'card-header d-flex justify-content-between align-items-center';
        analysisHeader.innerHTML = `<h5 class="mb-0">Frame ${index + 1}</h5>`;
        
        const analysisBody = document.createElement('div');
        analysisBody.className = 'card-body';
        
        if (result.error) {
            analysisBody.innerHTML = `<div class="alert alert-danger">${result.error}</div>`;
        } else {
            // Format analysis text
            const analysisText = result.analysis || 'No analysis available';
            analysisBody.innerHTML = formatAnalysisText(analysisText);
        }
        
        analysisItem.appendChild(analysisHeader);
        analysisItem.appendChild(analysisBody);
        analysisResults.appendChild(analysisItem);
    });
    
    // Show results container
    resultContainer.style.display = 'block';
}

// Format analysis text with some formatting
function formatAnalysisText(text) {
    if (!text) return '<p>No analysis available</p>';
    
    // Convert newlines to paragraphs
    text = text.replace(/\n\n/g, '</p><p>');
    text = text.replace(/\n/g, '<br>');
    
    // Highlight key terms
    const highlightTerms = (text) => {
        const terms = [
            { pattern: /(excellent|good|correct)/gi, class: 'text-success' },
            { pattern: /(poor|incorrect|error|mistake)/gi, class: 'text-danger' },
            { pattern: /(form|position|technique|alignment|angle|rotation|timing)/gi, class: 'fw-bold' }
        ];
        
        terms.forEach(term => {
            text = text.replace(term.pattern, match => `<span class="${term.class}">${match}</span>`);
        });
        
        return text;
    };
    
    return `<p>${highlightTerms(text)}</p>`;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('Mobile app initialized!'); // Debug message
    
    // Initialize camera
    setupCamera();
    
    // Recording button
    if (captureBtn) {
        captureBtn.addEventListener('click', toggleRecording);
    }
    
    // Analysis button
    if (analyzeVideoBtn) {
        analyzeVideoBtn.addEventListener('click', analyzeVideo);
    }
    
    // Retake button
    if (retakeVideoBtn) {
        retakeVideoBtn.addEventListener('click', () => {
            videoPreviewContainer.style.display = 'none';
            cameraContainer.style.display = 'block';
            resultContainer.style.display = 'none';
            recordedChunks = [];
            recordedBlob = null;
        });
    }
    
    // New recording button
    if (newRecordingBtn) {
        newRecordingBtn.addEventListener('click', () => {
            videoPreviewContainer.style.display = 'none';
            cameraContainer.style.display = 'block';
            resultContainer.style.display = 'none';
        });
    }
    
    // File upload
    if (uploadVideoBtn) {
        uploadVideoBtn.addEventListener('click', () => {
            if (videoFileInput.files.length > 0) {
                handleFileUpload();
            } else {
                videoFileInput.click();
            }
        });
    }
    
    if (videoFileInput) {
        videoFileInput.addEventListener('change', handleFileUpload);
    }
    
    // Debug controls
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            logOutput.innerHTML = '';
            addLog('Logs cleared');
        });
    }
    
    if (toggleDebugBtn) {
        toggleDebugBtn.addEventListener('click', () => {
            const isVisible = debugSection.style.display !== 'none';
            debugSection.style.display = isVisible ? 'none' : 'block';
            toggleDebugBtn.textContent = isVisible ? 'Show Logs' : 'Hide Logs';
        });
    }
}); 