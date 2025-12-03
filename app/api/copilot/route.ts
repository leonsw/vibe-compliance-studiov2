import { Anthropic } from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // DEBUG: Check if Key exists
    const key = process.env.ANTHROPIC_API_KEY;
    console.log("--- DEBUG START ---");
    console.log("API Key Status:", key ? "Loaded (Starts with " + key.substring(0, 7) + "...)" : "MISSING/UNDEFINED");
    
    if (!key) {
      return NextResponse.json({ error: "Server missing API Key" }, { status: 500 });
    }

    const anthropic = new Anthropic({
      apiKey: key,
    });

    const { message, context } = await req.json();
    console.log("User Message received:", message);

    // SYSTEM PROMPT
    const systemPrompt = `
        You are 'Vibe Copilot', an expert CMMC Auditor.
        
        Current Context:
        - Assessment: ${context.assessmentTitle}
        - Standard: ${context.standard}
        
        REAL-TIME DATA (What the user sees on screen):
        ${JSON.stringify(context.visibleControls, null, 2)}
        
        Your Goal: 
        - If the user asks about status, refer to the REAL-TIME DATA above.
        - If a control is "Non-Compliant", suggest finding evidence.
        - Be concise.
        `;

    // CALLING ANTHROPIC (Using Haiku - the fastest/safest model for testing)
    console.log("Sending request to Anthropic (claude-sonnet-4-20250514)...");
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514", 
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: "user", content: message }
      ],
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