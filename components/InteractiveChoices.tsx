
import React from 'react';
import { AQA_TOPICS } from '../constants';
import { ChevronRightIcon } from './Icons';

interface InteractiveChoicesProps {
  step: 'select-main-topic' | 'select-sub-topic';
  selectedMainTopicHeading: string | null;
  onSelect: (choice: string, type: 'main' | 'sub') => void;
}

const InteractiveChoices: React.FC<InteractiveChoicesProps> = ({ step, selectedMainTopicHeading, onSelect }) => {
  if (step === 'select-main-topic') {
    return (
      <div className="flex flex-col items-start gap-2 w-full mt-4 px-2 md:px-0">
        {AQA_TOPICS.map((topic) => (
          <button
            key={topic.heading}
            onClick={() => onSelect(topic.heading, 'main')}
            className="menu-button w-fit"
          >
            <span className="text-sm">{topic.heading}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        ))}
      </div>
    );
  }

  if (step === 'select-sub-topic' && selectedMainTopicHeading) {
    const selectedTopic = AQA_TOPICS.find(t => t.heading === selectedMainTopicHeading);
    if (!selectedTopic) return null;

    return (
      <div className="flex flex-col items-start gap-2 w-full mt-4 px-2 md:px-0">
        {selectedTopic.subtopics.map((subtopic) => (
          <button
            key={subtopic}
            onClick={() => onSelect(subtopic, 'sub')}
            className="menu-button w-fit"
          >
            <span className="text-sm">{subtopic.split(' ').slice(1).join(' ')}</span>
          </button>
        ))}
      </div>
    );
  }

  return null;
};

export default InteractiveChoices;
