import React from 'react';

// A mapping from OSRM instruction types to icon names
const instructionIcons: { [key: string]: string } = {
  'Head': 'arrow-up-outline',
  'Continue': 'arrow-up-outline',
  'Turn right': 'return-up-forward-outline',
  'Turn left': 'return-up-back-outline',
  'Slight right': 'return-up-forward-outline',
  'Slight left': 'return-up-back-outline',
  'Sharp right': 'return-up-forward-outline',
  'Sharp left': 'return-up-back-outline',
  'Roundabout': 'sync-outline',
  'Fork': 'git-commit-outline',
  'Merge': 'git-merge-outline',
  'Arrive': 'flag-outline',
  'Destination': 'flag-outline',
  'New name': 'location-outline',
};

const getIconForInstruction = (type: string) => {
    for (const key in instructionIcons) {
        if (type.startsWith(key)) {
            return instructionIcons[key];
        }
    }
    return 'navigate-outline'; // Default icon
};

interface NavigationInstructionsProps {
  instruction: {
    text: string;
    distance: number;
    type: string;
  } | null;
  liveDistance: number;
  onClose: () => void;
}

const NavigationInstructions = ({ instruction, liveDistance, onClose }: NavigationInstructionsProps) => {
  if (!instruction) return null;

  const displayDistance = (dist: number) => {
    if (dist > 1000) {
      return `${(dist / 1000).toFixed(1)} km`;
    }
    return `${Math.round(dist)} m`;
  };

  const iconName = getIconForInstruction(instruction.type);

  return (
    <div className="absolute top-20 left-4 z-[401] w-full max-w-sm animate-fade-in-fast">
        <div className="group relative flex flex-col rounded-xl bg-white dark:bg-slate-950 p-4 shadow-lg dark:shadow-2xl">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
            <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
            <div className="relative">
                <button onClick={onClose} className="absolute -top-1 -right-1 text-gray-400 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors z-20">
                    <ion-icon name="close-circle" class="w-7 h-7"></ion-icon>
                </button>
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 bg-indigo-500 text-white p-3 rounded-lg">
                        <ion-icon name={iconName} class="w-8 h-8"></ion-icon>
                    </div>
                    <div className="flex-grow">
                        <p className="font-bold text-lg text-gray-900 dark:text-white">{instruction.text}</p>
                        <p className="text-2xl font-bold text-indigo-500 dark:text-indigo-400 mt-1">{displayDistance(liveDistance)}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default NavigationInstructions;