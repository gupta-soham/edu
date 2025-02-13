// src/hooks/useApi.ts
import { useState } from 'react';
import { api } from '../services/api';
import { Question, UserContext } from '../types';

export const useApi = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleRateLimitError = (error: Error | unknown) => {
    if (error instanceof Error && error.name === 'RateLimitError') {
      throw new Error('You have exceeded the request limit. Please try again later.');
    }
    return error;
  };

  const getQuestion = async (
    topic: string,
    difficulty: "beginner" | "intermediate" | "advanced",
    userContext: UserContext
  ): Promise<Question> => {
    try {
      setIsLoading(true);
      return await api.getQuestion(topic, difficulty, userContext);
    } catch (error) {
      const processedError = handleRateLimitError(error);
      const errorMessage =
        processedError instanceof Error ? processedError.message : "An error occurred";
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTest = async (topic: string, examType: 'JEE' | 'NEET') => {
    setIsLoading(true);
    try {
      console.log('Generating test for:', { topic, examType });
      const questions = await api.generateTest(topic, examType);
      console.log('API response:', questions);
      return questions;
    } catch (error) {
      console.error('Test Generation Error:', error);
      throw handleRateLimitError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const explore = async (query: string, userContext: UserContext) => {
    setIsLoading(true);
    try {
      return await api.explore(query, userContext);
    } catch (error) {
      console.error("API Error:", error);
      throw handleRateLimitError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a utility method to get rate limit info if needed
  const getRateLimitInfo = () => {
    return api.getRateLimitInfo();
  };

  return {
    isLoading,
    explore,
    getQuestion,
    generateTest,
    getRateLimitInfo
  };
};
