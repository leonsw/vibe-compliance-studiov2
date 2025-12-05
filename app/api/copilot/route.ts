import { Anthropic } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    // Load API Keys and Env Vars
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Diagnostics
    console.log("--- DEBUG START ---");
    console.log("Anthropic Key Status:", ANTHROPIC_API_KEY ? "Loaded" : "MISSING");
    console.log("OpenAI Key Status:", OPENAI_API_KEY ? "Loaded" : "MISSING");
    console.log("Supabase URL/AnonKey Status:", SUPABASE_URL && SUPABASE_ANON_KEY ? "Loaded" : "MISSING");

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "Server missing Anthropic API Key" }, { status: 500 });
    }
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: "Server missing OpenAI API Key" }, { status: 500 });
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json({ error: "Server missing Supabase environment variables" }, { status: 500 });
    }

    // Initialize clients
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Parse incoming request
    const { message, context } = await req.json();
    console.log("User Message received:", message);

    // ---------------- RAG RETRIEVAL STEP ----------------

    // 1. Embed the user message using OpenAI
    let embedding: number[] | null = null;
    try {
      const embedResponse = await openai.embeddings.create({
        input: message,
        model: "text-embedding-3-small",
        encoding_format: "float",
      });
      embedding = embedResponse.data[0].embedding;
    } catch (e) {
      console.error("Embedding creation failed", e);
      return NextResponse.json({ error: "Failed to embed message" }, { status: 500 });
    }

    // 2. Query Supabase with the embedding via match_documents RPC
    let matches: any[] = [];
    try {
      const { data, error } = await supabase.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 5,
      });
      if (error) {
        console.error("Supabase RPC error:", error);
      }
      matches = data || [];
    } catch (err) {
      console.error("Supabase.RPC invocation failed", err);
      // If you have dev/test environments w/o RAG, don't fail hard, just continue with knowledge base empty
    }

    // 3. Concatenate content from matched chunks
    let contextText = "";
    try {
      contextText = matches
        .map((doc: any) => doc.content)
        .filter(Boolean)
        .join("\n---\n");
    } catch {
      contextText = "";
    }

    // ---------------- SYSTEM PROMPT (AUGMENTED) ----------------
    const systemPrompt = `
You are 'Vibe Copilot', an expert CMMC Auditor.

Current Context:
- Assessment: ${context.assessmentTitle}
- Standard: ${context.standard}

REAL-TIME DATA (What the user sees on screen):
${JSON.stringify(context.visibleControls, null, 2)}

KNOWLEDGE BASE (retrieved policy/documents relevant to the user's question):
${contextText || "No relevant policy text found."}

Your Goal: 
- When answering, use the KNOWLEDGE BASE section above as your primary reference.
- If the KNOWLEDGE BASE contained an answer, cite it.
- If the answer isn't there, rely on your general CMMC/compliance knowledge but mention you checked the policy and did not find a direct answer.
- If the user asks about status, refer to REAL-TIME DATA.
- If a control is "Non-Compliant", suggest finding or requesting evidence.
- Be concise.
`;

    // GENERATION: CALL ANTHROPIC
    console.log("Sending request to Anthropic (claude-sonnet-4-20250514) with enhanced prompt...");
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    console.log("Response received from Anthropic!");

    // @ts-ignore
    const reply = response.content[0].text;
    return NextResponse.json({ reply });

  } catch (error: any) {
    // LOG THE EXACT ERROR
    console.error("--- FATAL ERROR ---");
    console.error(error);
    if (error.status === 404) {
      console.error("404 Diagnosis: The Model ID is wrong OR the API Key is invalid.");
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}