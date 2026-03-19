import React from 'react';
import { ChatMessage } from '../types';
import Typewriter from './Typewriter';
import { VolumeUpIcon, LoadingSpinnerIcon, VolumeOffIcon } from './Icons';

interface MessageProps {
  message: ChatMessage;
  isLastModelMessage: boolean;
  isStreaming: boolean;
  imageCache: Map<string, string>;
  setImageCache: React.Dispatch<React.SetStateAction<Map<string, string>>>;
  isInitialLoadForThread?: boolean;
  isStudyPlanThread: boolean;
  completedTasks?: Record<string, boolean>;
  onToggleStudyTask?: (taskText: string) => void;
  onStartStudyTask?: (type: string, topic: string) => void;
  onSendMessage: (text: string, imageUrl?: string | null) => void;
}

// A helper class to manage the typewriter animation index without causing side effects
// in the render function. An instance is created for each render, ensuring the component
// remains pure and preventing instability that was causing crashes.
class TypewriterHelper {
  public charIndex = 0;

  constructor(private isAnimating: boolean) {}

  renderSegment(segment: string): React.ReactNode {
    if (!this.isAnimating) {
      // Split by newline to manually insert <br /> tags, respecting pre-wrap styling
      return segment.split('\n').map((line, i, arr) => (
        <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>
      ));
    }
    const node = <Typewriter text={segment} startCharIndex={this.charIndex} />;
    this.charIndex += segment.length;
    return node;
  }
}

const shortenTaskText = (originalText: string): string => {
  // Remove duration like (15 minutes)
  let text = originalText.replace(/\s*\(\d+\s*minutes\)/i, '').trim();

  // General replacements for conciseness
  text = text.replace(/ and /gi, ' & ');
  text = text.replace('Understanding the Statement of', 'P&L Statement');
  text = text.replace('Introduction to', 'Intro to');
  text = text.replace('Sources of Finance', 'Finance Sources');
  text = text.replace('Managing Cash Flow Problems', 'Managing Cash Flow');
  text = text.replace('Components of a Profit & Loss Account', 'P&L Components');
  text = text.replace('P&L Terminology', 'P&L Terms');
  
  return text;
};


const Message: React.FC<MessageProps> = ({ 
  message, 
  isLastModelMessage,
  isStreaming,
  imageCache,
  isInitialLoadForThread,
  isStudyPlanThread,
  completedTasks,
  onToggleStudyTask,
  onStartStudyTask,
  onSendMessage
}) => {
  const isUser = message.author === 'user';

  const renderFormattedText = (text: string) => {
    const isAnimating = isLastModelMessage && !isInitialLoadForThread && !isStudyPlanThread;
    const typewriterHelper = new TypewriterHelper(isAnimating);

    // This is the new, robust parsing function.
    const renderRichText = (text: string): React.ReactNode[] => {
        // This regex captures all formatting tokens we care about.
        // The capturing group in split() will keep the delimiters.
        const formattingRegex = /(<marker-heading>.*?<\/marker-heading>|<sub-marker-heading>.*?<\/sub-marker-heading>|<tertiary-marker-heading>.*?<\/tertiary-marker-heading>|<bold>.*?<\/bold>|<ao1>.*?<\/ao1>|<ao2>.*?<\/ao2>|<ao3>.*?<\/ao3>|<question>[\s\S]*?<\/question>|<u>.*?<\/u>|<progress-bar percentage=".*?" \/>|<try-4-marker topic=".*?" \/>|<move-on \/>|\[.*?\]|\*\*.*?\*\*|\*.*?\*|<[^>]+>)/g;
        
        const parts = text.split(formattingRegex).filter(Boolean);

        return parts.map((part, index) => {
            // Progress Bar
            if (part.startsWith('<progress-bar')) {
                const percentage = part.match(/percentage="(.*?)"/)?.[1] || '0';
                return (
                    <div key={index} className="flex items-center gap-3 my-4 font-sans font-bold text-xs tracking-wider text-blue-900/70">
                        <span>PROGRESS:</span>
                        <div className="flex-1 h-3 border border-blue-900/30 relative bg-white overflow-hidden rounded-full">
                            <div 
                                className="h-full bg-blue-900 progress-pattern transition-all duration-500" 
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <span className="min-w-[2.5rem] text-right">{percentage}%</span>
                    </div>
                );
            }
            // Try 4-marker button
            if (part.startsWith('<try-4-marker')) {
                const topic = part.match(/topic="(.*?)"/)?.[1] || '';
                return (
                    <button 
                        key={index}
                        onClick={() => onSendMessage(`I'd like to try an easy 4-marker on ${topic}.`)}
                        className="menu-button w-full mt-2"
                    >
                        <span className="text-sm">Try an easy 4-marker on this</span>
                    </button>
                );
            }
            // Move on button
            if (part === '<move-on />') {
                return (
                    <button 
                        key={index}
                        onClick={() => onSendMessage('Move on')}
                        className="menu-button w-full mt-2"
                    >
                        <span className="text-sm">Move on</span>
                    </button>
                );
            }
            // Markdown Bold
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="bold-text">{typewriterHelper.renderSegment(part.slice(2, -2))}</strong>;
            }
            // Markdown Italic (ensuring it's not part of a bold tag)
            if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                 return <em key={index}>{typewriterHelper.renderSegment(part.slice(1, -1))}</em>;
            }
            // Custom Tags
            if (part.startsWith('<u>')) {
                return <u key={index} className="font-marker no-underline block my-2">{typewriterHelper.renderSegment(part.slice(3, -4))}</u>;
            }
            if (part.startsWith('<marker-heading>')) {
                return <span key={index} className="font-marker">{typewriterHelper.renderSegment(part.slice(16, -17))}</span>;
            }
            if (part.startsWith('<sub-marker-heading>')) {
                return <span key={index} className="font-marker-orange">{typewriterHelper.renderSegment(part.slice(20, -21))}</span>;
            }
            if (part.startsWith('<tertiary-marker-heading>')) {
                return <span key={index} className="font-marker-teal">{typewriterHelper.renderSegment(part.slice(25, -26))}</span>;
            }
            if (part.startsWith('<bold>')) {
                return <span key={index} className="bold-text">{typewriterHelper.renderSegment(part.slice(6, -7))}</span>;
            }
            if (part.startsWith('<ao1>')) {
                return <span key={index} className="ao1">{typewriterHelper.renderSegment(part.slice(5, -6))}</span>;
            }
            if (part.startsWith('<ao2>')) {
                return <span key={index} className="ao2">{typewriterHelper.renderSegment(part.slice(5, -6))}</span>;
            }
            if (part.startsWith('<ao3>')) {
                return <span key={index} className="ao3">{typewriterHelper.renderSegment(part.slice(5, -6))}</span>;
            }
            if (part.startsWith('<question>')) {
                return (
                  <p key={index} className="mt-4 case-study-question">
                    <strong className="font-bold">QUESTION:</strong>{' '}
                    {typewriterHelper.renderSegment(part.slice(10, -11))}
                  </p>
                );
            }
            // Scaffold
            if (part.startsWith('[') && part.endsWith(']')) {
                return <span key={index} className="scaffold-placeholder">{typewriterHelper.renderSegment(part)}</span>;
            }
            // Stray Tag Cleanup: If it looks like a tag but wasn't handled, discard it.
            if (part.startsWith('<') && part.endsWith('>')) {
                return null;
            }
            // Plain text
            return <span key={index}>{typewriterHelper.renderSegment(part)}</span>;
        });
    };

    // MCQ Check
    const mcqMatch = text.match(/<mcq-options>([\s\S]*?)<\/mcq-options>/);
    if (mcqMatch && isLastModelMessage) {
      const questionText = text.substring(0, mcqMatch.index).trim();
      const optionsHtml = mcqMatch[1];
      const optionMatches = [...optionsHtml.matchAll(/<option>(.*?)<\/option>/g)];
      const options = optionMatches.map(m => m[1].trim());

      return (
        <div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{renderRichText(questionText)}</div>
          <div className="flex flex-col items-start gap-2 w-full mt-4">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => onSendMessage(`${String.fromCharCode(65 + index)}) ${option}`)}
                className="menu-button w-fit text-left"
              >
                <span className="text-sm"><b>{String.fromCharCode(65 + index)})</b> {option}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    const hasContinuePrompt = text.includes('<continue-prompt/>');
    const hasFeedbackPrompt = text.includes('<feedback-prompt/>');

    let textToRender = text;
    if (hasContinuePrompt) {
        textToRender = textToRender.replace('<continue-prompt/>', '').trim();
    }
    if (hasFeedbackPrompt) {
        textToRender = textToRender.replace('<feedback-prompt/>', '').trim();
    }
    
    // Handle study plan rendering
    if (textToRender.includes('<study-plan>')) {
        const planContent = textToRender.match(/<study-plan>([\s\S]*)<\/study-plan>/)?.[1] || '';
        
        const titleMatch = planContent.match(/<u>(.*?)<\/u>/);
        const quoteMatch = planContent.match(/<quote>(.*?)<\/quote>/);
        const title = titleMatch ? titleMatch[1] : 'Your Revision Plan';
        const quote = quoteMatch ? quoteMatch[1] : '';

        const contentAfterQuoteIndex = quoteMatch ? (quoteMatch.index || 0) + quoteMatch[0].length : (titleMatch ? (titleMatch.index || 0) + titleMatch[0].length : 0);
        const daysContent = planContent.substring(contentAfterQuoteIndex);
        const dayParts = daysContent.split(/(<subtitle>.*?<\/subtitle>)/g).filter(Boolean);

        const structuredPlan: { subtitle: string; tasks: { type: string; topic: string; content: string }[]; content?: string }[] = [];
        
        for (let i = 0; i < dayParts.length; i++) {
            if (dayParts[i].startsWith('<subtitle>')) {
                const subtitle = dayParts[i].replace(/<\/?subtitle>/g, '');
                const contentHtml = dayParts[i + 1] || '';
                const taskMatches = [...contentHtml.matchAll(/<task type="([^"]*)" topic="([^"]*)">(.*?)<\/task>/g)];
                
                if (taskMatches.length > 0) {
                    const tasks = taskMatches.map(match => ({ type: match[1], topic: match[2], content: match[3] }));
                    structuredPlan.push({ subtitle, tasks });
                } else if (contentHtml.trim()) {
                    structuredPlan.push({ subtitle, tasks: [], content: contentHtml.trim() });
                } else {
                    structuredPlan.push({ subtitle, tasks: [] });
                }
            }
        }

        return (
            <div id={`study-plan-${message.id}`} className="torn-paper study-plan-text">
                <u className="font-marker no-underline block mb-1 text-center">{typewriterHelper.renderSegment(title)}</u>
                <p className="text-center italic text-slate-600 mb-4 text-sm font-case-study">"{typewriterHelper.renderSegment(quote)}"</p>
                <div className="space-y-4">
                    {structuredPlan.map((day, dayIndex) => {
                        const subtitle = day.subtitle;
                        let subtitleNode;
                        const parts = subtitle.split(/:(.*)/s);
                        const heading = parts[0] || '';
                        const description = parts[1] ? parts[1].trim() : '';

                        if (heading.toLowerCase().startsWith('day')) {
                            subtitleNode = (
                                <div className="font-marker-black">
                                    <span className="font-marker-orange">{typewriterHelper.renderSegment(heading)}</span>
                                    {typewriterHelper.renderSegment(description ? `: ${description}` : '')}
                                </div>
                            );
                        } else { 
                            subtitleNode = <div className="font-marker-orange">{typewriterHelper.renderSegment(subtitle)}</div>;
                        }

                        return (
                            <div key={dayIndex} className="border-t border-slate-200 pt-3">
                                {subtitleNode}
                                <div className="flex flex-col gap-1 mt-2 pl-2">
                                    {day.tasks.map((task, taskIndex) => {
                                        const isCompleted = completedTasks ? completedTasks[task.content] : false;
                                        const displayTaskText = shortenTaskText(task.content);
                                        return (
                                            <div key={taskIndex} className="flex items-start study-plan-task">
                                                {onToggleStudyTask && (
                                                    <input type="checkbox" className="mt-1 mr-3 cursor-pointer" checked={!!isCompleted} onChange={() => onToggleStudyTask(task.content)} aria-label={`Mark task as complete: ${task.content}`} />
                                                )}
                                                <button onClick={() => onStartStudyTask?.(task.type, task.topic)} className={`flex-1 text-left transition-colors duration-200 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded px-1 whitespace-normal ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                                                    {typewriterHelper.renderSegment(displayTaskText)}
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {day.content && <div className="study-plan-task pl-5 pt-1 text-slate-800 font-semibold">{typewriterHelper.renderSegment(day.content)}</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Default rendering for other messages
    const elements: React.ReactNode[] = [];
    const caseStudyRegex = /<case-study title="([^"]*)">([\s\S]*?)<\/case-study>/g;
    let lastIndex = 0;
    let match;

    const regex = new RegExp(caseStudyRegex);
    while ((match = regex.exec(textToRender)) !== null) {
        if (match.index > lastIndex) {
            const precedingText = textToRender.substring(lastIndex, match.index);
            elements.push(<div key={`pre-text-${lastIndex}`}>{renderRichText(precedingText)}</div>);
        }

        const title = match[1];
        const content = match[2];
        const caseStudyId = `${message.id}-casestudy-${match.index}`;
        const imageUrl = imageCache.get(caseStudyId);
        
        const questionRegex = /<question>[\s\S]*?<\/question>/;
        const caseStudyText = content.replace(questionRegex, '').trim();
        const caseStudySentences = caseStudyText.match(/[^.!?]+[.!?]+/g)?.filter(s => s.trim().length > 0) || (caseStudyText ? [caseStudyText] : []);
        
        const renderedCaseStudy = (
          <div key={caseStudyId} className="my-3">
            <div className="torn-paper font-case-study text-black">
              <div className="relative mb-4">
                {imageUrl ? (
                  <img src={`data:image/png;base64,${imageUrl}`} alt={`Illustration for ${title}`} className="w-full h-[180px] object-cover rounded-md" />
                ) : (
                  <div className="w-full h-[180px] bg-gray-200 animate-pulse rounded-md"></div>
                )}
              </div>
              <h4 className="text-center font-bold underline mb-2 text-base">{title}</h4>
              <p>
                {caseStudySentences.map((sentence, sIndex) => {
                  return <span key={sIndex}>{renderRichText(sentence.trim())}{' '}</span>;
                })}
              </p>
              {renderRichText(content.replace(caseStudyText, ''))}
            </div>
          </div>
        );
        elements.push(renderedCaseStudy);
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < textToRender.length) {
        const remainingText = textToRender.substring(lastIndex);
        elements.push(<div key={`post-text-${lastIndex}`}>{renderRichText(remainingText)}</div>);
    }
    
    if (hasContinuePrompt) {
        const animationDelayMs = isAnimating ? typewriterHelper.charIndex * 20 : 0;
        const buttonContainerStyle: React.CSSProperties = isAnimating ? { opacity: 0, animation: `fadeIn 0.5s forwards`, animationDelay: `${animationDelayMs}ms` } : {};
        elements.push(
            <div key="continue-prompt-buttons" className="flex items-center gap-2 mt-4" style={buttonContainerStyle}>
                <button onClick={() => onSendMessage('Got it, next')} className="menu-button w-fit"><span className="text-sm">Got it, next</span></button>
                <button onClick={() => onSendMessage('Explain further')} className="menu-button w-fit"><span className="text-sm">Explain further</span></button>
            </div>
        );
    }

    if (hasFeedbackPrompt) {
        const animationDelayMs = isAnimating ? typewriterHelper.charIndex * 20 : 0;
        const buttonContainerStyle: React.CSSProperties = isAnimating ? { opacity: 0, animation: `fadeIn 0.5s forwards`, animationDelay: `${animationDelayMs}ms` } : {};
        elements.push(
            <div key="feedback-prompt-buttons" className="flex items-center gap-2 mt-4" style={buttonContainerStyle}>
                <button onClick={() => onSendMessage('Try again')} className="menu-button w-fit"><span className="text-sm">Try again</span></button>
                <button onClick={() => onSendMessage('Continue to next paragraph')} className="menu-button w-fit"><span className="text-sm">Continue to next paragraph</span></button>
            </div>
        );
    }

    return elements;
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="font-user text-black text-right max-w-lg">
            {message.imageUrl && <img src={message.imageUrl} alt="Homework upload" className="max-w-xs w-full mx-auto my-2 rounded-lg shadow-md border border-slate-200" />}
            {message.text && <div className="mt-1 px-4">{message.text}</div>}
        </div>
      </div>
    );
  }

  if (isStreaming) {
    return (
        <div className="flex items-start gap-2">
            <div className="flex-1">
                <div className="text-blue-900" style={{color: '#00008B', whiteSpace: 'pre-wrap'}}>
                    {message.text}
                    <span className="blinking-cursor" />
                </div>
            </div>
        </div>
    );
  }

  const content = renderFormattedText(message.text);
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <div className="text-blue-900" style={{color: '#00008B', whiteSpace: 'pre-wrap'}}>
          {content}
        </div>
      </div>
    </div>
  );
};

export default Message;