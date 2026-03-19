import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, PaperclipIcon, CloseIcon, LoadingSpinnerIcon } from './Icons';
import { extractTextFromImages } from '../services/geminiService';

interface ChatInputProps {
  onSendMessage: (text: string, imageUrl?: string | null) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        // Reset height to ensure it can shrink
        textarea.style.height = 'inherit';
        // Set the height to match the content's scroll height
        const scrollHeight = textarea.scrollHeight;
        textarea.style.height = `${scrollHeight}px`; 
        
        // The CSS max-height will cap the element's height.
        // We check if the content has overflowed to add a scrollbar.
        if (textarea.scrollHeight > textarea.clientHeight) {
            textarea.style.overflowY = 'auto';
        } else {
            textarea.style.overflowY = 'hidden';
        }
    }
  }, [inputText]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setExtractionError(null);
      setIsExtracting(true);
      
      const base64Images: string[] = await Promise.all(
        files.map((file: File) => new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        }))
      );

      setImagePreviews(prev => [...prev, ...base64Images]);
      
      const extractedText = await extractTextFromImages(base64Images);
      
      if (extractedText === 'POOR_QUALITY_IMAGE') {
        setExtractionError("The image quality is too poor to read. Please retake the photo in better lighting or framing.");
      } else if (extractedText) {
        setInputText(prev => prev ? `${prev}\n\n${extractedText}` : extractedText);
      } else {
        setExtractionError("Failed to extract text. Please try again.");
      }
      
      setIsExtracting(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImagePreviews(prev => prev.filter((_, index) => index !== indexToRemove));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = () => {
    if ((inputText.trim() || imagePreviews.length > 0) && !isLoading && !isExtracting) {
      // For simplicity, we send the first image if there are multiple, or we could modify onSendMessage to accept an array.
      // The prompt says "pass that extracted text into the existing marking / feedback workflow".
      // Since we extracted the text, we can just send the text. We can also send the first image for context.
      onSendMessage(inputText, imagePreviews.length > 0 ? imagePreviews[0] : null);
      setInputText('');
      setImagePreviews([]);
      setExtractionError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col">
      {extractionError && (
        <div className="p-2 mb-2 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
          {extractionError}
        </div>
      )}
      {imagePreviews.length > 0 && (
        <div className="p-2 self-start flex flex-wrap gap-2">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative inline-block bg-slate-200 rounded-lg p-1">
              <img src={preview} alt={`Upload preview ${index + 1}`} className="max-h-24 rounded" />
              <button
                onClick={() => handleRemoveImage(index)}
                className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full h-6 w-6 flex items-center justify-center hover:bg-gray-800 transition-colors"
                aria-label="Remove image"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white/80 p-2 rounded-2xl shadow-md flex items-end border-2 border-blue-200 focus-within:border-blue-500 transition-colors">
        <input 
          type="file" 
          accept="image/jpeg, image/png, image/webp, image/jpg" 
          multiple
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isExtracting}
          className="p-2 rounded-full hover:bg-blue-100 text-blue-700 transition-colors"
          aria-label="Upload a photo of your work"
          title="Upload a photo of your work"
        >
          {isExtracting ? <LoadingSpinnerIcon className="w-6 h-6" /> : <PaperclipIcon className="w-6 h-6" />}
        </button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isExtracting ? "Extracting text from image..." : "Type a reply or ask a question..."}
          className="flex-1 bg-transparent border-none focus:ring-0 resize-none p-2 text-gray-700 placeholder-gray-500 text-base chat-input-textarea"
          disabled={isLoading || isExtracting}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || isExtracting || (!inputText.trim() && imagePreviews.length === 0)}
          className="ml-2 bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
