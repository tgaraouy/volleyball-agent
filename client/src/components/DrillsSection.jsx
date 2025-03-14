import React from 'react';
import DrillCard from './DrillCard';
import { getAllWallDrills } from '../data/wallDrills';

const DrillsSection = () => {
  const drills = getAllWallDrills();

  return (
    <div className="space-y-8">
      {Object.entries(drills).map(([level, levelDrills]) => (
        <div key={level} className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 capitalize">
            {level} Level Drills
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {levelDrills.map((drill) => (
              <DrillCard key={drill.id} drill={drill} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DrillsSection; 