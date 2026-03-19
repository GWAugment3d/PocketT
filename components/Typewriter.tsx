
import React from 'react';

interface TypewriterProps {
  text: string;
  speed?: number; // ms delay per character
  startCharIndex?: number;
}

const Typewriter: React.FC<TypewriterProps> = ({ text, speed = 20, startCharIndex = 0 }) => {
  return (
    <>
      {text.split('').map((char, index) => (
        <span
          key={`${startCharIndex}-${index}`}
          className="ink-reveal"
          style={{ animationDelay: `${(startCharIndex + index) * speed}ms` }}
        >
          {char}
        </span>
      ))}
    </>
  );
};

export default Typewriter;