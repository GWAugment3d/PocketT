import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AQA_TOPICS } from '../constants';
import { generateFlashcards } from '../services/geminiService';
import { Flashcard as FlashcardType } from '../types';
import { CloseIcon, ChevronRightIcon, ChevronLeftIcon, LoadingSpinnerIcon } from './Icons';

// --- Helper Functions ---
const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const pastelColors = [
  '#FFDDC1', // Light Peach
  '#D4F0F0', // Light Blue
  '#F3E6FF', // Light Lavender
  '#D2F5D2', // Light Mint Green
  '#FFFACD', // Lemon Chiffon
  '#FFDFD3'  // Light Coral
];


// --- Child Components ---

const CountdownTimer: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [countdown, setCountdown] = useState(5);
  // FIX: The `useRef` hook was used here but not imported. It has been added to the React import statement at the top of the file.
  const timerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    const timer = setTimeout(() => {
      onComplete();
      clearInterval(interval);
    }, 5000);

    // Add animation class after a short delay to ensure transition
    setTimeout(() => {
        timerRef.current?.classList.add('active');
    }, 10);


    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onComplete]);

  return <div ref={timerRef} className="countdown-timer">{countdown > 0 ? countdown : ''}</div>;
};

const Flashcard: React.FC<{
  front: string;
  back: string;
  onFlip: () => void;
  isFlipped: boolean;
  isLocked: boolean;
  color: string;
}> = ({ front, back, onFlip, isFlipped, isLocked, color }) => {
  const handleFlip = () => {
    if (!isLocked) {
      onFlip();
    }
  };
  return (
    <div className="flashcard-container" onClick={handleFlip} role="button" tabIndex={0} onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && handleFlip()}>
      <div className={`flashcard ${isFlipped ? 'flipped' : ''} ${isLocked ? 'pointer-events-none' : ''}`}>
        <div className="flashcard-face flashcard-front" style={{ backgroundColor: color }}>
          <p>{front}</p>
        </div>
        <div className="flashcard-face flashcard-back" style={{ backgroundColor: color }}>
          <p>{back}</p>
        </div>
      </div>
    </div>
  );
};

// --- Main Screen Component ---

const FlashcardScreen: React.FC<{ onExit: () => void; initialTopic?: string | null; }> = ({ onExit, initialTopic = null }) => {
  const [step, setStep] = useState<'intro' | 'select-main' | 'select-sub' | 'loading' | 'viewing' | 'error'>('intro');
  const [selectedMainTopic, setSelectedMainTopic] = useState<string | null>(null);
  const [cards, setCards] = useState<FlashcardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startNewSession = useCallback((subtopic: string) => {
    setStep('loading');
    setError(null);
    generateFlashcards(subtopic)
      .then(generatedCards => {
        if (generatedCards && generatedCards.length > 0) {
          setCards(shuffleArray(generatedCards));
          setCurrentIndex(0);
          setIsFlipped(false);
          setIsLocked(true);
          setStep('viewing');
        } else {
          setError("Sorry, I couldn't create flashcards for this topic. Please try another one.");
          setStep('error');
        }
      })
      .catch(() => {
        setError("An error occurred while fetching flashcards. Please check your connection and try again.");
        setStep('error');
      });
  }, []);
  
  useEffect(() => {
    if (initialTopic) {
        const parentTopic = AQA_TOPICS.find(cat => cat.subtopics.some(sub => sub.includes(initialTopic)));
        const fullSubTopic = parentTopic?.subtopics.find(sub => sub.includes(initialTopic));
        if (parentTopic && fullSubTopic) {
            setSelectedMainTopic(parentTopic.heading);
            startNewSession(fullSubTopic);
        }
    }
  }, [initialTopic, startNewSession]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setIsLocked(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
      setIsLocked(true);
    }
  };
  
  const restart = () => {
      setStep('select-main');
      setSelectedMainTopic(null);
      setCards([]);
      setError(null);
  }

  const renderContent = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="text-center">
            <h2 className="font-marker text-2xl mb-2">💡 Think before you tap</h2>
            <p className="font-case-study text-slate-700 mb-6">This is about memory, not guessing - getting it wrong is how you learn!</p>
            <button onClick={() => setStep('select-main')} className="menu-button mx-auto">
              Let's Start
            </button>
          </div>
        );
      case 'select-main':
        return (
          <div className="w-full">
            <h2 className="font-marker text-2xl text-center mb-4">Which section are you revising?</h2>
            <div className="flex flex-col items-start gap-2 w-full max-w-sm mx-auto">
              {AQA_TOPICS.map((topic) => (
                <button
                  key={topic.heading}
                  onClick={() => { setSelectedMainTopic(topic.heading); setStep('select-sub'); }}
                  className="menu-button w-full justify-between"
                >
                  <span className="text-sm">{topic.heading}</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        );
      case 'select-sub':
        const topicData = AQA_TOPICS.find(t => t.heading === selectedMainTopic);
        return (
          <div className="w-full">
            <h2 className="font-marker text-2xl text-center mb-4">Great. Which subsection?</h2>
            <div className="flex flex-col items-start gap-2 w-full max-w-sm mx-auto">
              {topicData?.subtopics.map((subtopic) => (
                <button
                  key={subtopic}
                  onClick={() => startNewSession(subtopic)}
                  className="menu-button w-full"
                >
                  <span className="text-sm">{subtopic.split(' ').slice(1).join(' ')}</span>
                </button>
              ))}
            </div>
             <button onClick={() => setStep('select-main')} className="text-sm text-slate-500 hover:underline mt-4 mx-auto block">
              &larr; Back to sections
            </button>
          </div>
        );
      case 'loading':
        return (
          <div className="text-center flex flex-col items-center gap-4">
            <LoadingSpinnerIcon className="text-purple-600 h-10 w-10"/>
            <p className="font-marker text-lg text-slate-700">Making your cards...</p>
          </div>
        );
      case 'error':
        return (
           <div className="text-center">
            <h2 className="font-marker text-2xl mb-4 text-red-600">Oh no!</h2>
            <p className="font-case-study text-slate-700 mb-6">{error}</p>
            <button onClick={restart} className="menu-button">
              Try Again
            </button>
          </div>
        )
      case 'viewing':
        const currentCard = cards[currentIndex];
        const cardColor = pastelColors[currentIndex % pastelColors.length];
        return (
          <div className="w-full flex flex-col items-center gap-6">
            <div className="w-full relative">
                <Flashcard 
                    front={currentCard.front} 
                    back={currentCard.back} 
                    isFlipped={isFlipped} 
                    onFlip={() => setIsFlipped(f => !f)}
                    isLocked={isLocked}
                    color={cardColor}
                />
                {isLocked && <CountdownTimer onComplete={() => setIsLocked(false)} />}
            </div>
            
            <div className="text-sm font-case-study text-slate-600">
                Card {currentIndex + 1} of {cards.length}
            </div>

            <div className="flex items-center gap-4">
              <button onClick={handlePrev} disabled={currentIndex === 0} className="p-3 rounded-full bg-white/80 border border-slate-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors">
                <ChevronLeftIcon className="h-6 w-6 text-slate-700" />
              </button>
              <button onClick={handleNext} disabled={currentIndex === cards.length - 1} className="p-3 rounded-full bg-white/80 border border-slate-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors">
                <ChevronRightIcon className="h-6 w-6 text-slate-700" />
              </button>
            </div>

            <button onClick={restart} className="text-sm text-slate-500 hover:underline mt-2">
              Choose a different topic
            </button>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
      <button onClick={onExit} className="absolute top-0 right-0 p-2 text-slate-500 hover:bg-slate-200/50 rounded-full">
        <CloseIcon />
      </button>
      {renderContent()}
    </div>
  );
};

export default FlashcardScreen;