export function smartSplit(text: string, maxChunkSize = 1000, overlap = 200): string[] {
    // 1. Clean the text (Remove multiple newlines, weird spaces)
    const cleanText = text.replace(/\s+/g, " ").trim();
    
    const chunks: string[] = [];
    let currentChunk = "";
  
    // 2. Split by Sentences (Look for periods followed by space)
    // This Regex looks for [.!?] followed by a space or end of string
    const sentences = cleanText.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [cleanText];
  
    for (const sentence of sentences) {
      // If adding this sentence stays within limit, add it
      if ((currentChunk + sentence).length <= maxChunkSize) {
        currentChunk += sentence;
      } else {
        // If current chunk is not empty, push it
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        
        // Start new chunk with Overlap (Context Preservation)
        // We grab the last few words of the previous chunk to keep the flow
        const overlapText = currentChunk.slice(-overlap);
        currentChunk = overlapText + sentence;
      }
    }
  
    // Push the final chunk
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
  
    return chunks;
  }