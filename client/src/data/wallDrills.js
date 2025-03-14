const wallDrills = {
    beginner: [
        {
            id: 'b1',
            name: 'Basic Forearm Pass Test',
            description: 'Stand about 3 feet from the wall and perform basic forearm passes. This drill helps validate arm position and body alignment.',
            duration: '1-2 minutes',
            keyPoints: [
                'Feet shoulder-width apart',
                'Knees bent at 45 degrees',
                'Arms straight and parallel to ground',
                'Shoulders forward and down'
            ],
            expectedPose: {
                armAngle: 45, // degrees from horizontal
                kneeFlexion: 45, // degrees
                hipAlignment: 0, // degrees from horizontal
                shoulderAlignment: 0 // degrees from horizontal
            },
            progression: [
                'Stand stationary and check form',
                'Perform 5 slow passes',
                'Check arm platform in mirror',
                'Validate knee bend'
            ]
        },
        {
            id: 'b2',
            name: 'Setting Position Test',
            description: 'Practice basic setting position to validate hand position and body alignment.',
            duration: '1-2 minutes',
            keyPoints: [
                'Hands above forehead',
                'Elbows at 90 degrees',
                'Knees slightly bent',
                'Core engaged'
            ],
            expectedPose: {
                elbowAngle: 90, // degrees
                handHeight: 1.2, // ratio to head height
                spineAngle: 0, // degrees from vertical
                kneeFlexion: 20 // degrees
            },
            progression: [
                'Hold setting position',
                'Check hand triangle form',
                'Verify elbow angle',
                'Test balance and stability'
            ]
        }
    ],
    intermediate: [
        {
            id: 'i1',
            name: 'Dynamic Platform Test',
            description: 'Move laterally while maintaining proper passing form.',
            duration: '2-3 minutes',
            keyPoints: [
                'Maintain level platform while moving',
                'Keep center of gravity low',
                'Shoulders stay forward',
                'Feet always moving'
            ],
            expectedPose: {
                platformLevel: 0, // degrees from horizontal
                hipHeight: 0.7, // ratio to standing height
                shoulderRotation: 20, // degrees forward
                footSpacing: 1.5 // ratio to shoulder width
            },
            progression: [
                'Side-step with platform check',
                'Add directional changes',
                'Increase movement speed',
                'Maintain form throughout'
            ]
        }
    ],
    advanced: [
        {
            id: 'a1',
            name: 'Jump Setting Form Test',
            description: 'Practice setting form while jumping to validate body control and alignment.',
            duration: '2-3 minutes',
            keyPoints: [
                'Vertical jump alignment',
                'Arms stay high throughout',
                'Core remains stable',
                'Balanced landing'
            ],
            expectedPose: {
                jumpAlignment: 0, // degrees from vertical
                armExtension: 160, // degrees at peak
                coreStability: 0, // degrees of rotation
                landingWidth: 1.0 // ratio to takeoff position
            },
            progression: [
                'Static jump check',
                'Add ball contact point',
                'Test landing stability',
                'Verify full extension'
            ]
        }
    ]
};

export const getAllWallDrills = () => wallDrills;
export const getDrillsByLevel = (level) => wallDrills[level] || [];
export const getDrillById = (id) => {
    for (const level in wallDrills) {
        const drill = wallDrills[level].find(d => d.id === id);
        if (drill) return drill;
    }
    return null;
};

export default wallDrills; 