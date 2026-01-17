import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import LandingPage from './components/LandingPage';
import { initializeGemini } from './lib/gemini';

function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      initializeGemini(storedKey);
    }
    setIsLoading(false);
  }, []);

  const handleSaveKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    initializeGemini(key);
  };

  const handleChangeKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey(null);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#131314]"></div>;
  }

  return (
    <div className="min-h-screen bg-[#131314]">
      {apiKey ? (
        <ChatInterface onChangeKey={handleChangeKey} />
      ) : (
        <LandingPage onSaveKey={handleSaveKey} />
      )}
    </div>
  );
}

export default App;