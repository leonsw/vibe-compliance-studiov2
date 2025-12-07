import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Initialize Clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { controlId, controlDescription, controlCode } = await req.json();

    console.log(`Mapping Policy for Control ${controlCode}...`);

    // 1. Generate Embedding for the Control Description
    // We are asking: "Where in our documents do we talk about [Control Description]?"
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: controlDescription,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // 2. Search the Vector Database (using the function we built for the Chatbot)
    // We want the single BEST match.
    // 2. Search the Vector Database
    console.log("Searching DB with Threshold 0.01...");
    
    const { data: matches, error: searchError } = await supabase
      .rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: 0.25, // <--- LOWERED TO ALMOST ZERO
        match_count: 5
      });

    if (searchError) throw searchError;

    // Log the top results to see the REAL score
    if (matches && matches.length > 0) {
        matches.forEach((m: any, i: number) => {
            console.log(`Match #${i+1}: Score ${m.similarity.toFixed(4)} | Text: "${m.content.substring(0, 30)}..."`);
        });
    } else {
        console.log("CRITICAL: Zero matches found even at 0.01 threshold.");
    }
    // 3. Logic: Did we find a match?
    if (!matches || matches.length === 0) {
      console.log("No relevant policy found.");
      return NextResponse.json({ found: false, message: "No matching policy section found." });
    }

    const bestMatch = matches[0];
    console.log(`Found match in document ID: ${bestMatch.id} (Score: ${bestMatch.similarity})`);

    // 4. Fetch the Document Name (Metadata)
    // The vector search returns the chunk content, but we want the file name too.
    // Note: The RPC returns 'id' which is the chunk ID. We need to join to get document title.
    // For MVP speed, we'll just fetch the parent document details now.
    
    // First, get the document_id from the chunk
    const { data: chunkData } = await supabase
        .from('document_chunks')
        .select('document_id')
        .eq('id', bestMatch.id)
        .single();
        
    let docName = "Unknown Policy";
    if (chunkData) {
        const { data: docData } = await supabase
            .from('documents')
            .select('name')
            .eq('id', chunkData.document_id)
            .single();
        if (docData) docName = docData.name;
    }

    // 5. Return the Match Data
    return NextResponse.json({ 
      found: true, 
      evidenceData: {
        name: docName,
        snippet: bestMatch.content, // The specific paragraph
        confidence: Math.round(bestMatch.similarity * 100),
        source_type: 'Policy_AI'
      }
    });

  } catch (error: any) {
    console.error("Policy Mapping Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}