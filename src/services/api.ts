// src/services/api.ts
import { ExploreResponse, Question, UserContext } from "../types";
import { GPTService } from "./gptService";
import { rateLimiter } from "./rateLimiter";

class RateLimitError extends Error {
  constructor() {
    super("Rate limit exceeded. Please try again later.");
    this.name = "RateLimitError";
  }
}

const gptService = new GPTService();

// Internal session management
let currentSessionId: string | null = null;

const getOrCreateSessionId = (): string => {
  if (!currentSessionId) {
    const storedSessionId = localStorage.getItem('api_session_id');
    if (storedSessionId) {
      currentSessionId = storedSessionId;
    } else {
      currentSessionId = crypto.randomUUID();
      localStorage.setItem('api_session_id', currentSessionId);
    }
  }
  return currentSessionId;
};

const checkRateLimit = () => {
  if (!rateLimiter.checkRateLimit(getOrCreateSessionId())) {
    throw new RateLimitError();
  }
};

const transformQuestion = (rawQuestion: Question): Question => ({
  text: rawQuestion.text,
  options: rawQuestion.options,
  correctAnswer: rawQuestion.correctAnswer,
  explanation: rawQuestion.explanation,
  difficulty: rawQuestion.difficulty,
  ageGroup: rawQuestion.ageGroup,
  topic: rawQuestion.topic,
  subtopic: rawQuestion.subtopic || "",
  questionType: rawQuestion.questionType || "conceptual"
});

export const api = {
  async getQuestion(
    topic: string,
    difficulty: "beginner" | "intermediate" | "advanced",
    userContext: UserContext
  ): Promise<Question> {
    try {
      checkRateLimit();
      // Convert difficulty string to number for GPT service
      const difficultyLevel = difficulty === "beginner" ? 1 : difficulty === "intermediate" ? 2 : 3;
      const question = await gptService.getPlaygroundQuestion(topic, difficultyLevel, userContext);
      // Convert number back to string for response
      const formattedQuestion = {
        ...transformQuestion(question),
        difficulty: difficulty
      };
      return formattedQuestion;
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      console.error("Question generation error:", error);
      throw new Error("Failed to generate question");
    }
  },

  async generateTest(topic: string, examType: 'JEE' | 'NEET'): Promise<Question[]> {
    try {
      checkRateLimit();
      console.log('API generateTest called with:', { topic, examType });
      const questions = await gptService.getTestQuestions(topic, examType);
      console.log('API received questions:', questions);
      return questions.map(transformQuestion);
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      console.error("Test generation error:", error);
      throw new Error("Failed to generate test");
    }
  },

  async explore(query: string, userContext: UserContext): Promise<ExploreResponse> {
    try {
      checkRateLimit();
      const response = await gptService.getExploreContent(query, userContext);
      return response;
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      console.error("Explore error:", error);
      throw new Error("Failed to explore topic");
    }
  },

  getRateLimitInfo() {
    return rateLimiter.getRateLimitInfo(getOrCreateSessionId());
  },

  // Utility method to get current session ID if needed
  getCurrentSessionId() {
    return getOrCreateSessionId();
  }
};
