import { fetchQuote } from "./quoteFetcher";

export const generateText = async (difficulty: string): Promise<string> => {
  try {
    const { content } = await fetchQuote();
    return content;
  } catch (error) {
    console.error('Error generating text:', error);
    return "The quick brown fox jumps over the lazy dog. This is a simple typing test text.";
  }
}; 