"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "~/trpc/react";
import { fetchQuote } from "~/utils/quoteFetcher";
import { TypingArea } from "./TypingArea";
import { GameStats } from "./GameStats";
import { Button } from "~/components/ui/Button";
import { Card } from "~/components/ui/Card";
import { useTypingStats } from "~/hooks/useTypingStats";

interface PracticeGameProps {
  onBack: () => void;
}

export function PracticeGame({ onBack }: PracticeGameProps) {
  const [text, setText] = useState("");
  const [input, setInput] = useState("");
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
  const startTimeRef = useRef<Date | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const saveGameResult = api.user.saveGameResult.useMutation();
  const { calculateWPM, calculateAccuracy, calculateProgress } = useTypingStats();

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
        
        const currentWpm = calculateWPM(input, startTimeRef.current);
        setWpm(currentWpm);

        if (remainingTime === 0) {
          void handleGameEnd();
        }
      }, 100); 
    }
    return () => clearInterval(timer);
  }, [isTyping, input, calculateWPM]);

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

    const newAccuracy = totalKeystrokes > 0 
      ? Math.max(0, ((totalKeystrokes - totalMistakes) / totalKeystrokes) * 100)
      : 100;
    setAccuracy(newAccuracy);
    setErrors(totalMistakes);

    if (value === text) {
      void handleGameEnd();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
    }
  };

  const progress = calculateProgress(input, text);

  return (
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
            <Button
              onClick={() => void generateNewText()}
              variant="ghost"
              size="sm"
              className="mt-2"
              title="New Quote"
            >
              <i className="fa-solid fa-rotate-right"></i>
            </Button>
          </div>
        </div>

        <GameStats
          wpm={wpm}
          accuracy={accuracy}
          progress={progress}
          timeLeft={timeLeft}
          errors={errors}
          className="mb-6"
        />

        <TypingArea
          text={text}
          input={input}
          disabled={showResults}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          ref={inputRef}
        />

        {quoteAuthor && (
          <div className="text-sm text-gray-500 mt-2 text-right">
            - {quoteAuthor}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button onClick={onBack} variant="outline">
            Back to Home
          </Button>
          <Button onClick={() => void generateNewText()}>
            New Quote
          </Button>
        </div>

        {showCompletionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md mx-4">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-4">Practice Complete!</h3>
                <div className="space-y-2 mb-6">
                  <p><strong>WPM:</strong> {Math.round(wpm)}</p>
                  <p><strong>Accuracy:</strong> {Math.round(accuracy)}%</p>
                  <p><strong>Errors:</strong> {errors}</p>
                  <p><strong>Time:</strong> {60 - timeLeft}s</p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => setShowCompletionModal(false)}>
                    Continue
                  </Button>
                  <Button onClick={() => void generateNewText()} variant="outline">
                    New Quote
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 