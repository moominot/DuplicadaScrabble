import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

interface GeminiValidatorProps {
  word: string;
}

const GeminiValidator: React.FC<GeminiValidatorProps> = ({ word }) => {
  const [definition, setDefinition] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    if (!process.env.API_KEY) {
      setError("API Key no configurada (process.env.API_KEY).");
      return;
    }

    setLoading(true);
    setError(null);
    setDefinition(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Actua com un lingüista expert en Català. Defineix breument la paraula "${word}". Si no existeix al diccionari normatiu (DIEC/GDLC) o no és vàlida per Scrabble, indica-ho clarament. Resposta màxima 40 paraules.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setDefinition(response.text);
    } catch (err) {
      setError("Error connectant amb Gemini.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 text-sm">
      <button
        onClick={handleCheck}
        disabled={loading}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-semibold disabled:opacity-50"
      >
        {loading ? (
          <span className="animate-pulse">Consultant Gemini...</span>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Validar amb AI
          </>
        )}
      </button>
      {definition && (
        <div className="mt-2 p-2 bg-indigo-50 text-indigo-900 rounded border border-indigo-100 text-xs leading-relaxed">
          {definition}
        </div>
      )}
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
};

export default GeminiValidator;