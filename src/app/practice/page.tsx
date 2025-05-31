"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { fetchQuote } from "~/utils/quoteFetcher";
import Link from "next/link";
import Navigation from "../_components/Navigation";

const PracticeRoom = () => {
  const [text, setText] = useState("");
  const [input, setInput] = useState("");
  const startTimeRef = useRef<Date | null>(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [isTyping, setIsTyping] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [difficulty, setDifficulty] = useState("normal");
  const [showResults, setShowResults] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [errors, setErrors] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [quoteAuthor, setQuoteAuthor] = useState("");

  const saveGameResult = api.user.saveGameResult.useMutation();

  const generateNewText = useCallback(async () => {
    const { content, author } = await fetchQuote();
    setText(content);
    setQuoteAuthor(author);
    setInput("");
    setWpm(0);
    setAccuracy(100);
    setIsTyping(false);
    setShowResults(false);
    setShowCompletionModal(false);
    startTimeRef.current = null;
    setErrors(0);
    setTotalMistakes(0);
    setTotalKeystrokes(0);
    setTimeLeft(60);
  }, []);

  useEffect(() => {
    void generateNewText();
  }, [generateNewText]);

  const calculateWPM = (value: string) => {
    if (!startTimeRef.current) return 0;
    const now = new Date();
    const timeElapsed = (now.getTime() - startTimeRef.current.getTime()) / 1000 / 60; // in minutes
    const words = value.split(" ").length - 1;
    return Math.round(words / timeElapsed);
  };

  const calculateTimeLeft = () => {
    if (!startTimeRef.current) return 60;
    const now = new Date();
    const elapsedSeconds = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
    return Math.max(0, 60 - elapsedSeconds);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isTyping && timeLeft > 0) {
      timer = setInterval(() => {
        const remainingTime = calculateTimeLeft();
        setTimeLeft(remainingTime);
        
        // Calculate WPM every second
        const currentWpm = calculateWPM(input);
        setWpm(currentWpm);

        if (remainingTime === 0) {
          handleGameEnd();
        }
      }, 100); // Update more frequently for smoother countdown
    }
    return () => clearInterval(timer);
  }, [isTyping, input]);

  const handleGameEnd = async () => {
    setIsTyping(false);
    setShowResults(true);
    setShowCompletionModal(true);
    try {
      await saveGameResult.mutateAsync({
        roomId: "practice",
        wpm,
        accuracy,
        timeTaken: 60 - timeLeft,
        text,
      });
    } catch (error) {
      console.error("Failed to save game result:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const words = text.split(" ");
    const typedWords = value.split(" ");
    const isAddingSpace = value.endsWith(" ");

    if (isAddingSpace) {
      const justCompletedWord = typedWords[typedWords.length - 2] ?? "";
      const correctWord = words[typedWords.length - 2] ?? "";
      if (justCompletedWord !== correctWord) {
        return;
      }
    }

    if (!isAddingSpace) {
      const currentWord = words[typedWords.length - 1] ?? "";
      const typedWord = typedWords[typedWords.length - 1] ?? "";
      if (typedWord.length > currentWord.length) {
        return;
      }
    }

    // Check for new mistakes
    if (value.length > input.length) {
      const newChar = value[value.length - 1];
      const correctChar = text[value.length - 1];
      if (newChar !== correctChar) {
        setTotalMistakes(prev => prev + 1);
      }
      setTotalKeystrokes(prev => prev + 1);
    }

    setInput(value);
    if (!isTyping) {
      setIsTyping(true);
      startTimeRef.current = new Date();
    }

    // Calculate accuracy based on total mistakes
    const newAccuracy = totalKeystrokes > 0 
      ? Math.max(0, ((totalKeystrokes - totalMistakes) / totalKeystrokes) * 100)
      : 100;
    setAccuracy(newAccuracy);
    setErrors(totalMistakes);

    if (value === text) handleGameEnd();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />
      <main className="flex-1 flex flex-col justify-center items-center">
        <div className="flex justify-center items-center min-h-[90vh] bg-gray-50 w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-4xl relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-2xl font-bold">Practice Mode</div>
                <div className="text-gray-500">Improve your typing speed and accuracy</div>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-blue-500 text-2xl font-bold">{timeLeft}</span>
                <span className="text-xs text-gray-400">seconds</span>
                <button
                  onClick={() => void generateNewText()}
                  className="mt-2 text-gray-400 hover:text-blue-500 transition text-xl"
                  title="New Quote"
                >
                  <i className="fa-solid fa-rotate-right"></i>
                </button>
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-lg mb-6 min-h-[70px]">
              <span className="font-mono">
                {text.split("").map((char, i) => (
                  <span
                    key={i}
                    className={
                      i < input.length
                        ? input[i] === char
                          ? "text-blue-600"
                          : "text-red-500"
                        : "text-gray-700"
                    }
                  >
                    {char}
                  </span>
                ))}
              </span>
              {quoteAuthor && (
                <div className="text-sm text-gray-500 mt-2 text-right">
                  - {quoteAuthor}
                </div>
              )}
            </div>
            <textarea
              value={input}
              onChange={handleInputChange}
              disabled={showResults}
              className="w-full rounded border p-4 mb-6 min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Start typing here..."
            />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 rounded-lg py-6 flex flex-col items-center">
                <span className="text-3xl font-bold text-gray-800">{isNaN(wpm) ? 0 : wpm}</span>
                <span className="text-gray-500 mt-1">WPM</span>
              </div>
              <div className="bg-gray-50 rounded-lg py-6 flex flex-col items-center">
                <span className="text-3xl font-bold text-gray-800">{accuracy.toFixed(0)}%</span>
                <span className="text-gray-500 mt-1">Accuracy</span>
              </div>
            </div>
          </div>
        </div>
        {showCompletionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
              <div className="bg-blue-600 rounded-t-2xl px-6 py-4 text-white text-center">
                <div className="text-xl font-bold">Practice Complete!</div>
                <div className="text-sm">Here's how you performed</div>
              </div>
              <div className="px-6 py-6 flex flex-col items-center gap-4">
                <div className="flex w-full justify-between text-center mb-2">
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-blue-700">{wpm}</div>
                    <div className="text-xs text-gray-500">WPM</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-green-600">{accuracy.toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">Accuracy</div>
                  </div>
                </div>
                <div className="flex w-full justify-between text-center mb-2">
                  <div className="flex-1">
                    <div className="text-lg font-bold text-gray-800">{input.length}</div>
                    <div className="text-xs text-gray-500">Characters</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-gray-800">{errors}</div>
                    <div className="text-xs text-gray-500">Errors</div>
                  </div>
                </div>
                <button
                  onClick={() => void generateNewText()}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 text-lg transition"
                >
                  Try Another Quote
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PracticeRoom; 