/**
 * Volleyball Classifier Extensions
 * This file contains utility functions and extensions for the volleyball classifier.
 */

// Export functionality
function setupExportButtons() {
    // Check if export buttons exist
    const exportCSVButton = document.getElementById('exportCSV');
    const exportJSONButton = document.getElementById('exportJSON');
    
    // Only add event listeners if the buttons exist
    if (exportCSVButton) {
        exportCSVButton.addEventListener('click', () => {
            exportResults('csv');
        });
    }
    
    if (exportJSONButton) {
        exportJSONButton.addEventListener('click', () => {
            exportResults('json');
        });
    }
}

// Export results as CSV or JSON
function exportResults(format) {
    // Get prediction results
    const predictionResults = document.getElementById('predictionResults');
    if (!predictionResults || !predictionResults.children || !predictionResults.children.length) {
        // Try to get results from the result container instead
        const resultContainer = document.getElementById('resultContainer');
        if (resultContainer && resultContainer.querySelector('.main-result')) {
            // Extract data from the main result
            const mainResult = resultContainer.querySelector('.main-result');
            const className = mainResult.querySelector('h3') ? mainResult.querySelector('h3').textContent : 'Unknown';
            const confidenceText = mainResult.querySelector('.result-body p') ? 
                mainResult.querySelector('.result-body p').textContent : '';
            const confidence = confidenceText.match(/[\d.]+/) ? 
                parseFloat(confidenceText.match(/[\d.]+/)[0]) / 100 : 0;
            
            // Create a simple prediction object
            const predictions = [{
                technique: className,
                confidence: confidence,
                percentage: confidence * 100
            }];
            
            // Export the data
            if (format === 'csv') {
                exportAsCSV(predictions);
            } else {
                exportAsJSON(predictions);
            }
            return;
        }
        
        // If no results found anywhere
        if (typeof updateStatus === 'function') {
            updateStatus('No results to export. Please analyze a video first.');
        } else {
            alert('No results to export. Please analyze a video first.');
        }
        return;
    }
    
    // Get predictions from the DOM
    const predictions = Array.from(predictionResults.querySelectorAll('.prediction-item')).map(item => {
        return {
            technique: item.querySelector('.technique-name').textContent,
            confidence: parseFloat(item.querySelector('div').textContent.match(/[\d.]+/)[0]) / 100,
            percentage: parseFloat(item.querySelector('div').textContent.match(/[\d.]+/)[0])
        };
    });
    
    // Export the data
    if (format === 'csv') {
        exportAsCSV(predictions);
    } else {
        exportAsJSON(predictions);
    }
}

// Export as CSV
function exportAsCSV(data) {
    // Create CSV content
    let csv = 'Technique,Confidence,Percentage\n';
    
    // Add prediction rows
    data.forEach(pred => {
        csv += `${pred.technique},${pred.confidence},${pred.percentage}\n`;
    });
    
    // Add summary section
    csv += '\nSummary:\n';
    
    // Find the primary technique (highest confidence)
    let primaryTechnique = '';
    let highestConfidence = 0;
    
    data.forEach(pred => {
        if (pred.confidence > highestConfidence) {
            highestConfidence = pred.confidence;
            primaryTechnique = pred.technique;
        }
    });
    
    // Add summary data
    csv += `Primary Technique,${primaryTechnique}\n`;
    csv += `Confidence Level,${highestConfidence}\n`;
    csv += `Frames Analyzed,${data.length}\n`;
    csv += `Technique Variety,${new Set(data.map(p => p.technique)).size}\n`;
    csv += `Timestamp,${new Date().toISOString()}\n`;
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volleyball-analysis-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Update status
    if (typeof updateStatus === 'function') {
        updateStatus('Results exported as CSV');
    }
}

// Export as JSON
function exportAsJSON(data) {
    try {
        // Create a more structured JSON object with summary information
        const jsonData = {
            predictions: data,
            summary: {
                primaryTechnique: '',
                confidenceLevel: 0,
                framesAnalyzed: data.length,
                techniqueVariety: new Set(data.map(p => p.technique)).size,
                timestamp: new Date().toISOString()
            }
        };
        
        // Find the primary technique (highest confidence)
        let highestConfidence = 0;
        
        data.forEach(pred => {
            if (pred.confidence > highestConfidence) {
                highestConfidence = pred.confidence;
                jsonData.summary.primaryTechnique = pred.technique;
            }
        });
        
        jsonData.summary.confidenceLevel = highestConfidence;
        
        // Create download link
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `volleyball-analysis-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Update status
        if (typeof updateStatus === 'function') {
            updateStatus('Results exported as JSON');
        } else {
            console.log('Results exported as JSON');
        }
    } catch (error) {
        console.error('Error exporting JSON:', error);
        if (typeof updateStatus === 'function') {
            updateStatus('Error exporting results: ' + error.message);
        } else {
            alert('Error exporting results: ' + error.message);
        }
    }
}

// Confidence threshold functionality
function setupConfidenceThreshold() {
    const thresholdSlider = document.getElementById('confidenceThreshold');
    const thresholdValue = document.getElementById('thresholdValue');
    
    // Only add event listeners if the elements exist
    if (!thresholdSlider || !thresholdValue) {
        console.warn('Confidence threshold elements not found');
        return;
    }
    
    // Update threshold value display
    thresholdSlider.addEventListener('input', () => {
        const value = thresholdSlider.value;
        thresholdValue.textContent = `${value}%`;
        
        // Apply threshold to existing results if available
        applyConfidenceThreshold(value / 100);
    });
}

// Apply confidence threshold to results
function applyConfidenceThreshold(threshold) {
    const predictionItems = document.querySelectorAll('.prediction-item');
    if (!predictionItems || predictionItems.length === 0) {
        return; // No prediction items to filter
    }
    
    // Filter predictions based on threshold
    let visibleCount = 0;
    
    predictionItems.forEach(item => {
        // Check if the item has a confidence value
        const confidenceElement = item.querySelector('div');
        if (!confidenceElement || !confidenceElement.textContent) {
            return; // Skip this item
        }
        
        const confidenceText = confidenceElement.textContent;
        const confidenceMatch = confidenceText.match(/[\d.]+/);
        
        if (!confidenceMatch) {
            return; // Skip this item
        }
        
        const confidence = parseFloat(confidenceMatch[0]) / 100;
        
        if (confidence >= threshold) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Update status if no techniques meet the threshold
    if (typeof updateStatus === 'function') {
        if (visibleCount === 0) {
            updateStatus(`No techniques meet the confidence threshold of ${(threshold * 100).toFixed(1)}%`);
        } else {
            updateStatus(`Showing ${visibleCount} techniques above the confidence threshold of ${(threshold * 100).toFixed(1)}%`);
        }
    }
    
    // Update timeline markers
    updateTimelineMarkers(threshold);
}

// Batch processing functionality
function setupBatchProcessing() {
    const batchBtn = document.getElementById('batchBtn');
    const batchContainer = document.getElementById('batchContainer');
    const batchInput = document.getElementById('batchInput');
    const batchList = document.getElementById('batchList');
    const processBatchBtn = document.getElementById('processBatchBtn');
    
    // Check if all required elements exist
    if (!batchBtn || !batchContainer || !batchInput || !batchList || !processBatchBtn) {
        console.warn('Batch processing elements not found');
        return;
    }
    
    // Toggle batch processing view
    batchBtn.addEventListener('click', () => {
        if (batchContainer.style.display === 'none') {
            batchContainer.style.display = 'block';
            // Hide comparison view if open
            const comparisonContainer = document.getElementById('comparisonContainer');
            if (comparisonContainer) {
                comparisonContainer.style.display = 'none';
            }
        } else {
            batchContainer.style.display = 'none';
        }
    });
    
    // Add videos to batch list
    batchInput.addEventListener('change', () => {
        if (batchInput.files.length) {
            // Clear existing list if needed
            // batchList.innerHTML = '';
            
            // Add new files to the list
            for (const file of batchInput.files) {
                addFileToBatchList(file);
            }
            
            // Enable process button
            processBatchBtn.disabled = false;
        }
    });
    
    // Process all videos in batch
    processBatchBtn.addEventListener('click', async () => {
        const batchItems = document.querySelectorAll('.batch-item');
        if (!batchItems.length) return;
        
        // Disable process button during processing
        processBatchBtn.disabled = true;
        
        // Process each video in sequence
        for (const item of batchItems) {
            // Skip already processed items
            if (item.dataset.status === 'completed' || item.dataset.status === 'processing') continue;
            
            // Update status
            updateBatchItemStatus(item, 'processing');
            
            try {
                // Get the file from the item
                const file = item.dataset.file;
                if (!file) {
                    throw new Error('File not found');
                }
                
                // Process the video
                await processBatchVideo(JSON.parse(file));
                
                // Update status
                updateBatchItemStatus(item, 'completed');
            } catch (error) {
                console.error('Error processing batch video:', error);
                updateBatchItemStatus(item, 'failed');
            }
        }
        
        // Re-enable process button
        processBatchBtn.disabled = false;
        
        if (typeof updateStatus === 'function') {
            updateStatus('Batch processing complete');
        }
    });
}

// Add file to batch list
function addFileToBatchList(file) {
    const batchList = document.getElementById('batchList');
    
    // Create batch item
    const item = document.createElement('div');
    item.className = 'batch-item';
    item.dataset.file = JSON.stringify(file);
    item.dataset.status = 'pending';
    
    // Add file name
    const fileName = document.createElement('span');
    fileName.textContent = file.name;
    item.appendChild(fileName);
    
    // Add status
    const status = document.createElement('span');
    status.className = 'status pending';
    status.textContent = 'Pending';
    item.appendChild(status);
    
    // Add to list
    batchList.appendChild(item);
}

// Update batch item status
function updateBatchItemStatus(item, status) {
    item.dataset.status = status;
    
    const statusElement = item.querySelector('.status');
    statusElement.className = `status ${status}`;
    
    switch (status) {
        case 'pending':
            statusElement.textContent = 'Pending';
            break;
        case 'processing':
            statusElement.textContent = 'Processing';
            break;
        case 'completed':
            statusElement.textContent = 'Completed';
            break;
        case 'failed':
            statusElement.textContent = 'Failed';
            break;
    }
}

// Process a batch video
async function processBatchVideo(file) {
    try {
        // Create a URL for the video file
        const videoURL = URL.createObjectURL(file);
        const videoElement = document.getElementById('videoElement');
        
        if (!videoElement) {
            throw new Error('Video element not found');
        }
        
        videoElement.src = videoURL;
        
        // Wait for the video to be loaded
        await new Promise((resolve, reject) => {
            const loadHandler = () => {
                videoElement.removeEventListener('loadeddata', loadHandler);
                videoElement.removeEventListener('error', errorHandler);
                resolve();
            };
            
            const errorHandler = (error) => {
                videoElement.removeEventListener('loadeddata', loadHandler);
                videoElement.removeEventListener('error', errorHandler);
                reject(new Error('Video loading failed: ' + (error ? error.message : 'Unknown error')));
            };
            
            videoElement.addEventListener('loadeddata', loadHandler);
            videoElement.addEventListener('error', errorHandler);
            
            // Handle case where loading doesn't trigger loadeddata event
            setTimeout(() => {
                if (videoElement.readyState >= 2) {
                    loadHandler();
                } else {
                    errorHandler(new Error('Video loading timeout'));
                }
            }, 5000);
        });
        
        // Process the video
        const analyzeButton = document.getElementById('analyzeButton');
        if (analyzeButton) {
            // Simulate a click on the analyze button
            analyzeButton.click();
            
            // Wait for analysis to complete (this is a simplification)
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
            throw new Error('Analyze button not found');
        }
        
        // Get the results from the result container
        const resultContainer = document.getElementById('resultContainer');
        if (!resultContainer) {
            throw new Error('Result container not found');
        }
        
        // Extract data from the main result
        const mainResult = resultContainer.querySelector('.main-result');
        if (!mainResult) {
            throw new Error('Main result not found');
        }
        
        const className = mainResult.querySelector('h3') ? 
            mainResult.querySelector('h3').textContent : 'Unknown';
        const confidenceText = mainResult.querySelector('.result-body p') ? 
            mainResult.querySelector('.result-body p').textContent : '';
        const confidence = confidenceText.match(/[\d.]+/) ? 
            parseFloat(confidenceText.match(/[\d.]+/)[0]) / 100 : 0;
        
        // Clean up
        URL.revokeObjectURL(videoURL);
        
        // Return the results
        return {
            fileName: file.name,
            results: {
                class: className,
                confidence: confidence,
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('Error processing batch video:', error);
        return {
            fileName: file.name,
            error: error.message
        };
    }
}

// Video timeline markers functionality
function setupVideoTimeline() {
    const videoElement = document.getElementById('videoElement');
    const timelineContainer = document.getElementById('videoTimeline');
    
    // Check if required elements exist
    if (!videoElement || !timelineContainer) {
        console.warn('Video timeline elements not found');
        return;
    }
    
    // Update timeline when video metadata is loaded
    videoElement.addEventListener('loadedmetadata', () => {
        // Clear existing markers
        timelineContainer.innerHTML = '';
        
        // Set timeline width based on video duration
        timelineContainer.style.width = '100%';
    });
    
    // Add click event to timeline to seek video
    timelineContainer.addEventListener('click', (e) => {
        const rect = timelineContainer.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        
        // Seek video to position
        if (videoElement.duration) {
            videoElement.currentTime = position * videoElement.duration;
        }
    });
}

// Add timeline markers for predictions
function addTimelineMarkers(predictions) {
    const timelineContainer = document.getElementById('videoTimeline');
    const videoElement = document.getElementById('video');
    
    // Clear existing markers
    timelineContainer.innerHTML = '';
    
    // Get video duration
    const duration = videoElement.duration;
    if (!duration) return;
    
    // Add markers for each prediction
    predictions.forEach(pred => {
        const position = (pred.frameTime / duration) * 100;
        
        // Create marker
        const marker = document.createElement('div');
        marker.className = 'timeline-marker';
        marker.dataset.technique = pred.technique;
        marker.dataset.confidence = pred.confidence;
        marker.dataset.time = pred.frameTime;
        marker.style.left = `${position}%`;
        
        // Add tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'timeline-tooltip';
        tooltip.textContent = `${pred.technique} (${(pred.confidence * 100).toFixed(1)}%)`;
        marker.appendChild(tooltip);
        
        // Add click event to seek to frame
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            videoElement.currentTime = pred.frameTime;
        });
        
        // Add to timeline
        timelineContainer.appendChild(marker);
    });
    
    // Apply confidence threshold
    const threshold = parseFloat(document.getElementById('confidenceThreshold').value) / 100;
    updateTimelineMarkers(threshold);
}

// Update timeline markers based on confidence threshold
function updateTimelineMarkers(threshold) {
    const markers = document.querySelectorAll('.timeline-marker');
    
    if (!markers || markers.length === 0) {
        return; // No markers to update
    }
    
    markers.forEach(marker => {
        // Check if the marker has a confidence attribute
        if (!marker.dataset || !marker.dataset.confidence) {
            return; // Skip this marker
        }
        
        const confidence = parseFloat(marker.dataset.confidence);
        
        if (confidence >= threshold) {
            marker.style.display = 'block';
        } else {
            marker.style.display = 'none';
        }
    });
}

// Comparison view functionality
function setupComparisonView() {
    const compareBtn = document.getElementById('compareBtn');
    const comparisonContainer = document.getElementById('comparisonContainer');
    
    // Check if required elements exist
    if (!compareBtn || !comparisonContainer) {
        console.warn('Comparison view elements not found');
        return;
    }
    
    // Toggle comparison view
    compareBtn.addEventListener('click', () => {
        if (comparisonContainer.style.display === 'none') {
            comparisonContainer.style.display = 'flex';
            // Hide batch processing if open
            const batchContainer = document.getElementById('batchContainer');
            if (batchContainer) {
                batchContainer.style.display = 'none';
            }
            
            // If we have a current video, set it as video 1
            const currentVideo = document.getElementById('videoElement');
            const comparisonVideo1 = document.getElementById('comparisonVideo1');
            
            if (currentVideo && currentVideo.src && comparisonVideo1) {
                comparisonVideo1.src = currentVideo.src;
                
                // Copy current results to comparison results 1
                const currentResults = document.getElementById('resultContainer');
                const comparisonResults1 = document.getElementById('comparisonResults1');
                
                if (currentResults && comparisonResults1) {
                    comparisonResults1.innerHTML = currentResults.innerHTML;
                }
            }
            
            // Prompt user to select second video
            promptForComparisonVideo();
        } else {
            comparisonContainer.style.display = 'none';
        }
    });
}

// Prompt user to select second video for comparison
function promptForComparisonVideo() {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    
    // Handle file selection
    input.addEventListener('change', async () => {
        if (input.files.length) {
            const file = input.files[0];
            
            // Set video 2
            const comparisonVideo2 = document.getElementById('comparisonVideo2');
            comparisonVideo2.src = URL.createObjectURL(file);
            
            // Process video 2
            await processComparisonVideo(file);
        }
    });
    
    // Trigger file selection
    input.click();
}

// Process comparison video
async function processComparisonVideo(file) {
    try {
        // Create a URL for the video file
        const videoURL = URL.createObjectURL(file);
        const videoElement = document.getElementById('comparisonVideo2');
        videoElement.src = videoURL;
        
        // Wait for the video to be loaded
        await new Promise((resolve, reject) => {
            const loadHandler = () => {
                videoElement.removeEventListener('loadeddata', loadHandler);
                videoElement.removeEventListener('error', errorHandler);
                resolve();
            };
            
            const errorHandler = (error) => {
                videoElement.removeEventListener('loadeddata', loadHandler);
                videoElement.removeEventListener('error', errorHandler);
                reject(new Error('Video loading failed: ' + (error ? error.message : 'Unknown error')));
            };
            
            videoElement.addEventListener('loadeddata', loadHandler);
            videoElement.addEventListener('error', errorHandler);
            
            // Handle case where loading doesn't trigger loadeddata event
            setTimeout(() => {
                if (videoElement.readyState >= 2) {
                    loadHandler();
                } else {
                    errorHandler(new Error('Video loading timeout'));
                }
            }, 5000);
        });
        
        // Process the video using the main analyze function
        updateStatus('Analyzing comparison video... Please wait.');
        
        // Create a temporary video element for analysis
        const tempVideo = document.createElement('video');
        tempVideo.src = videoURL;
        tempVideo.muted = true;
        tempVideo.style.display = 'none';
        document.body.appendChild(tempVideo);
        
        // Wait for the temp video to be loaded
        await new Promise((resolve, reject) => {
            const loadHandler = () => {
                tempVideo.removeEventListener('loadeddata', loadHandler);
                tempVideo.removeEventListener('error', errorHandler);
                resolve();
            };
            
            const errorHandler = (error) => {
                tempVideo.removeEventListener('loadeddata', loadHandler);
                tempVideo.removeEventListener('error', errorHandler);
                reject(new Error('Video loading failed: ' + (error ? error.message : 'Unknown error')));
            };
            
            tempVideo.addEventListener('loadeddata', loadHandler);
            tempVideo.addEventListener('error', errorHandler);
            
            // Handle case where loading doesn't trigger loadeddata event
            setTimeout(() => {
                if (tempVideo.readyState >= 2) {
                    loadHandler();
                } else {
                    errorHandler(new Error('Video loading timeout'));
                }
            }, 5000);
        });
        
        // Analyze the video
        let result;
        try {
            // Check if analyzeVideo function exists
            if (typeof analyzeVideo === 'function') {
                result = await analyzeVideo(tempVideo);
            } else {
                throw new Error('Analyze function not found');
            }
        } finally {
            // Clean up temp video
            document.body.removeChild(tempVideo);
        }
        
        // Display results for comparison video
        displayComparisonResults(result);
        
        updateStatus('Comparison video analysis complete!');
        
    } catch (error) {
        console.error('Error analyzing comparison video:', error);
        updateStatus('Error analyzing comparison video: ' + error.message);
    }
}

// Display comparison results
function displayComparisonResults(result) {
    const resultsContainer = document.getElementById('comparisonResults2');
    if (!resultsContainer) {
        console.error('Comparison results container not found');
        return;
    }
    
    resultsContainer.innerHTML = '';
    
    if (!result || !result.class) {
        resultsContainer.innerHTML = '<div class="error-message">Error: Invalid analysis result</div>';
        return;
    }
    
    // Create main result display
    const mainResult = document.createElement('div');
    mainResult.className = 'main-result';
    mainResult.innerHTML = `
        <h2>Analysis Result</h2>
        <div class="result-card">
            <div class="result-header" style="background-color: ${getColorForClass ? getColorForClass(result.class) : '#3498db'}">
                <h3>${result.class}</h3>
            </div>
            <div class="result-body">
                <p>Confidence: ${(result.confidence * 100).toFixed(1)}%</p>
            </div>
        </div>
    `;
    resultsContainer.appendChild(mainResult);
    
    // Create detailed results section if available
    if (result.detailedResults && result.detailedResults.length > 0) {
        const detailedSection = document.createElement('div');
        detailedSection.className = 'detailed-results';
        detailedSection.innerHTML = '<h3>Timeline Analysis</h3>';
        
        // Create timeline visualization
        const timeline = document.createElement('div');
        timeline.className = 'timeline';
        
        // Add markers for each frame result
        result.detailedResults.forEach(frameResult => {
            const marker = document.createElement('div');
            marker.className = 'timeline-marker';
            marker.style.left = `${(frameResult.timePoint / result.duration) * 100}%`;
            marker.style.backgroundColor = getColorForClass ? getColorForClass(frameResult.class) : '#3498db';
            marker.title = `${frameResult.class} (${(frameResult.confidence * 100).toFixed(1)}%) at ${frameResult.timePoint.toFixed(1)}s`;
            timeline.appendChild(marker);
        });
        
        detailedSection.appendChild(timeline);
        resultsContainer.appendChild(detailedSection);
        
        // Add class summary if available
        if (result.classSummary && result.classSummary.length > 0) {
            const summarySection = document.createElement('div');
            summarySection.className = 'class-summary';
            summarySection.innerHTML = '<h3>Class Distribution</h3>';
            
            const summaryList = document.createElement('div');
            summaryList.className = 'summary-list';
            
            // Sort by count (descending)
            const sortedSummary = [...result.classSummary].sort((a, b) => 
                parseFloat(b.percentage) - parseFloat(a.percentage));
            
            sortedSummary.forEach(item => {
                const summaryItem = document.createElement('div');
                summaryItem.className = 'summary-item';
                summaryItem.innerHTML = `
                    <div class="technique-name">${item.class}</div>
                    <div class="percentage-bar" style="width: ${item.percentage}; background-color: ${getColorForClass ? getColorForClass(item.class) : '#3498db'}"></div>
                    <div class="percentage-text">${item.percentage} (avg conf: ${item.avgConfidence})</div>
                `;
                summaryList.appendChild(summaryItem);
            });
            
            summarySection.appendChild(summaryList);
            resultsContainer.appendChild(summarySection);
        }
    }
}

// Update the optimizedAnalyzeVideo function to add timeline markers
const originalOptimizedAnalyzeVideo = window.optimizedAnalyzeVideo;
window.optimizedAnalyzeVideo = async function() {
    await originalOptimizedAnalyzeVideo.apply(this, arguments);
    
    // Add timeline markers if we have predictions
    const predictionResults = document.getElementById('predictionResults');
    if (predictionResults.children.length > 0) {
        // Get the predictions from the global scope if available
        if (window.lastPredictions) {
            addTimelineMarkers(window.lastPredictions);
        }
    }
};

// Update the batchExtractFeatures function to store predictions globally
const originalBatchExtractFeatures = window.batchExtractFeatures;
window.batchExtractFeatures = async function() {
    const result = await originalBatchExtractFeatures.apply(this, arguments);
    
    // Store predictions globally for timeline markers
    window.lastPredictions = result.predictions;
    
    return result;
};

// Initialize new features when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Setup new features
        setupExportButtons();
        setupConfidenceThreshold();
        setupBatchProcessing();
        setupVideoTimeline();
        setupComparisonView();
        
        // Update file input display
        const videoInput = document.getElementById('videoInput');
        const fileName = document.getElementById('fileName');
        
        if (videoInput && fileName) {
            videoInput.addEventListener('change', function() {
                const fileNameText = this.files.length ? this.files[0].name : 'No file chosen';
                fileName.textContent = fileNameText;
            });
        }
    } catch (error) {
        console.error('Error initializing volleyball extensions:', error);
    }
});

// Advanced feature extraction (can be implemented in the future)
function extractAdvancedFeatures(imageData) {
  console.log('Advanced feature extraction not yet implemented');
  return null;
}

// Utility function to calculate moving average of predictions
function calculateMovingAverage(predictions, windowSize = 5) {
  if (!predictions || predictions.length === 0) {
    return [];
  }
  
  const result = [];
  const techniques = Object.keys(predictions[0]);
  
  for (let i = 0; i < predictions.length; i++) {
    const windowStart = Math.max(0, i - windowSize + 1);
    const windowEnd = i + 1;
    const windowLength = windowEnd - windowStart;
    
    const averages = {};
    
    techniques.forEach(technique => {
      let sum = 0;
      for (let j = windowStart; j < windowEnd; j++) {
        sum += predictions[j][technique];
      }
      averages[technique] = sum / windowLength;
    });
    
    result.push(averages);
  }
  
  return result;
}

// Utility function to detect technique transitions
function detectTransitions(frameResults, confidenceThreshold = 0.6) {
  if (!frameResults || frameResults.length < 2) {
    return [];
  }
  
  const transitions = [];
  let currentTechnique = frameResults[0].class;
  let currentStart = frameResults[0].timePoint;
  
  for (let i = 1; i < frameResults.length; i++) {
    const frame = frameResults[i];
    
    // Check if technique changed with sufficient confidence
    if (frame.class !== currentTechnique && frame.confidence > confidenceThreshold) {
      // Add the previous segment
      transitions.push({
        technique: currentTechnique,
        startTime: currentStart,
        endTime: frame.timePoint,
        duration: frame.timePoint - currentStart
      });
      
      // Start a new segment
      currentTechnique = frame.class;
      currentStart = frame.timePoint;
    }
  }
  
  // Add the final segment
  const lastFrame = frameResults[frameResults.length - 1];
  transitions.push({
    technique: currentTechnique,
    startTime: currentStart,
    endTime: lastFrame.timePoint,
    duration: lastFrame.timePoint - currentStart
  });
  
  return transitions;
}

// Function to generate a training plan based on analysis
function generateTrainingPlan(analysisResult) {
  if (!analysisResult || !analysisResult.detailedResults) {
    return null;
  }
  
  // Sort techniques by confidence (ascending) to focus on weakest areas
  const sortedTechniques = [...analysisResult.detailedResults]
    .sort((a, b) => a.confidence - b.confidence);
  
  // Generate training plan focusing on the 3 weakest techniques
  const weakestTechniques = sortedTechniques.slice(0, 3);
  
  const trainingPlan = {
    title: "Personalized Volleyball Training Plan",
    focus: "Technique Improvement",
    weakAreas: weakestTechniques.map(t => t.technique),
    exercises: []
  };
  
  // Add exercises for each weak technique
  weakestTechniques.forEach(technique => {
    const exercises = getExercisesForTechnique(technique.technique);
    trainingPlan.exercises.push({
      technique: technique.technique,
      confidence: technique.confidence,
      recommendedExercises: exercises
    });
  });
  
  return trainingPlan;
}

// Helper function to get exercises for a specific technique
function getExercisesForTechnique(technique) {
  const exerciseDatabase = {
    'serve': [
      "Standing serve practice against wall (100 reps)",
      "Target serving drill (20 minutes)",
      "Jump serve progression exercises"
    ],
    'set': [
      "Wall setting drill (100 reps)",
      "Setting accuracy drill with targets",
      "Quick set timing practice"
    ],
    'spike': [
      "Approach and arm swing practice",
      "Hitting against wall drill",
      "Timing drill with setter"
    ],
    'block': [
      "Footwork and positioning drill",
      "Block timing practice",
      "Double block coordination drill"
    ],
    'dig': [
      "Reaction time drill",
      "Platform control exercise",
      "Defensive positioning practice"
    ],
    'receive': [
      "Pass to target drill",
      "Serve receive formation practice",
      "Platform angle control drill"
    ],
    'toss': [
      "Consistent toss height drill",
      "Toss placement practice",
      "Toss under pressure drill"
    ],
    'underhand_pass': [
      "Forearm passing accuracy drill",
      "Moving platform drill",
      "Pass to setter position drill"
    ],
    'overhand_pass': [
      "Overhead passing technique drill",
      "Setting from different positions",
      "Back setting practice"
    ],
    'underhand_serve': [
      "Serve accuracy drill",
      "Consistent contact point practice",
      "Serving under pressure drill"
    ],
    'overhand_serve': [
      "Toss and contact point drill",
      "Serving to zones practice",
      "Float serve technique drill"
    ]
  };
  
  return exerciseDatabase[technique] || [
    "Basic technique practice",
    "Video analysis of proper technique",
    "Drill with coach feedback"
  ];
}

// Export functions if in a module environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractAdvancedFeatures,
    calculateMovingAverage,
    detectTransitions,
    generateTrainingPlan
  };
} 