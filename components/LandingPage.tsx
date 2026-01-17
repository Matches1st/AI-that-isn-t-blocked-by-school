import React, { useState } from 'react';
import { ArrowRight, Key } from 'lucide-react';

interface LandingPageProps {
  onSaveKey: (key: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSaveKey }) => {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onSaveKey(key.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gemini-dark text-gemini-text flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px]"></div>

      <div className="max-w-md w-full z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 mb-6 border border-white/5">
            <span className="text-2xl">✨</span>
          </div>
          <h1 className="text-4xl font-semibold mb-3">Welcome to Gemini</h1>
          <p className="text-gray-400">To get started, please enter your Gemini API key.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key className="h-5 w-5 text-gray-500" />
            </div>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full bg-gemini-gray border border-gray-700 rounded-xl py-3.5 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={!key.trim()}
            className="w-full bg-white text-gemini-dark font-medium py-3.5 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Chatting <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1"
          >
            Get your free Gemini API key here
            <ArrowRight size={12} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;