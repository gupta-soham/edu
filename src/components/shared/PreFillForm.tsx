import React, { useState } from "react";
import { UserContext } from "../../types";

interface PreFillFormProps {
  onSubmit: (context: UserContext) => void;
}

export const PreFillForm: React.FC<PreFillFormProps> = ({ onSubmit }) => {
  const [age, setAge] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const ageNumber = parseInt(age);
    if (isNaN(ageNumber) || ageNumber < 1 || ageNumber > 100) {
      return;
    }

    onSubmit({
      age: ageNumber,
    });
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or valid numbers
    if (value === "" || /^\d{1,3}$/.test(value)) {
      setAge(value);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="max-w-md w-full space-y-8 bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-gray-700/50">
        {/* Logo and Title */}
        <div className="text-center">
          <div
            className="mx-auto h-16 w-16 mb-4 flex items-center justify-center 
            bg-primary rounded-xl text-white text-2xl font-bold"
          >
            {/* Stacked layers logo */}
            <svg
              className="w-10 h-10"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2L2 7L12 12L22 7L12 2Z" />
              <path d="M2 17L12 22L22 17" />
              <path d="M2 12L12 17L22 12" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Welcome to Educasm
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Tap into Curiosity - Let's personalize your experience
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label
                htmlFor="age"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Your Age
              </label>
              <div className="relative">
                <input
                  id="age"
                  type="text"
                  value={age}
                  onChange={handleAgeChange}
                  placeholder="Enter your age"
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg
                    text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                    focus:ring-primary focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={!age || parseInt(age) < 1 || parseInt(age) > 100}
              className="group relative w-full flex justify-center py-3 px-4 border 
                border-transparent text-sm sm:text-base font-medium rounded-lg text-white 
                bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 
                focus:ring-offset-2 focus:ring-primary disabled:opacity-50 
                disabled:cursor-not-allowed transition-all duration-200"
            >
              Start Exploring
            </button>
          </div>
        </form>

        {/* Footer Text */}
        <p className="mt-4 text-center text-xs sm:text-sm text-gray-400">
          We use this to provide age-appropriate explanations
        </p>
      </div>
    </div>
  );
};
