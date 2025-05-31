"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

const Settings = () => {
  const [timeLimit, setTimeLimit] = useState(60);
  const [fontSize, setFontSize] = useState(16);
  const [difficulty, setDifficulty] = useState("normal");

  const updateSettings = api.user.updateSettings.useMutation();

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        timeLimit,
        fontSize,
        difficulty,
      });
      // Show success message
    } catch (error) {
      // Show error message
      console.error("Failed to update settings:", error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>

      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Time Limit (seconds)
          </label>
          <input
            type="number"
            min="10"
            max="300"
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Font Size (pixels)
          </label>
          <input
            type="number"
            min="12"
            max="32"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded border p-2"
          >
            <option value="normal">Normal</option>
            <option value="uppercase">Uppercase Only</option>
            <option value="numbers">Numbers Only</option>
            <option value="special">Special Characters</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings; 