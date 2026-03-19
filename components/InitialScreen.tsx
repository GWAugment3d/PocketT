import React, { useState, useEffect } from 'react';
import { MAIN_MENU_OPTIONS } from '../constants';
import Typewriter from './Typewriter';
import { PencilIcon } from './Icons';

interface InitialScreenProps {
  onSelectOption: (prompt: string, isPro: boolean, action: 'chat', label: string) => void;
  avatarImage: string | null;
  onAvatarError?: () => void;
  isAvatarGenerating?: boolean;
}

const quotes = [
    "Success is walking from failure to failure with no loss of enthusiasm.” — Winston Churchill",
    "Stress primarily comes from not taking action over something you can control.” — Jeff Bezos",
    "The biggest risk is not taking any risk.” — Mark Zuckerberg",
    "It always seems impossible until it’s done.” — Nelson Mandela",
    "How do you eat an elephant? One bite at a time.” — Desmond Tutu",
    "A journey of a thousand miles begins with a single step.” — Lao Tzu",
    "Small progress is still progress.” — Proverb",
    "Don’t watch the clock; do what it does. Keep going.” — Sam Levenson",
    "You don’t have to be great to start, but you have to start to be great.” — Zig Ziglar",
    "Focus on the step in front of you, not the whole staircase.” — Proverb",
    "One person's problems, are another's opportunity"
];

const InitialScreen: React.FC<InitialScreenProps> = ({ onSelectOption, avatarImage, onAvatarError, isAvatarGenerating }) => {
  const [viewStep, setViewStep] = useState<'main' | 'select_marker' | 'select_action' | 'select_study_option'>('main');
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const [quote, setQuote] = useState('');

  useEffect(() => {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);
  
  const initialOptions = MAIN_MENU_OPTIONS.filter(opt =>
    ['Mini-lessons', 'Study for a test', 'Home-work helper'].includes(opt.label)
  );
  
  const handleMarkerSelect = (marker: number) => {
    setSelectedMarker(marker);
    setViewStep('select_action');
  };

  const handleActionSelect = (action: 'learn' | 'practice') => {
    if (!selectedMarker) return;
    const prompt = action === 'learn'
      ? `Can you teach me how to structure a ${selectedMarker}-marker answer?`
      : `I'd like to practice a ${selectedMarker}-marker question.`;
    const label = action === 'learn'
      ? `Learn how to do a ${selectedMarker}-marker`
      : `Practice a ${selectedMarker}-marker`;
      
    onSelectOption(prompt, false, 'chat', label);
  };

  const renderContent = () => {
    if (isAvatarGenerating) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-marker text-2xl text-indigo-600 animate-pulse">
                    Just getting ready for class...
                </p>
            </div>
        );
    }
    switch (viewStep) {
      case 'select_marker':
        return (
          <>
            <h3 className="font-marker text-lg mb-4">What type of question?</h3>
            <div className="flex flex-col items-start gap-2 w-full">
              {[4, 6, 9, 12].map(marker => (
                <button
                  key={marker}
                  onClick={() => handleMarkerSelect(marker)}
                  className="menu-button w-fit"
                >
                  <span className="text-sm">{marker}-marker practice</span>
                </button>
              ))}
            </div>
            <button onClick={() => setViewStep('main')} className="text-sm text-slate-500 hover:underline mt-4">
              &larr; Back
            </button>
          </>
        );
      case 'select_action':
        return (
          <>
            <h3 className="font-marker text-lg mb-4">{selectedMarker}-marker Training</h3>
            <div className="flex flex-col items-start gap-2 w-full">
                <button
                  onClick={() => handleActionSelect('learn')}
                  className="menu-button w-fit"
                >
                  <span className="text-sm">Learn how to do a {selectedMarker}-marker</span>
                </button>
                <button
                  onClick={() => handleActionSelect('practice')}
                  className="menu-button w-fit"
                >
                  <span className="text-sm">Practice a {selectedMarker}-marker</span>
                </button>
            </div>
            <button onClick={() => setViewStep('select_marker')} className="text-sm text-slate-500 hover:underline mt-4">
              &larr; Back
            </button>
          </>
        );
      case 'select_study_option':
        const studyOptions = MAIN_MENU_OPTIONS.find(opt => opt.label === 'Study for a test')?.subOptions;
        if (!studyOptions) return null; // Should not happen
        
        return (
          <>
            <h3 className="font-marker text-lg mb-4">How do you want to study?</h3>
            <div className="flex flex-col items-start gap-2 w-full">
              {studyOptions.map(subOpt => (
                <button
                  key={subOpt.label}
                  onClick={() => onSelectOption(subOpt.prompt, subOpt.isPro, subOpt.action, subOpt.label)}
                  className="menu-button w-fit"
                >
                  <span className="text-sm">{subOpt.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setViewStep('main')} className="text-sm text-slate-500 hover:underline mt-4">
              &larr; Back
            </button>
          </>
        );
      case 'main':
      default:
        return (
          <>
            <p className="font-marker text-xl mb-6">
              <Typewriter text="Let's get down to business! What's first?" speed={77} />
            </p>
            <div className="flex flex-col items-start gap-2 w-full">
              {initialOptions.map((option) => (
                <button
                  key={option.label}
                  onClick={() => {
                    if (option.label === 'Study for a test') {
                      setViewStep('select_study_option');
                    } else {
                      onSelectOption(option.prompt, option.isPro, option.action, option.label);
                    }
                  }}
                  className="menu-button w-fit"
                >
                  <option.icon className="h-5 w-5 text-indigo-500" />
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
               <button
                  onClick={() => setViewStep('select_marker')}
                  className="menu-button w-fit"
                >
                  <PencilIcon className="h-5 w-5 text-indigo-500" />
                  <span className="text-sm">Long question practice</span>
                </button>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="w-full max-w-sm mb-6">
        {isAvatarGenerating ? (
            <div className="w-full aspect-square bg-indigo-50 flex items-center justify-center rounded-xl border-4 border-dashed border-indigo-200">
                <span className="font-marker text-indigo-300 text-6xl">?</span>
            </div>
        ) : avatarImage ? (
          <img
            src={avatarImage}
            alt="PocketTeacher Avatar"
            className="w-full h-auto shadow-lg rounded-xl"
            onError={onAvatarError}
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 animate-pulse rounded-xl"></div>
        )}
      </div>

      <div className="w-full">
        {renderContent()}
      </div>
      <div className="w-full mt-8 px-4 flex flex-col gap-4">
        <p className="text-sm text-slate-500" style={{ fontFamily: "'Poppins', sans-serif" }}>
          "{quote}"
        </p>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
          <p className="text-[10px] text-blue-700 leading-tight">
            <strong>Privacy Notice:</strong> This app is designed for students. We do not store your personal data, and your conversations are not used to train AI models. Please do not share your full name, address, or school name.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InitialScreen;
