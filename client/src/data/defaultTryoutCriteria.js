const defaultTryoutCriteria = {
  categories: [
    {
      name: "Physical Skills",
      weight: 0.3,
      metrics: [
        {
          name: "Vertical Jump",
          description: "Maximum jump height measured in inches",
          minScore: 1,
          maxScore: 5,
          measurementType: "numeric",
          guidelines: {
            1: "Under 14 inches",
            2: "14-16 inches",
            3: "17-19 inches",
            4: "20-22 inches",
            5: "23+ inches"
          }
        },
        {
          name: "Approach Jump",
          description: "Maximum approach jump height",
          minScore: 1,
          maxScore: 5,
          measurementType: "numeric",
          guidelines: {
            1: "Under 16 inches",
            2: "16-18 inches",
            3: "19-21 inches",
            4: "22-24 inches",
            5: "25+ inches"
          }
        },
        {
          name: "Speed/Agility",
          description: "Ability to move quickly and change directions",
          minScore: 1,
          maxScore: 5,
          testMethod: "Volleyball-specific T-test",
          guidelines: {
            1: ">12.5 seconds",
            2: "11.5-12.5 seconds",
            3: "10.5-11.4 seconds",
            4: "9.5-10.4 seconds",
            5: "<9.5 seconds"
          }
        },
        {
          name: "Endurance",
          description: "Stamina and ability to maintain performance",
          minScore: 1,
          maxScore: 5,
          testMethod: "Beep test levels",
          guidelines: {
            1: "Below level 4",
            2: "Levels 4-5",
            3: "Levels 6-7",
            4: "Levels 8-9",
            5: "Level 10+"
          }
        }
      ]
    },
    {
      name: "Technical Skills",
      weight: 0.4,
      metrics: [
        {
          name: "Serving - Overhand",
          description: "Accuracy and power of overhand serves",
          minScore: 1,
          maxScore: 5,
          testMethod: "10 serve test to zones",
          guidelines: {
            1: "0-2 successful serves",
            2: "3-4 successful serves",
            3: "5-6 successful serves",
            4: "7-8 successful serves",
            5: "9-10 successful serves"
          }
        },
        {
          name: "Serving - Float",
          description: "Effectiveness of float serves",
          minScore: 1,
          maxScore: 5,
          testMethod: "10 serve test",
          guidelines: {
            1: "Inconsistent contact, no float",
            2: "Some float action",
            3: "Consistent float",
            4: "Strong float with placement",
            5: "Expert float with varied placement"
          }
        },
        {
          name: "Passing - Platform",
          description: "Form and accuracy in forearm passing",
          minScore: 1,
          maxScore: 5,
          testMethod: "20 pass test",
          guidelines: {
            1: "0-5 target hits",
            2: "6-10 target hits",
            3: "11-14 target hits",
            4: "15-17 target hits",
            5: "18-20 target hits"
          }
        },
        {
          name: "Setting - Location",
          description: "Accuracy and consistency of sets",
          minScore: 1,
          maxScore: 5,
          testMethod: "Setting accuracy test",
          guidelines: {
            1: "Inconsistent location",
            2: "Basic location control",
            3: "Good location consistency",
            4: "Excellent location control",
            5: "Perfect location control"
          }
        },
        {
          name: "Hitting - Approach",
          description: "Proper approach and timing",
          minScore: 1,
          maxScore: 5,
          guidelines: {
            1: "Incorrect approach",
            2: "Basic approach",
            3: "Good approach and timing",
            4: "Very good approach and timing",
            5: "Excellent approach and timing"
          }
        },
        {
          name: "Blocking - Movement",
          description: "Lateral movement and positioning",
          minScore: 1,
          maxScore: 5,
          guidelines: {
            1: "Poor movement",
            2: "Basic movement",
            3: "Good movement",
            4: "Very good movement",
            5: "Excellent movement"
          }
        }
      ]
    },
    {
      name: "Game Intelligence",
      weight: 0.2,
      metrics: [
        {
          name: "Court Awareness",
          description: "Understanding of positioning and game flow",
          minScore: 1,
          maxScore: 5,
          guidelines: {
            1: "Limited awareness",
            2: "Basic awareness",
            3: "Good awareness",
            4: "Very good awareness",
            5: "Excellent awareness"
          }
        },
        {
          name: "Decision Making",
          description: "Shot selection and tactical choices",
          minScore: 1,
          maxScore: 5,
          guidelines: {
            1: "Poor decisions",
            2: "Basic decisions",
            3: "Good decisions",
            4: "Very good decisions",
            5: "Excellent decisions"
          }
        },
        {
          name: "Communication",
          description: "Verbal and non-verbal communication",
          minScore: 1,
          maxScore: 5,
          guidelines: {
            1: "Minimal communication",
            2: "Basic communication",
            3: "Good communication",
            4: "Very good communication",
            5: "Excellent communication"
          }
        }
      ]
    },
    {
      name: "Intangibles",
      weight: 0.1,
      metrics: [
        {
          name: "Coachability",
          description: "Ability to accept and implement feedback",
          minScore: 1,
          maxScore: 5,
          guidelines: {
            1: "Resistant to feedback",
            2: "Sometimes accepts feedback",
            3: "Accepts and tries to implement",
            4: "Actively seeks feedback",
            5: "Exemplary response to coaching"
          }
        },
        {
          name: "Team Attitude",
          description: "Positive attitude and team-first mentality",
          minScore: 1,
          maxScore: 5,
          guidelines: {
            1: "Poor attitude",
            2: "Inconsistent attitude",
            3: "Good attitude",
            4: "Very good attitude",
            5: "Excellent attitude"
          }
        },
        {
          name: "Work Ethic",
          description: "Effort and dedication shown during tryouts",
          minScore: 1,
          maxScore: 5,
          guidelines: {
            1: "Minimal effort",
            2: "Inconsistent effort",
            3: "Good effort",
            4: "Very good effort",
            5: "Maximum effort"
          }
        }
      ]
    }
  ]
};

export default defaultTryoutCriteria; 