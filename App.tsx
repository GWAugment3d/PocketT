
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, AppState, ChatThread } from './types';
import { getChatSession, generateImage, generateSpeechForSentences, ChatSession } from './services/geminiService';
import InitialScreen from './components/InitialScreen';
import Sidebar from './components/Sidebar';
import ChatInput from './components/ChatInput';
import Message from './components/Message';
import StudyPlannerScreen from './components/StudyPlannerScreen';
import FlashcardScreen from './components/FlashcardScreen';
import InteractiveChoices from './components/InteractiveChoices';
import { MenuIcon, Logo } from './components/Icons';

// --- Audio Helper Functions ---

// FIX: Corrected the decode function to properly convert a base64 string to a Uint8Array.
function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// FIX: Added the missing decodeAudioData function to process raw PCM audio data into an AudioBuffer.
async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

// --- Teacher Font Styles ---
const teacherFontStyles = {
    'Inter': { family: "'Inter', sans-serif", size: '16px', lineHeight: '1.5' },
    'Kalam': { family: "'Kalam', cursive", size: '18px', lineHeight: '1.4' },
    'Poppins': { family: "'Poppins', sans-serif", size: '14px', lineHeight: '1.5' },
    'Special Elite': { family: "'Special Elite', monospace", size: '15px', lineHeight: '1.6' },
};

const userFontStyles = {
    'Inter': { family: "'Inter', sans-serif", size: '16px', lineHeight: '1.5' },
    'Grape Nuts': { family: "'Grape Nuts', cursive", size: '22px', lineHeight: '1.2' },
    'Patrick Hand': { family: "'Patrick Hand', cursive", size: '20px', lineHeight: '1.3' },
    'Square Peg': { family: "'Square Peg', cursive", size: '24px', lineHeight: '1.2' },
    'Poppins': { family: "'Poppins', sans-serif", size: '16px', lineHeight: '1.4' },
};

const teacherVoices: Record<string, { key: string; name: string; ttsVoice: string; }> = {
  standard: {
    key: 'standard',
    name: 'Standard Teacher',
    ttsVoice: 'Fenrir',
  },
  villain: {
    key: 'villain',
    name: 'Evil Villain',
    ttsVoice: 'Puck', // A different male voice
  }
};

export default function App() {
  const [appState, setAppState] = useState<AppState>('initial');
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [currentChatSession, setCurrentChatSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [initialAvatar, setInitialAvatar] = useState('https://raw.githubusercontent.com/GWAugment3d/pocketteacherimages/main/landingpageavatar.jpg');
  
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [highlightedSentenceInfo, setHighlightedSentenceInfo] = useState<{ messageId: string; sentenceIndex: number } | null>(null);
  const [audioCache, setAudioCache] = useState<Map<string, string | string[]>>(new Map());
  const [audioLoadingIds, setAudioLoadingIds] = useState<Set<string>>(new Set());
  const [imageCache, setImageCache] = useState<Map<string, string>>(new Map());
  const [isGeneratingLongResponse, setIsGeneratingLongResponse] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [isInitialLoadForThread, setIsInitialLoadForThread] = useState(false);
  const [initialPromptToSend, setInitialPromptToSend] = useState<string | null>(null);

  const [interactiveStep, setInteractiveStep] = useState<'none' | 'select-main-topic' | 'select-sub-topic'>('none');
  const [selectedMainTopic, setSelectedMainTopic] = useState<string | null>(null);
  const [practiceSetup, setPracticeSetup] = useState<{ marker: number | null }>({ marker: null });

  const [teacherFont, setTeacherFont] = useState('Inter');
  const [userFont, setUserFont] = useState('Inter');
  const [teacherVoice, setTeacherVoice] = useState('standard');
  
  const [studyPlan, setStudyPlan] = useState<{ content: string; completedTasks: Record<string, boolean> } | null>(null);
  const [flashcardInitialTopic, setFlashcardInitialTopic] = useState<string | null>(null);


  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackChainRef = useRef<(() => void) | null>(null);
  const lastMessageContainerRef = useRef<HTMLDivElement | null>(null);
  const prevIsLoadingRef = useRef(false);
  const prevIsGeneratingLongResponseRef = useRef(false);

  const activeThread = chatThreads.find(t => t.id === activeThreadId);
  const messages = activeThread ? activeThread.messages : [];
  const isChatActive = appState === 'chatting';

  // FIX: Moved all useCallback and handler functions before useEffect hooks to resolve
  // the "used before its declaration" error and improve code organization.
  const stopSpeech = useCallback(() => {
    playbackChainRef.current = null; // Break the recursive chain for sequences
    if (activeAudioSourceRef.current) {
        try {
            activeAudioSourceRef.current.stop();
        } catch (e) {
            // Can throw error if context is closed or already stopped
        }
        activeAudioSourceRef.current = null;
    }
    setCurrentlyPlayingId(null);
    setHighlightedSentenceInfo(null);
  }, []);

  const updateThread = useCallback((threadId: string, updates: Partial<ChatThread>) => {
      setChatThreads(prev =>
          prev.map(thread =>
              thread.id === threadId ? { ...thread, ...updates, lastUpdated: Date.now() } : thread
          )
      );
  }, []);

  const generateAndCacheAudio = useCallback(async (text: string, cacheKey: string) => {
        if (audioCache.has(cacheKey)) {
            return;
        }
        setAudioLoadingIds(prev => new Set(prev).add(cacheKey));
        try {
            const audioDataArray = await generateSpeechForSentences(text, teacherVoice);
            if (audioDataArray) {
                setAudioCache(prev => {
                    if (prev.has(cacheKey)) return prev; // Avoid race conditions
                    return new Map(prev).set(cacheKey, audioDataArray);
                });
            } else {
                console.error(`Failed to generate all audio sentences for key ${cacheKey}.`);
            }
        } catch (error) {
            console.error(`Error pre-fetching speech for key ${cacheKey}:`, error);
        } finally {
            setAudioLoadingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(cacheKey);
                return newSet;
            });
        }
    }, [audioCache, teacherVoice]);
    
  const startNewChat = useCallback((initialPrompt: string, title: string, useProModel: boolean = false, options?: { isVisibleInHistory?: boolean }) => {
    stopSpeech();
    
    const modelName = useProModel ? 'gemini-3.1-pro-preview' : 'gemini-3-flash-preview';
    const config = useProModel ? { thinkingConfig: { thinkingLevel: 'HIGH' } } : {};
    
    const newThread: ChatThread = {
        id: `thread-${Date.now()}`,
        title: title,
        messages: [],
        lastUpdated: Date.now(),
        modelName,
        config,
        history: [],
        status: 'active',
        isVisibleInHistory: options?.isVisibleInHistory ?? true,
    };

    setChatThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setAppState('chatting');
    setIsSidebarOpen(false);

    // Set a trigger state instead of using setTimeout to avoid race conditions
    setInitialPromptToSend(initialPrompt);
  }, [stopSpeech]);

  const sendMessage = useCallback(async (text: string, imageUrl: string | null = null, displayUserMessage = true) => {
      if (!text.trim() && !imageUrl) return;

      if (appState === 'initial') {
          startNewChat(text, text.slice(0, 30) + (text.length > 30 ? '...' : ''));
          return;
      }

      if (!currentChatSession || !activeThreadId) {
          console.error("Cannot send message, no active chat session.");
          return;
      }
      
      stopSpeech();

      const isStudyPlanGeneration = activeThread?.title === 'Study Plan Generation';
      const isLongResponseTask = /(4|6|9|12)[-\s]?marker/i.test(text) || isStudyPlanGeneration;

      if (isLongResponseTask && !isStudyPlanGeneration) {
          setIsGeneratingLongResponse(true);
          setLoadingText('Building your case study...');
      }

      let currentMessages = activeThread?.messages || [];
      if (displayUserMessage) {
        const userMessage: ChatMessage = { 
          id: `user-${Date.now()}-${Math.random()}`, 
          author: 'user', 
          text,
          imageUrl: imageUrl ?? undefined,
        };
        currentMessages = [...currentMessages, userMessage];
      }
      
      const modelMessageId = `model-${Date.now()}-${Math.random()}`;
      const modelPlaceholder: ChatMessage = { id: modelMessageId, author: 'model', text: '' };
      currentMessages = [...currentMessages, modelPlaceholder];

      updateThread(activeThreadId, { messages: currentMessages });
      setIsLoading(true);

      let modelResponse = '';
      
      try {
          const messageParts: any[] = [];
          if (text) {
              messageParts.push({ text });
          }
          if (imageUrl) {
              const mimeType = imageUrl.match(/data:(.*);base64,/)?.[1];
              const base64Data = imageUrl.split(',')[1];
              if (mimeType && base64Data) {
                  messageParts.push({
                      inlineData: {
                          mimeType,
                          data: base64Data
                      }
                  });
              }
          }

          if (messageParts.length === 0) {
              setIsLoading(false);
              return;
          }

          const stream = await currentChatSession.sendMessageStream({ message: messageParts });
        
          for await (const chunk of stream) {
              modelResponse += chunk.text;

              setChatThreads(prev => prev.map(thread => {
                  if (thread.id !== activeThreadId) return thread;
                  const newMessages = thread.messages.map(msg => 
                      msg.id === modelMessageId ? { ...msg, text: modelResponse } : msg
                  );
                  return { ...thread, messages: newMessages };
              }));
          }

      } catch (error) {
          console.error('Error sending message:', error);
          setChatThreads(prev => prev.map(thread => {
              if (thread.id !== activeThreadId) return thread;
              const newMessages = thread.messages.map(msg => 
                  msg.id === modelMessageId ? { ...msg, text: 'Oops! Something went wrong. Please try again.' } : msg
              );
              return { ...thread, messages: newMessages };
          }));
      } finally {
          setIsLoading(false);
          const finalHistory = await currentChatSession.getHistory();
          updateThread(activeThreadId, { history: finalHistory });
          
          const wasStudyPlanGeneration = chatThreads.find(t => t.id === activeThreadId)?.title === "Study Plan Generation";
          const isFinishedStudyPlan = wasStudyPlanGeneration && /<study-plan>/.test(modelResponse);

          if (isFinishedStudyPlan) {
              const newPlan = { content: modelResponse, completedTasks: {} };
              setStudyPlan(newPlan);

              const newThread: ChatThread = {
                  id: `thread-${Date.now()}`,
                  title: 'My Study Timetable',
                  messages: [{ id: `model-${Date.now()}`, author: 'model', text: modelResponse }],
                  lastUpdated: Date.now(),
                  modelName: 'gemini-3-flash-preview',
                  config: {},
                  history: [],
                  status: 'active',
                  isStudyPlan: true
              };
              
              const generationThreadId = activeThreadId;
              setChatThreads(prev => [newThread, ...prev.filter(t => t.id !== generationThreadId)]);
              setActiveThreadId(newThread.id);
              setIsGeneratingLongResponse(false); // Explicitly turn off loader for study plan
          } else if (isLongResponseTask) { // Handle other long tasks (e.g., case studies)
              const finishLongResponse = () => {
                  setIsGeneratingLongResponse(false);
              };

              if (/<case-study/i.test(modelResponse)) {
                  const caseStudyRegex = /<case-study title="([^"]*)">([\s\S]*?)<\/case-study>/g;
                  const matches = Array.from(modelResponse.matchAll(caseStudyRegex));
                  const imagePromises: Promise<void>[] = [];

                  matches.forEach(match => {
                      const title = match[1];
                      const content = match[2];
                      const caseStudyId = `${modelMessageId}-casestudy-${match.index}`;

                      if (!imageCache.has(caseStudyId)) {
                          const promise = generateImage(title, content)
                              .then(imageData => {
                                  if (imageData) {
                                      setImageCache(prev => new Map(prev).set(caseStudyId, imageData));
                                  }
                              }).catch(err => {
                                  console.error(`Failed to generate image for ${title}:`, err);
                              });
                          imagePromises.push(promise);
                      }
                      
                      const narrationText = `${title}. ${content.replace(/<question>/g, ' Question: ').replace(/<\/question>/g, '')}`.trim();
                      generateAndCacheAudio(narrationText, caseStudyId);
                  });

                  if (imagePromises.length > 0) {
                      Promise.all(imagePromises).finally(finishLongResponse);
                  } else {
                      finishLongResponse();
                  }
              } else {
                  finishLongResponse();
              }
          }
      }
  }, [currentChatSession, stopSpeech, activeThreadId, activeThread, generateAndCacheAudio, imageCache, updateThread, chatThreads, setStudyPlan, startNewChat]);

  // --- Thread & State Management ---
  useEffect(() => {
    try {
        const savedThreads = localStorage.getItem('chatThreads');
        if (savedThreads) {
            const parsedThreads: ChatThread[] = JSON.parse(savedThreads);
            setChatThreads(parsedThreads);
            if (!activeThreadId && parsedThreads.length > 0) {
                const sortedThreads = [...parsedThreads].sort((a, b) => b.lastUpdated - a.lastUpdated);
                setActiveThreadId(sortedThreads[0].id);
                setIsInitialLoadForThread(true);
            }
        }
        const savedPlan = localStorage.getItem('studyPlanState');
        if (savedPlan) {
            setStudyPlan(JSON.parse(savedPlan));
        }
    } catch (error) {
        console.error("Failed to load or parse data from localStorage:", error);
        localStorage.removeItem('chatThreads');
        localStorage.removeItem('studyPlanState');
    }
  }, []); // Only on initial load

  useEffect(() => {
      if (chatThreads.length > 0) {
          localStorage.setItem('chatThreads', JSON.stringify(chatThreads));
      }
  }, [chatThreads]);

  useEffect(() => {
    if (studyPlan) {
        localStorage.setItem('studyPlanState', JSON.stringify(studyPlan));
    }
  }, [studyPlan]);

  useEffect(() => {
    // When the active thread changes, create a new chat session for it
    const thread = chatThreads.find(t => t.id === activeThreadId);
    if (thread) {
        const session = getChatSession(thread.modelName, thread.config, thread.history);
        setCurrentChatSession(session);
    } else {
        setCurrentChatSession(null);
    }
  }, [activeThreadId, chatThreads]);

  // This effect runs when a new chat is started, to send the initial prompt
  useEffect(() => {
    if (initialPromptToSend && currentChatSession && activeThreadId) {
        const thread = chatThreads.find(t => t.id === activeThreadId);
        if (thread && thread.messages.length === 0) {
            sendMessage(initialPromptToSend, null, false);
            setInitialPromptToSend(null); // Reset trigger
        }
    }
  }, [initialPromptToSend, currentChatSession, chatThreads, activeThreadId, sendMessage]);


  // --- Font Management ---
  useEffect(() => {
      const savedTeacherFont = localStorage.getItem('teacherFont');
      if (savedTeacherFont && teacherFontStyles[savedTeacherFont]) {
          setTeacherFont(savedTeacherFont);
      }
      const savedUserFont = localStorage.getItem('userFont');
      if (savedUserFont && userFontStyles[savedUserFont]) {
          setUserFont(savedUserFont);
      }
  }, []);

  useEffect(() => {
      const styles = teacherFontStyles[teacherFont] || teacherFontStyles['Inter'];
      document.documentElement.style.setProperty('--font-teacher', styles.family);
      document.documentElement.style.setProperty('--font-size-teacher', styles.size);
      document.documentElement.style.setProperty('--line-height-teacher', styles.lineHeight);
      localStorage.setItem('teacherFont', teacherFont);
  }, [teacherFont]);

  useEffect(() => {
      const styles = userFontStyles[userFont] || userFontStyles['Grape Nuts'];
      document.documentElement.style.setProperty('--font-user', styles.family);
      document.documentElement.style.setProperty('--font-size-user', styles.size);
      document.documentElement.style.setProperty('--line-height-user', styles.lineHeight);
      localStorage.setItem('userFont', userFont);
  }, [userFont]);

  // --- Voice Management ---
  useEffect(() => {
    const savedTeacherVoice = localStorage.getItem('teacherVoice');
    if (savedTeacherVoice && teacherVoices[savedTeacherVoice]) {
        setTeacherVoice(savedTeacherVoice);
    }
  }, []);

  useEffect(() => {
      localStorage.setItem('teacherVoice', teacherVoice);
  }, [teacherVoice]);


  // --- Draggable Avatar Logic Removed ---
  useEffect(() => {
    const wasLoading = prevIsLoadingRef.current;
    const wasGeneratingLong = prevIsGeneratingLongResponseRef.current;
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    
    if (isInitialLoadForThread) {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
        setIsInitialLoadForThread(false);
        return;
    }

    const justFinishedLongResponse = wasGeneratingLong && !isGeneratingLongResponse;
    const justFinishedRegularResponse = wasLoading && !isLoading && !isGeneratingLongResponse;

    if (justFinishedLongResponse || (justFinishedRegularResponse && lastMessage?.author === 'model')) {
        lastMessageContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }

    prevIsLoadingRef.current = isLoading;
    prevIsGeneratingLongResponseRef.current = isGeneratingLongResponse;
  }, [messages, isLoading, isGeneratingLongResponse, isInitialLoadForThread]);

  
  const playAudio = useCallback(async (audioData: string | string[], messageId: string) => {
    stopSpeech(); // Stop any currently playing audio and reset state

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    setCurrentlyPlayingId(messageId);

    const playNext = async (index: number) => {
        if (!Array.isArray(audioData) || index >= audioData.length) {
            stopSpeech();
            return;
        }

        playbackChainRef.current = () => playNext(index + 1);
        setHighlightedSentenceInfo({ messageId, sentenceIndex: index });

        try {
            const audioBuffer = await decodeAudioData(decode(audioData[index]), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            
            source.onended = () => {
                activeAudioSourceRef.current = null;
                if (playbackChainRef.current) {
                    playbackChainRef.current();
                }
            };

            source.start();
            activeAudioSourceRef.current = source;
        } catch (error) {
            console.error("Audio playback error:", error);
            stopSpeech();
        }
    };

    if (Array.isArray(audioData)) {
        playNext(0);
    } else {
        try {
            const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.onended = () => stopSpeech();
            source.start();
            activeAudioSourceRef.current = source;
        } catch (error) {
            console.error("Audio playback error:", error);
            stopSpeech();
        }
    }
  }, [stopSpeech]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stopSpeech]);

  const switchThread = useCallback((threadId: string) => {
    if (threadId !== activeThreadId) {
        stopSpeech();
        setActiveThreadId(threadId);
        setAppState('chatting');
        setIsSidebarOpen(false);
        setIsInitialLoadForThread(true);
    }
  }, [activeThreadId, stopSpeech]);

  const deleteThread = useCallback((threadIdToDelete: string) => {
    if (!window.confirm("Are you sure you want to delete this lesson? This cannot be undone.")) {
      return;
    }

    setChatThreads(prev => {
      const newThreads = prev.filter(t => t.id !== threadIdToDelete);
      if (activeThreadId === threadIdToDelete) {
        if (newThreads.length > 0) {
          const sorted = [...newThreads].sort((a,b) => b.lastUpdated - a.lastUpdated);
          switchThread(sorted[0].id);
        } else {
          setActiveThreadId(null);
          setAppState('initial');
        }
      }
      return newThreads;
    });
  }, [activeThreadId, switchThread]);


  const handleInteractiveChoice = (choice: string, type: 'main' | 'sub') => {
        // Practice Question Flow
        if (practiceSetup.marker !== null) {
            if (type === 'main') {
                const modelMessage: ChatMessage = { id: `model-${Date.now()}-${Math.random()}`, author: 'model', text: `Great! Which specific part of '${choice.split(' ').slice(1).join(' ')}' would you like to focus on?` };
                updateThread(activeThreadId!, { messages: [...(activeThread?.messages || []), modelMessage] });
                setSelectedMainTopic(choice);
                setInteractiveStep('select-sub-topic');
            } else { // 'sub', final step
                const prompt = `I'd like to practice a ${practiceSetup.marker}-marker question on the topic of "${choice}".`;
                const title = `Practice: ${practiceSetup.marker}-marker (${choice.split(' ').slice(1).join(' ')})`;
                const isPro = [9, 12].includes(practiceSetup.marker);
                
                const setupThreadId = activeThreadId;

                setInteractiveStep('none');
                setSelectedMainTopic(null);
                setPracticeSetup({ marker: null });
                
                startNewChat(prompt, title, isPro);

                // This is slightly delayed to ensure the new chat is created before removing the old one
                setTimeout(() => {
                    setChatThreads(prev => prev.filter(t => t.id !== setupThreadId));
                }, 100);
            }
            return;
        }

        // Mini-lesson Flow
        if (type === 'main') {
            const modelMessage: ChatMessage = { id: `model-${Date.now()}-${Math.random()}`, author: 'model', text: "Nice choice — which part of that topic? Here are your options:" };
            updateThread(activeThreadId!, { messages: [...(activeThread?.messages || []), modelMessage] });
            setSelectedMainTopic(choice);
            setInteractiveStep('select-sub-topic');
        } else { // 'sub'
            sendMessage(`I'd like a mini-lesson on "${choice}"`, null, false);
            setInteractiveStep('none');
            setSelectedMainTopic(null);
        }
    };

    const handleCreateStudyPlan = (daysRemaining: string, topics: string, hoursPerDay: string) => {
        setIsGeneratingLongResponse(true);
        setLoadingText('Creating your personalised study plan...');
        
        const prompt = `
            GENERATE STUDY PLAN.
            Days Remaining: ${daysRemaining}
            Topics: "${topics}"
            Hours Per Day: "${hoursPerDay}"
        `;
        
        startNewChat(prompt, "Study Plan Generation", true, { isVisibleInHistory: false });
    };

    const handleToggleStudyTask = useCallback((taskText: string) => {
        setStudyPlan(prev => {
            if (!prev) return null;
            const newCompletedTasks = { ...prev.completedTasks };
            if (newCompletedTasks[taskText]) {
                delete newCompletedTasks[taskText];
            } else {
                newCompletedTasks[taskText] = true;
            }
            return { ...prev, completedTasks: newCompletedTasks };
        });
    }, []);

    const handleStartStudyTask = useCallback((type: string, topic: string) => {
        let prompt = '';
        let title = '';
        let isPro = false;
        
        if (type === 'mini-lesson') {
            prompt = `I'd like a mini-lesson on "${topic}"`;
            title = `Mini-lesson: ${topic}`;
        } else if (type.startsWith('practice-')) {
            const marker = type.replace('practice-', '').replace('-marker', '');
            prompt = `I'd like to practice a ${marker}-marker question on the topic of "${topic}".`;
            title = `Practice: ${marker}-marker (${topic})`;
            if (['9', '12'].includes(marker)) {
                isPro = true;
            }
        } else if (type === 'quiz') {
            prompt = `I'd like to take a quiz on "${topic}".`;
            title = `Quiz: ${topic}`;
            isPro = false;
        } else if (type === 'flashcards') {
            setFlashcardInitialTopic(topic);
            setAppState('flashcards');
        }
        
        if (prompt) {
            startNewChat(prompt, title, isPro);
        }
    }, [startNewChat]);


    const handleMenuOptionSelect = (prompt: string, isPro: boolean, action: 'chat' = 'chat', label: string) => {
        setInteractiveStep('none');
        setSelectedMainTopic(null);
        setPracticeSetup({ marker: null });

        const practiceMatch = label.match(/Practice a (\d+)-marker/);
        if (practiceMatch) {
            const marker = parseInt(practiceMatch[1], 10);
            setPracticeSetup({ marker });
            
            const threadTitle = `Practice: ${marker}-marker setup`;
            const initialMessage = "Okay, let's set up a practice question. What topic area would you like to focus on?";
            
            const newThread: ChatThread = {
                id: `thread-${Date.now()}`,
                title: threadTitle,
                messages: [{ id: `model-${Date.now()}`, author: 'model', text: initialMessage }],
                lastUpdated: Date.now(),
                modelName: 'gemini-3-flash-preview',
                config: {},
                history: [],
                status: 'active',
                isVisibleInHistory: false, // Hide setup chat from history
            };

            setChatThreads(prev => [newThread, ...prev]);
            setActiveThreadId(newThread.id);
            setAppState('chatting');
            setIsSidebarOpen(false);
            setInteractiveStep('select-main-topic');
            return;
        }

        if (label === 'Mini-lessons') {
            const newThread: ChatThread = {
                id: `thread-${Date.now()}`, title: 'Mini-lessons', messages: [{ id: `model-${Date.now()}`, author: 'model', text: "Ok great! What topic are you on? Or just tell me what you’d like to learn." }], lastUpdated: Date.now(), modelName: 'gemini-3-flash-preview', config: {}, history: [], status: 'active'
            };
            setChatThreads(prev => [newThread, ...prev]);
            setActiveThreadId(newThread.id);
            setAppState('chatting');
            setIsSidebarOpen(false);
            setInteractiveStep('select-main-topic');
            return;
        }
        
        if (label === 'Make study plan') {
            setAppState('study-planner');
            setIsSidebarOpen(false);
            return;
        }
        
        if (label === 'Flash cards') {
            setAppState('flashcards');
            setIsSidebarOpen(false);
            return;
        }

        if (label === 'My Study Timetable') {
            const threadTitle = 'My Study Timetable';
            const newThread: ChatThread = {
                id: `thread-${Date.now()}`, title: threadTitle, messages: [], lastUpdated: Date.now(), modelName: 'gemini-3-flash-preview', config: {}, history: [], status: 'active', isStudyPlan: true,
            };
            if (studyPlan) {
                newThread.messages.push({ id: `model-${Date.now()}`, author: 'model', text: studyPlan.content });
            } else {
                newThread.messages.push({ id: `model-${Date.now()}`, author: 'model', text: "You haven't created a study plan yet! Go to 'Study for a test' to get started." });
            }
            setChatThreads(prev => [newThread, ...prev]);
            setActiveThreadId(newThread.id);
            setAppState('chatting');
            setIsSidebarOpen(false);
            setIsInitialLoadForThread(true);
            return;
        }

        startNewChat(prompt, label, isPro);
    };


  return (
    <div 
      className="bg-stone-100 min-h-screen bg-repeat bg-center" 
      style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/lined-paper.png')` }}
    >
      <div className="container mx-auto max-w-2xl h-screen flex flex-col text-gray-800 relative">
        <header className={`relative flex items-center px-4 text-blue-800/80 transition-[height] duration-300 ease-out ${appState !== 'initial' ? 'h-12' : 'h-24'}`}>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-blue-100 rounded-full transition-colors z-10">
                <MenuIcon />
            </button>
            <div className={`absolute inset-0 flex justify-between items-center px-4 transition-opacity duration-300 ${appState !== 'initial' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="w-6 h-6" /> {/* Spacer to balance menu icon */}
                <Logo />
                <div className="w-6 h-6" /> {/* Spacer to balance right side */}
            </div>
        </header>
        
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          onSelectOption={handleMenuOptionSelect}
          teacherFont={teacherFont}
          userFont={userFont}
          onTeacherFontChange={setTeacherFont}
          onUserFontChange={setUserFont}
          teacherVoice={teacherVoice}
          onTeacherVoiceChange={setTeacherVoice}
          chatThreads={chatThreads}
          activeThreadId={activeThreadId}
          onSwitchThread={switchThread}
          onDeleteThread={deleteThread}
          onGoHome={() => {
            setAppState('initial');
            setIsSidebarOpen(false);
          }}
        />
        
        {appState === 'study-planner' && <StudyPlannerScreen onCreatePlan={handleCreateStudyPlan} onClose={() => setAppState('initial')} />}
        
        {appState === 'flashcards' && <FlashcardScreen 
            onExit={() => { setAppState('initial'); setFlashcardInitialTopic(null); }} 
            initialTopic={flashcardInitialTopic}
        />}

        <main 
            ref={appState === 'chatting' ? chatContainerRef : null} 
            className={`flex-1 overflow-y-auto p-4 md:p-6 ${appState === 'initial' ? 'space-y-4' : ''}`}
        >
            {appState === 'initial' && (
                <InitialScreen onSelectOption={handleMenuOptionSelect} avatarImage={initialAvatar} />
            )}

            {appState === 'chatting' && (
                <div className="space-y-2">
                    {messages.map((msg, index) => {
                        const isLastMessage = index === messages.length - 1;
                        // Hide the last model message while a long response is generating
                        if (isLastMessage && msg.author === 'model' && isGeneratingLongResponse) {
                            return null;
                        }

                        return (
                        <div ref={isLastMessage ? lastMessageContainerRef : null} key={msg.id}>
                            <Message 
                                message={msg} 
                                isLastModelMessage={isLastMessage && msg.author === 'model' && !isLoading}
                                isStreaming={isLastMessage && msg.author === 'model' && isLoading && !isGeneratingLongResponse}
                                onPlayAudio={playAudio}
                                onStopAudio={stopSpeech}
                                audioCache={audioCache}
                                audioLoadingIds={audioLoadingIds}
                                setAudioCache={setAudioCache}
                                imageCache={imageCache}
                                setImageCache={setImageCache}
                                currentlyPlayingId={currentlyPlayingId}
                                highlightedSentenceInfo={highlightedSentenceInfo}
                                isInitialLoadForThread={isInitialLoadForThread}
                                isStudyPlanThread={activeThread?.isStudyPlan ?? false}
                                completedTasks={studyPlan?.completedTasks}
                                onToggleStudyTask={handleToggleStudyTask}
                                onStartStudyTask={handleStartStudyTask}
                                onSendMessage={sendMessage}
                            />
                        </div>
                        );
                    })}

                    {interactiveStep !== 'none' && (
                        <InteractiveChoices 
                            step={interactiveStep} 
                            selectedMainTopicHeading={selectedMainTopic}
                            onSelect={handleInteractiveChoice} 
                        />
                    )}
                    
                    {isGeneratingLongResponse && (
                        <div className="comet-loader">
                            <p>{loadingText}</p>
                        </div>
                    )}

                    {isLoading && !isGeneratingLongResponse && messages.length > 0 && messages[messages.length - 1].author === 'user' && (
                        <div className="text-lg" style={{ fontFamily: "'Kalam', cursive", color: '#00008B' }}>
                            <div className="ellipsis-loader">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </main>
        
        <footer className="py-3 px-2 md:px-0">
          {(appState === 'initial' || appState === 'chatting') && (
            <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
          )}
        </footer>
      </div>
    </div>
  );
}