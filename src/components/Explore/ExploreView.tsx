// src/components/Explore/ExploreView.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { GPTService } from "../../services/gptService";
import { MarkdownComponentProps, UserContext } from "../../types";
import { LoadingAnimation } from "../shared/LoadingAnimation";
import { SearchBar } from "../shared/SearchBar";
import { RelatedQuestions } from "./RelatedQuestions";
import { RelatedTopics } from "./RelatedTopics";

interface Message {
  type: "user" | "ai";
  content?: string;
  topics?: Array<{
    topic: string;
    type: string;
    reason: string;
  }>;
  questions?: Array<{
    question: string;
    type: string;
    context: string;
  }>;
}

interface StreamChunk {
  text?: string;
  topics?: Array<{
    topic: string;
    type: string;
    reason: string;
  }>;
  questions?: Array<{
    question: string;
    type: string;
    context: string;
  }>;
}

interface ExploreViewProps {
  initialQuery?: string;
  onError: (message: string) => void;
  onRelatedQueryClick?: (query: string) => void;
  userContext: UserContext;
}

const MarkdownComponents: Record<string, React.FC<MarkdownComponentProps>> = {
  h1: ({ children, ...props }) => (
    <h1
      className="text-xl sm:text-2xl font-bold text-gray-100 mt-4 mb-2"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="text-lg sm:text-xl font-semibold text-gray-100 mt-3 mb-2"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="text-base sm:text-lg font-medium text-gray-200 mt-2 mb-1"
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p
      className="text-sm sm:text-base text-gray-300 my-1.5 leading-relaxed 
      break-words"
      {...props}
    >
      {children}
    </p>
  ),
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-inside my-2 text-gray-300" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-inside my-2 text-gray-300" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="my-1 text-gray-300" {...props}>
      {children}
    </li>
  ),
  code: ({ children, inline, ...props }) =>
    inline ? (
      <code className="bg-gray-700 px-1 rounded text-xs sm:text-sm" {...props}>
        {children}
      </code>
    ) : (
      <code
        className="block bg-gray-700 p-2 rounded my-2 text-xs sm:text-sm overflow-x-auto"
        {...props}
      >
        {children}
      </code>
    ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-gray-500 pl-4 my-2 text-gray-400 italic"
      {...props}
    >
      {children}
    </blockquote>
  ),
};

export const RelatedQueries: React.FC<{
  queries: Array<{
    query: string;
    type: string;
    context: string;
  }>;
  onQueryClick: (query: string) => void;
}> = ({ queries, onQueryClick }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case "curiosity":
        return "bg-blue-500/20 text-blue-400";
      case "mechanism":
        return "bg-green-500/20 text-green-400";
      case "causality":
        return "bg-yellow-500/20 text-yellow-400";
      case "innovation":
        return "bg-purple-500/20 text-purple-400";
      case "insight":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <div className="mt-6 pt-4">
      <h3 className="text-sm font-medium text-gray-300 mb-3 px-2">
        Follow-up Questions
      </h3>
      <div className="rounded-lg bg-gray-800/50 divide-y divide-gray-700/50">
        {queries.map((query, index) => (
          <button
            key={index}
            onClick={() => onQueryClick(query.query)}
            className="w-full text-left hover:bg-gray-700/30 transition-all 
              duration-200 group first:rounded-t-lg last:rounded-b-lg"
          >
            <div className="py-3 px-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-sm text-gray-200 group-hover:text-primary 
                      transition-colors line-clamp-2"
                    >
                      {query.query}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full 
                      font-medium ${getTypeColor(query.type)}`}
                    >
                      {query.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-1">
                    {query.context}
                  </p>
                </div>
                <span
                  className="text-gray-400 group-hover:text-primary 
                  transition-colors text-lg"
                >
                  →
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export const ExploreView: React.FC<ExploreViewProps> = ({
  initialQuery,
  onError,
  onRelatedQueryClick,
  userContext,
}) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const stored = sessionStorage.getItem("explore-chat-history");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showInitialSearch, setShowInitialSearch] = useState(!initialQuery);
  const gptService = useMemo(() => new GPTService(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Store messages in session storage when they change
  useEffect(() => {
    try {
      sessionStorage.setItem("explore-chat-history", JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save messages to session storage:", error);
    }
  }, [messages]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    setIsUserScrolling(scrollHeight - scrollTop > clientHeight + 50);
  }, []);

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isUserScrolling && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isUserScrolling]);

  // Reset function
  useEffect(() => {
    const handleReset = () => {
      setMessages([]);
      setShowInitialSearch(true);
      sessionStorage.removeItem("explore-chat-history");
    };

    window.addEventListener("resetExplore", handleReset);
    return () => window.removeEventListener("resetExplore", handleReset);
  }, []);

  const handleSearch = useCallback(
    async (query: string) => {
      try {
        setIsLoading(true);
        setIsUserScrolling(false);

        // Add new messages to the existing history
        setMessages((prev) => [
          ...prev,
          { type: "user", content: query },
          { type: "ai", content: "" },
        ]);

        setShowInitialSearch(false);

        await gptService.streamExploreContent(
          query,
          userContext,
          (chunk: StreamChunk) => {
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                type: "ai",
                content: chunk.text,
                topics: chunk.topics,
                questions: chunk.questions,
              };
              return newMessages;
            });
          }
        );
      } catch (error) {
        console.error("Search error:", error);
        onError(
          error instanceof Error ? error.message : "Failed to load content"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [gptService, onError, userContext]
  );

  const handleRelatedQueryClick = useCallback(
    (query: string) => {
      if (onRelatedQueryClick) {
        onRelatedQueryClick(query);
      }
      handleSearch(query);
    },
    [handleSearch, onRelatedQueryClick]
  );

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch]);

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col">
      {showInitialSearch ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            What do you want to explore?
          </h1>

          <div className="w-full max-w-xl mx-auto">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Enter what you want to explore..."
              centered={true}
              className="bg-gray-900/80"
            />

            <p className="text-sm text-gray-400 text-center mt-1">
              Press Enter to search
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <span className="text-sm text-gray-400">Try:</span>
              <button
                onClick={() => handleSearch("Quantum Physics")}
                className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 
                  border border-purple-500/30 transition-colors text-xs sm:text-sm text-purple-300"
              >
                ⚛️ Quantum Physics
              </button>
              <button
                onClick={() => handleSearch("Machine Learning")}
                className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 
                  border border-blue-500/30 transition-colors text-xs sm:text-sm text-blue-300"
              >
                🤖 Machine Learning
              </button>
              <button
                onClick={() => handleSearch("World History")}
                className="px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 
                  border border-green-500/30 transition-colors text-xs sm:text-sm text-green-300"
              >
                🌍 World History
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-col w-full h-[calc(100vh-4rem)]">
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 
              scrollbar-track-transparent pb-16"
          >
            <div className="space-y-2">
              {messages.map((message, index) => (
                <div key={index} className="px-2 sm:px-4 w-full mx-auto">
                  <div className="max-w-3xl mx-auto">
                    {message.type === "user" ? (
                      <div className="w-full">
                        <div className="flex-1 text-base sm:text-lg font-semibold text-gray-100">
                          {message.content}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="flex-1 min-w-0">
                          {!message.content && isLoading ? (
                            <div className="flex items-center space-x-2 py-2">
                              <LoadingAnimation />
                              <span className="text-sm text-gray-400">
                                Thinking...
                              </span>
                            </div>
                          ) : (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={{
                                ...MarkdownComponents,
                                p: ({ children }) => (
                                  <p
                                    className="text-sm sm:text-base text-gray-300 my-1.5 leading-relaxed 
                                    break-words"
                                  >
                                    {children}
                                  </p>
                                ),
                              }}
                              className="whitespace-pre-wrap break-words space-y-1.5"
                            >
                              {message.content || ""}
                            </ReactMarkdown>
                          )}

                          {message.topics && message.topics.length > 0 && (
                            <div className="mt-3">
                              <RelatedTopics
                                topics={message.topics}
                                onTopicClick={handleRelatedQueryClick}
                              />
                            </div>
                          )}

                          {message.questions &&
                            message.questions.length > 0 && (
                              <div className="mt-3">
                                <RelatedQuestions
                                  questions={message.questions}
                                  onQuestionClick={handleRelatedQueryClick}
                                />
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="fixed bottom-12 left-0 right-0 bg-gradient-to-t from-background 
              via-background to-transparent pb-1 pt-2 z-50"
          >
            <div className="w-full px-2 sm:px-4 max-w-3xl mx-auto">
              <SearchBar
                onSearch={handleSearch}
                placeholder="Ask a follow-up question..."
                centered={false}
                className="bg-gray-900/80 backdrop-blur-lg border border-gray-700/50 h-10"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ExploreView.displayName = "ExploreView";
