"use client";

import { useState } from "react";
import { Card } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { Badge } from "~/components/ui/Badge";

interface SettingsFormProps {
  onBack: () => void;
}

export function SettingsForm({ onBack }: SettingsFormProps) {
  const [settings, setSettings] = useState({
    playerName: localStorage.getItem("playerName") || "",
    timeLimit: localStorage.getItem("timeLimit") || "60",
    difficulty: localStorage.getItem("difficulty") || "normal",
    soundEnabled: localStorage.getItem("soundEnabled") !== "false",
    theme: localStorage.getItem("theme") || "light",
  });

  const handleSave = () => {
    localStorage.setItem("playerName", settings.playerName);
    localStorage.setItem("timeLimit", settings.timeLimit);
    localStorage.setItem("difficulty", settings.difficulty);
    localStorage.setItem("soundEnabled", settings.soundEnabled.toString());
    localStorage.setItem("theme", settings.theme);
    
    alert("Settings saved successfully!");
  };

  const handleReset = () => {
    const defaultSettings = {
      playerName: "",
      timeLimit: "60",
      difficulty: "normal",
      soundEnabled: true,
      theme: "light",
    };
    
    setSettings(defaultSettings);
    
    localStorage.removeItem("playerName");
    localStorage.removeItem("timeLimit");
    localStorage.removeItem("difficulty");
    localStorage.removeItem("soundEnabled");
    localStorage.removeItem("theme");
    
    alert("Settings reset to defaults!");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
          <p className="text-gray-600">Customize your typing experience</p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Player Settings</h3>
            <div className="space-y-4">
              <Input
                label="Player Name"
                value={settings.playerName}
                onChange={(e) => setSettings(prev => ({ ...prev, playerName: e.target.value }))}
                placeholder="Enter your name"
                helperText="This name will be displayed to other players"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Game Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Limit (seconds)
                </label>
                <select
                  value={settings.timeLimit}
                  onChange={(e) => setSettings(prev => ({ ...prev, timeLimit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="120">2 minutes</option>
                  <option value="300">5 minutes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty
                </label>
                <select
                  value={settings.difficulty}
                  onChange={(e) => setSettings(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="easy">Easy</option>
                  <option value="normal">Normal</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Interface Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Sound Effects</label>
                  <p className="text-xs text-gray-500">Enable sound notifications</p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Theme
                </label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Save Settings
            </Button>
            <Button onClick={handleReset} variant="outline" className="flex-1">
              Reset to Defaults
            </Button>
            <Button onClick={onBack} variant="ghost">
              Back
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
} 