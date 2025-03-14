import React, { useState } from 'react';
import { Tab } from '@headlessui/react';
import { getAllWallDrills } from '../data/wallDrills';
import TechniqueAnalyzer from '../components/TechniqueAnalyzer';
import { PlayIcon, CameraIcon } from '@heroicons/react/outline';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

const SelfTraining = () => {
    const [selectedDrill, setSelectedDrill] = useState(null);
    const [showAnalyzer, setShowAnalyzer] = useState(false);
    const drills = getAllWallDrills();

    const handleDrillSelect = (drill) => {
        setSelectedDrill(drill);
        setShowAnalyzer(false);
    };

    const handleStartPractice = () => {
        setShowAnalyzer(true);
    };

    const handleAnalysisComplete = (result) => {
        console.log('Analysis complete:', result);
        // You could store this in a progress tracking system
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Self-Training Wall Drills</h1>
                <p className="mt-2 text-gray-600">
                    Practice your volleyball skills using these wall drills. Record your technique for AI analysis and improvement suggestions.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Tab.Group vertical>
                        <Tab.List className="flex flex-col space-y-1">
                            {Object.entries(drills).map(([level, levelDrills]) => (
                                <div key={level} className="mb-4">
                                    <h3 className="text-lg font-semibold capitalize mb-2 text-gray-700">
                                        {level} Level
                                    </h3>
                                    {levelDrills.map((drill) => (
                                        <Tab
                                            key={drill.id}
                                            className={({ selected }) =>
                                                classNames(
                                                    'w-full py-2.5 px-3 text-left rounded-lg',
                                                    'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                                                    selected
                                                        ? 'bg-blue-500 text-white shadow'
                                                        : 'text-gray-700 hover:bg-blue-100 hover:text-blue-700'
                                                )
                                            }
                                            onClick={() => handleDrillSelect(drill)}
                                        >
                                            {drill.name}
                                        </Tab>
                                    ))}
                                </div>
                            ))}
                        </Tab.List>
                    </Tab.Group>
                </div>

                <div className="lg:col-span-2">
                    {selectedDrill ? (
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    {selectedDrill.name}
                                </h2>
                                <p className="text-gray-600">{selectedDrill.description}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Key Points</h3>
                                    <ul className="list-disc list-inside space-y-1">
                                        {selectedDrill.keyPoints.map((point, index) => (
                                            <li key={index} className="text-gray-600">
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Progression</h3>
                                    <ul className="list-decimal list-inside space-y-1">
                                        {selectedDrill.progression.map((step, index) => (
                                            <li key={index} className="text-gray-600">
                                                {step}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex items-center text-gray-600">
                                    <PlayIcon className="w-5 h-5 mr-2" />
                                    <span>Duration: {selectedDrill.duration}</span>
                                </div>

                                {!showAnalyzer && (
                                    <button
                                        onClick={handleStartPractice}
                                        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                        <CameraIcon className="w-5 h-5 mr-2" />
                                        Start Practice with Analysis
                                    </button>
                                )}
                            </div>

                            {showAnalyzer && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold mb-4">Technique Analysis</h3>
                                    <TechniqueAnalyzer
                                        drillId={selectedDrill.id}
                                        onAnalysisComplete={handleAnalysisComplete}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-lg p-8 text-center">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Select a Drill
                            </h3>
                            <p className="text-gray-600">
                                Choose a drill from the list to view details and start practicing
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SelfTraining; 