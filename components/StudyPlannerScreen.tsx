
import React, { useState } from 'react';
import { CalendarIcon, PencilIcon } from './Icons';

const StudyPlannerScreen: React.FC<{
  onCreatePlan: (daysRemaining: string, topics: string, hoursPerDay: string) => void;
  onClose: () => void;
}> = ({ onCreatePlan, onClose }) => {
  const [step, setStep] = useState(1);
  const [daysUntilTest, setDaysUntilTest] = useState('');
  const [topics, setTopics] = useState('');

  const hourOptions = [
    { label: '15min', value: '15 minutes' },
    { label: '30min', value: '30 minutes' },
    { label: '45min', value: '45 minutes' },
    { label: '1hr', value: '1 hour' },
    { label: '2hr', value: '2 hours' },
    { label: '3hr', value: '3 hours' },
  ];

  const handleDaysSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (daysUntilTest && parseInt(daysUntilTest, 10) > 0) {
      setStep(2);
    }
  };
  
  const handleTopicsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topics.trim()) {
      setStep(3);
    }
  };

  const handleHourSelection = (hours: string) => {
    onCreatePlan(daysUntilTest, topics, hours);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 text-center">
      <div className="w-full max-w-md bg-white/80 p-6 rounded-2xl shadow-lg border border-slate-200">
        {step === 1 && (
          <form onSubmit={handleDaysSubmit} className="space-y-4">
            <CalendarIcon className="h-12 w-12 mx-auto text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-800">How many days until your test?</h2>
            <input
              type="number"
              value={daysUntilTest}
              onChange={(e) => setDaysUntilTest(e.target.value)}
              min="1"
              placeholder="e.g., 14"
              required
              className="w-full p-2 border border-slate-300 rounded-lg text-lg text-center font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 study-planner-input"
              aria-label="Days until test"
            />
            <button type="submit" className="menu-button w-full justify-center">
              Next
            </button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleTopicsSubmit} className="space-y-4">
            <PencilIcon className="h-12 w-12 mx-auto text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-800">What's the topic?</h2>
            <p className="text-sm text-slate-600">What did your teacher say is in it? Or copy-paste what they posted!</p>
            <textarea
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              placeholder="e.g., Marketing Mix, Sources of Finance, Business Ownership..."
              required
              rows={4}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 study-planner-topics-input"
              aria-label="Test Topics"
            />
            <button type="submit" className="menu-button w-full justify-center">
              Next
            </button>
            <button type="button" onClick={() => setStep(1)} className="text-sm text-slate-500 hover:underline">
              Back
            </button>
          </form>
        )}
        {step === 3 && (
           <div className="space-y-4">
            <PencilIcon className="h-12 w-12 mx-auto text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-800">Study hours per day?</h2>
            <p className="text-sm text-slate-600">Be realistic! Quality is better than quantity.</p>
            <div className="flex flex-wrap justify-center gap-3 py-2">
              {hourOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleHourSelection(option.value)}
                  className="bubble-button"
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setStep(2)} className="text-sm text-slate-500 hover:underline">
              Back
            </button>
          </div>
        )}
      </div>
       <button onClick={onClose} className="mt-4 text-slate-600 hover:text-slate-800">
          Back to main menu
        </button>
    </div>
  );
};

export default StudyPlannerScreen;