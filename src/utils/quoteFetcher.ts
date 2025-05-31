interface Word {
  content: string;
  author: string;
}

const cleanQuote = (text: string): string => {
  return text
    .replace(/[']/g, "'")  // Replace right single quote
    .replace(/["]/g, '"')  // Replace right double quote
    .replace(/[']/g, "'")  // Replace left single quote
    .replace(/["]/g, '"')  // Replace left double quote
    .replace(/[–]/g, '-')  // Replace en dash
    .replace(/[—]/g, '-')  // Replace em dash
    .replace(/[…]/g, '...') // Replace ellipsis
    .replace(/[′]/g, "'")  // Replace prime
    .replace(/[″]/g, '"')  // Replace double prime
    .replace(/[‵]/g, "'")  // Replace reversed prime
    .replace(/[‶]/g, '"')  // Replace reversed double prime
    .replace(/[´]/g, "'")  // Replace acute accent
    .replace(/[`]/g, "'")  // Replace grave accent
    .replace(/[′]/g, "'")  // Replace prime
    .replace(/[″]/g, '"')  // Replace double prime
    .replace(/[‴]/g, "'''") // Replace triple prime
    .replace(/[‵]/g, "'")  // Replace reversed prime
    .replace(/[‶]/g, '"')  // Replace reversed double prime
    .replace(/[‷]/g, "'''") // Replace reversed triple prime
    .replace(/[´]/g, "'")  // Replace acute accent
    .replace(/[`]/g, "'")  // Replace grave accent
    .replace(/[′]/g, "'")  // Replace prime
    .replace(/[″]/g, '"')  // Replace double prime
    .replace(/[‴]/g, "'''") // Replace triple prime
    .replace(/[‵]/g, "'")  // Replace reversed prime
    .replace(/[‶]/g, '"')  // Replace reversed double prime
    .replace(/[‷]/g, "'''") // Replace reversed triple prime
    .replace(/[’]/g, "'")  // Replace right single quote
    .replace(/["]/g, '"'); // Replace right double quote
};

export const fetchQuote = async (): Promise<Word> => {
  try {
    const response = await fetch(
      'https://quotes-api-self.vercel.app/quote',
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch quote');
    }
    
    const data = await response.json();
    return {
      content: cleanQuote(data.quote),
      author: data.author
    };
  } catch (error) {
    console.error('Error fetching quote:', error);
    // Fallback to default text if the API call fails
    return {
      content: "The quick brown fox jumps over the lazy dog. This is a simple typing test quote.",
      author: "Default"
    };
  }
}; 