import React, { useState } from 'react';
import { MAIN_MENU_OPTIONS, AQA_TOPICS, MainMenuOption } from '../constants';
import { CloseIcon, ChevronDownIcon, SettingsIcon, DocumentIcon, HomeIcon } from './Icons';
import { ChatThread } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (prompt: string, isPro: boolean, action: 'chat', label: string) => void;
  teacherFont: string;
  userFont: string;
  onTeacherFontChange: (font: string) => void;
  onUserFontChange: (font: string) => void;
  teacherVoice: string;
  onTeacherVoiceChange: (voice: string) => void;
  chatThreads: ChatThread[];
  activeThreadId: string | null;
  onSwitchThread: (threadId: string) => void;
  onDeleteThread: (threadId: string) => void;
  onGoHome: () => void;
}

const formatTimestamp = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffSeconds < 60) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  onSelectOption, 
  teacherFont, 
  userFont, 
  onTeacherFontChange, 
  onUserFontChange, 
  teacherVoice, 
  onTeacherVoiceChange,
  chatThreads,
  activeThreadId,
  onSwitchThread,
  onDeleteThread,
  onGoHome
}) => {
  const [isTopicsOpen, setIsTopicsOpen] = useState(false);
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});
  const [openTraining, setOpenTraining] = useState<Record<string, boolean>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isActiveLessonsOpen, setIsActiveLessonsOpen] = useState(false);
  const [visibleLessons, setVisibleLessons] = useState(5);
  const [hoveredThreadId, setHoveredThreadId] = useState<string | null>(null);
  const [openMarker, setOpenMarker] = useState<string | null>(null);

  const teacherFontOptions = [
    { name: 'Clean & Modern (Default)', value: 'Inter' },
    { name: 'Handwritten', value: 'Kalam' },
    { name: 'Professional Sans', value: 'Poppins' },
    { name: 'Typewriter', value: 'Special Elite' },
  ];
  const userFontOptions = [
    { name: 'Clean & Modern (Default)', value: 'Inter' },
    { name: 'Handwritten', value: 'Grape Nuts' },
    { name: 'Neat Handwritten', value: 'Patrick Hand' },
    { name: 'Messy Handwritten', value: 'Square Peg' },
    { name: 'Professional Sans', value: 'Poppins' },
  ];
  const teacherVoiceOptions = [
      { name: 'Standard Teacher', value: 'standard' },
      { name: 'Evil Villain', value: 'villain' },
  ];

  const handleOptionClick = (option: MainMenuOption) => {
    if (option.label === 'Mini-lessons') {
      setIsTopicsOpen(prev => !prev);
    } else if (option.subOptions) {
      setOpenTraining(prev => ({ ...prev, [option.label]: !prev[option.label] }));
    } else {
      onSelectOption(option.prompt, option.isPro, option.action, option.label);
    }
  };

  const toggleTopic = (heading: string) => {
    setOpenTopics(prev => ({ ...prev, [heading]: !prev[heading] }));
  };
  
  const sortedThreads = [...chatThreads]
    .filter(t => t.isVisibleInHistory !== false && !t.isStudyPlan)
    .sort((a, b) => b.lastUpdated - a.lastUpdated);

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div 
        className={`fixed top-0 left-0 w-80 h-full bg-stone-100 z-50 transform transition-transform shadow-2xl p-6 overflow-y-auto font-marker text-purple-700 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/lined-paper.png')` }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-600 hover:bg-purple-100/50 rounded-full">
          <CloseIcon />
        </button>
        
        <h2 className="text-3xl font-bold text-slate-800 mb-8" style={{fontFamily: "'Permanent Marker', cursive"}}>Menu</h2>

        <div className="space-y-4">
          <ul className="space-y-0.5 leading-tight">
            <li>
              <button 
                onClick={onGoHome} 
                className="w-full text-left py-2 rounded-md hover:bg-purple-100/50 transition-colors flex items-center text-lg font-medium"
              >
                <HomeIcon className="inline h-5 w-5 mr-3 text-indigo-500/80" />
                Home
              </button>
            </li>
            {MAIN_MENU_OPTIONS.map(opt => {
              // Manually insert Active Lessons before "Study for a test"
              if (opt.label === "Study for a test") {
                return (
                  <React.Fragment key="active-lessons-fragment">
                    <li>
                      <button
                        onClick={() => setIsActiveLessonsOpen(prev => !prev)}
                        className="w-full text-left py-2 rounded-md hover:bg-purple-100/50 transition-colors flex justify-between items-center text-lg font-medium"
                      >
                        <span className="flex items-center">
                          <DocumentIcon className="inline h-5 w-5 mr-3 text-indigo-500/80" />
                          <span className="text-amber-600">Active Lessons</span>
                        </span>
                        <ChevronDownIcon className={`h-6 w-6 transition-transform duration-200 ${isActiveLessonsOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </li>
                    {isActiveLessonsOpen && (
                      <li className="pt-1 pb-2 space-y-0.5 sidebar-font">
                        <ul className="mt-2 space-y-1">
                          {sortedThreads.slice(0, visibleLessons).map(thread => (
                            <li 
                              key={thread.id}
                              onMouseEnter={() => setHoveredThreadId(thread.id)}
                              onMouseLeave={() => setHoveredThreadId(null)}
                              className="relative"
                            >
                              <button 
                                onClick={() => onSwitchThread(thread.id)}
                                className={`w-full text-left p-2 rounded-md text-sm transition-colors flex items-center gap-3 ${
                                  thread.id === activeThreadId ? 'bg-purple-200/60 font-semibold text-purple-800' : 'hover:bg-purple-100/50 text-slate-700'
                                }`}
                              >
                                <div className="flex-1 truncate">
                                  <p className="truncate">{thread.title}</p>
                                  <p className="text-xs text-slate-500">{formatTimestamp(thread.lastUpdated)}</p>
                                </div>
                              </button>
                              {hoveredThreadId === thread.id && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); onDeleteThread(thread.id); }}
                                  className="absolute top-1/2 right-2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 rounded-full bg-slate-100/50 hover:bg-red-100/50 transition-colors"
                                  aria-label="Delete lesson"
                                >
                                  <CloseIcon className="h-4 w-4" />
                                </button>
                              )}
                            </li>
                          ))}
                          {sortedThreads.length > visibleLessons && (
                            <li>
                              <button onClick={() => setVisibleLessons(v => v + 5)} className="w-full text-center text-sm text-slate-600 hover:underline p-1 mt-1">
                                Show more...
                              </button>
                            </li>
                          )}
                           {sortedThreads.length === 0 && (
                               <p className="text-xs text-slate-500 p-2 text-center">No active lessons yet.</p>
                           )}
                        </ul>
                      </li>
                    )}
                    {/* Now render the "Study for a test" item */}
                    <React.Fragment key={opt.label}>
                       <li>
                          <button onClick={() => handleOptionClick(opt)} className="w-full text-left py-2 rounded-md hover:bg-purple-100/50 transition-colors flex justify-between items-center text-lg font-medium">
                            <span><opt.icon className="inline h-5 w-5 mr-3 text-indigo-500/80" />{opt.label}</span>
                             <ChevronDownIcon className={`h-6 w-6 transition-transform duration-200 ${openTraining[opt.label] ? 'rotate-180' : ''}`} />
                          </button>
                        </li>
                        {openTraining[opt.label] && opt.subOptions && (
                          <li className="pt-1 pb-2 space-y-0.5 sidebar-font">
                            <ul className="space-y-0 mt-1 ml-6 list-none">
                              {opt.subOptions.map(subOpt => (
                                <li key={subOpt.label}>
                                  <button
                                    onClick={() => onSelectOption(subOpt.prompt, subOpt.isPro, subOpt.action, subOpt.label)}
                                    className="w-full text-left p-1 rounded hover:bg-purple-100/50 transition-colors font-normal text-black flex items-center"
                                    style={{ fontSize: '0.75rem' }}
                                  >
                                    <span className="text-purple-700 w-6 text-center text-lg leading-none">▹</span>
                                    <span>{subOpt.label}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </li>
                        )}
                    </React.Fragment>
                  </React.Fragment>
                )
              }
              // Default rendering for all other items
              return (
                <React.Fragment key={opt.label}>
                  <li>
                    <button 
                      onClick={() => handleOptionClick(opt)} 
                      className="w-full text-left py-2 rounded-md hover:bg-purple-100/50 transition-colors flex justify-between items-center text-lg font-medium"
                    >
                      <span>
                        <opt.icon className="inline h-5 w-5 mr-3 text-indigo-500/80" />
                        {opt.label}
                        {opt.isPro && <span className="text-xs ml-2 text-white bg-indigo-500 rounded-full px-2 py-0.5 align-middle">PRO</span>}
                      </span>
                       {(opt.label === 'Mini-lessons' || opt.subOptions) && (
                        <ChevronDownIcon className={`h-6 w-6 transition-transform duration-200 ${
                            (opt.label === 'Mini-lessons' && isTopicsOpen) || (opt.subOptions && openTraining[opt.label])
                            ? 'rotate-180' 
                            : ''
                        }`} />
                      )}
                    </button>
                  </li>
                  {opt.label === 'Mini-lessons' && isTopicsOpen && (
                     <li className="pt-1 pb-2 space-y-0.5 sidebar-font">
                        {AQA_TOPICS.map((category) => (
                          <div key={category.heading}>
                             <button
                                onClick={() => toggleTopic(category.heading)}
                                className="w-full text-left py-1 text-base rounded hover:bg-purple-100/50 transition-colors flex justify-between items-center font-normal text-slate-600"
                              >
                                <span>{category.heading}</span>
                                <ChevronDownIcon className={`h-5 w-5 transition-transform duration-200 ${openTopics[category.heading] ? 'rotate-180' : ''}`} />
                              </button>
                              {openTopics[category.heading] && (
                                <ul className="space-y-0 mt-1 ml-2 list-none">
                                  {category.subtopics.map((subtopic) => (
                                    <li key={subtopic}>
                                      <button
                                        onClick={() => onSelectOption(`I'd like a mini-lesson on "${subtopic}"`, false, 'chat', `Mini-lesson: ${subtopic.split(' ').slice(1).join(' ')}`)}
                                        className="w-full text-left p-1 rounded hover:bg-purple-100/50 transition-colors font-normal text-black flex items-center"
                                        style={{fontSize: '0.8rem'}}
                                      >
                                        <span className="text-purple-700 w-6 text-center text-lg leading-none">▸</span>
                                        <span>{subtopic.split(' ').slice(1).join(' ')}</span>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                          </div>
                        ))}
                     </li>
                  )}
                  {opt.label === "Long Answer Q's" && opt.subOptions && openTraining[opt.label] && (
                    (() => {
                        const markerGroups: { [key: string]: typeof opt.subOptions } = { '4': [], '6': [], '9': [], '12': [] };
                        for (const subOpt of opt.subOptions) {
                            const match = subOpt.label.match(/\b(4|6|9|12)\b/);
                            if (match && markerGroups[match[1]]) {
                                markerGroups[match[1]].push(subOpt);
                            }
                        }

                        return (
                            <li className="pt-1 pb-2 space-y-0.5 sidebar-font">
                                <ul className="space-y-0 mt-1 ml-2 list-none">
                                    {Object.entries(markerGroups).map(([marker, subOptions]) => (
                                        subOptions.length > 0 && (
                                            <li key={marker}>
                                                <button
                                                    onClick={() => setOpenMarker(prev => prev === marker ? null : marker)}
                                                    className="w-full text-left p-1 rounded hover:bg-purple-100/50 transition-colors font-normal text-black flex items-center justify-between"
                                                    style={{ fontSize: '0.8rem' }}
                                                >
                                                    <span className="flex items-center">
                                                        <span className="text-purple-700 w-6 text-center text-lg leading-none">▸</span>
                                                        <span>{marker}-marker question</span>
                                                    </span>
                                                    <ChevronDownIcon className={`h-5 w-5 transition-transform duration-200 ${openMarker === marker ? 'rotate-180' : ''}`} />
                                                </button>
                                                {openMarker === marker && (
                                                    <ul className="space-y-0 mt-1 ml-6 list-none">
                                                        {subOptions.map(subOpt => (
                                                            <li key={subOpt.label}>
                                                                <button
                                                                    onClick={() => onSelectOption(subOpt.prompt, subOpt.isPro, subOpt.action, subOpt.label)}
                                                                    className="w-full text-left p-1 rounded hover:bg-purple-100/50 transition-colors font-normal text-black flex items-center"
                                                                    style={{ fontSize: '0.75rem' }}
                                                                >
                                                                    <span className="text-purple-700 w-6 text-center text-lg leading-none">▹</span>
                                                                    <span>{subOpt.label.startsWith('Learn') ? 'Learn' : 'Practice'}</span>
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </li>
                                        )
                                    ))}
                                </ul>
                            </li>
                        );
                    })()
                  )}
                </React.Fragment>
              )
            })}
          </ul>
          
          <div className="pt-6 border-t-2 border-slate-200/50 space-y-4">
             {/* Settings Section */}
            <div>
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="w-full text-left py-2 rounded-md hover:bg-purple-100/50 transition-colors flex justify-between items-center text-lg font-medium"
              >
                <span>
                  <SettingsIcon className="inline h-5 w-5 mr-3 text-indigo-500/80" />
                  Settings
                </span>
                <ChevronDownIcon className={`h-6 w-6 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`} />
              </button>
              {isSettingsOpen && (
                <div className="pt-2 pb-2 pl-4 space-y-4 sidebar-font">
                  <div className="space-y-1">
                    <label htmlFor="teacher-font-select" className="block text-sm font-medium text-slate-700">
                      Teacher's Font
                    </label>
                    <select
                      id="teacher-font-select"
                      value={teacherFont}
                      onChange={(e) => onTeacherFontChange(e.target.value)}
                      className="settings-select"
                    >
                      {teacherFontOptions.map(font => (
                        <option key={font.value} value={font.value} style={{ fontFamily: `'${font.value}', sans-serif` }}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="user-font-select" className="block text-sm font-medium text-slate-700">
                      Your Font
                    </label>
                    <select
                      id="user-font-select"
                      value={userFont}
                      onChange={(e) => onUserFontChange(e.target.value)}
                      className="settings-select"
                    >
                      {userFontOptions.map(font => (
                        <option key={font.value} value={font.value} style={{ fontFamily: `'${font.value}', sans-serif` }}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </div>
                   <div className="space-y-1">
                    <label htmlFor="teacher-voice-select" className="block text-sm font-medium text-slate-700">
                      Teacher's Voice
                    </label>
                    <select
                      id="teacher-voice-select"
                      value={teacherVoice}
                      onChange={(e) => onTeacherVoiceChange(e.target.value)}
                      className="settings-select"
                    >
                      {teacherVoiceOptions.map(voice => (
                        <option key={voice.value} value={voice.value}>
                          {voice.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;