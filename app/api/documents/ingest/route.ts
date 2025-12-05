import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// Initialize OpenAI for Embeddings (Memory)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase (Database)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { documentId, content } = await req.json();

    console.log(`Processing Document ID: ${documentId}`);

    // 1. Split text into chunks (Simple splitting by paragraph for MVP)
    // In production, we would use a smarter "RecursiveCharacterTextSplitter"
    const chunks = content
      .split(/\n\s*\n/) // Split by double newlines (paragraphs)
      .filter((chunk: string) => chunk.length > 50); // Remove tiny noise

    console.log(`Generated ${chunks.length} chunks.`);

    // 2. Generate Embeddings for each chunk
    const chunkData = [];

    for (let i = 0; i < chunks.length; i++) {
      const text = chunks[i];
      
      // Call OpenAI to get the vector math
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small", // The standard 1536-dim model
        input: text,
      });

      const embedding = embeddingResponse.data[0].embedding;

      chunkData.push({
        document_id: documentId,
        content: text,
        embedding: embedding, // The vector [0.123, -0.456, ...]
        chunk_index: i,
      });
    }

    // 3. Save to Supabase 'document_chunks' table
    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(chunkData);

    if (insertError) throw insertError;

    // 4. Update the Parent Document status to 'Ready'
    await supabase
      .from("documents")
      .update({ 
        status: "Ready", 
        chunk_count: chunks.length 
      })
      .eq("id", documentId);

    return NextResponse.json({ success: true, chunks: chunks.length });

  } catch (error: any) {
    console.error("Ingestion Error:", error);
    // Mark as failed so the user knows
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}