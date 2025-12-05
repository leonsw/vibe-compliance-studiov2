import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Anthropic } from "@anthropic-ai/sdk";

// Initialize Clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { evidenceId, controlDescription, fileUrl } = await req.json();

    console.log(`Validating Evidence ${evidenceId} for: ${controlDescription}`);

    // 1. Download the File
    const imageResponse = await fetch(fileUrl);
    if (!imageResponse.ok) throw new Error("Failed to fetch image from storage");
    
    // 2. DETECT FILE TYPE (The Fix)
    const mediaType = imageResponse.headers.get("content-type") || "application/octet-stream";
    console.log("Detected Media Type:", mediaType);

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    // 3. Logic Fork: Is it an Image?
    if (!allowedImageTypes.includes(mediaType)) {
      console.log("File is not a supported image. Skipping AI Vision.");
      
      // Graceful Fallback for PDFs/Docs
      return NextResponse.json({ 
        success: true, 
        verdict: {
          status: "Pending",
          confidence_score: 0,
          reasoning: `File type (${mediaType}) cannot be visually analyzed by AI. Manual review required.`
        }
      });
    }

    // --- PROCEED WITH VISION ANALYSIS (Only for Images) ---
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");

    const systemPrompt = `
      You are an expert Security Auditor. 
      Your task: Evaluate if the provided screenshot PROVES compliance with the Control Requirement.
      
      Return ONLY JSON in this format:
      {
        "status": "Verified" | "Rejected" | "Inconclusive",
        "confidence_score": <number 0-100>,
        "reasoning": "Concise explanation of why the score was given."
      }

      Scoring Guide:
      - 90-100: The image clearly shows the exact setting/config required.
      - 50-89: The image is related but might be missing specific details.
      - 0-49: The image is unrelated, blurry, or contradicts the requirement.
    `;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as any, // We know this is safe now
                data: base64Image,
              },
            },
            
            {
              type: "text",
              text: `Control Requirement: "${controlDescription}".\n\nAnalyze this evidence.`,
            },
          ],
        },
        { role: "assistant", content: "{" }
      ],
    });

// 4. Parse Verdict
    // @ts-ignore
    const rawText = message.content[0].text;
    console.log("AI Verdict:", rawText);

    let verdict;
    try {
      // SMART FIX: Check if it starts with '{'. If not, add it.
      const cleanedText = rawText.trim();
      const jsonString = cleanedText.startsWith('{') ? cleanedText : `{ ${cleanedText}`;
      
      verdict = JSON.parse(jsonString);
    } catch (e) {
      console.error("JSON Parsing Failed. Raw text was:", rawText);
      // Fallback so the app doesn't crash
      verdict = { status: "Inconclusive", confidence_score: 0, reasoning: "AI output format error." };
    }

// 5. Update Evidence Status
    // LOGIC CHANGE: If rejected, mark as 'Failed' (not Missing)
    const evidenceStatus = verdict.status === "Verified" ? "Verified" : "Failed";
    
    // Update Evidence
    const { data: updatedEvidence, error: evidenceError } = await supabase
      .from("evidence")
      .update({
        status: evidenceStatus,
        ai_feedback: verdict.reasoning,
        confidence_score: verdict.confidence_score
      })
      .eq("id", evidenceId)
      .select("control_id") 
      .single();

    if (evidenceError) {
        console.error("Evidence Update Failed:", evidenceError);
        throw evidenceError;
    }

    // 6. Sync Parent Control Status
    if (updatedEvidence?.control_id) {
        console.log(`Syncing Parent Control: ${updatedEvidence.control_id} -> ${evidenceStatus}`);
        
        let newControlStatus = "Review Required";
        
        // STRICT MAPPING:
       // Since evidenceStatus is strictly 'Verified' or 'Failed' (defined above),
       // we only need to check for 'Failed'.
       if (evidenceStatus === "Failed") {
        newControlStatus = "Failed";
        } 
        else if (evidenceStatus === "Verified") {
            newControlStatus = "Compliant";
        }
 
        const { error: controlError } = await supabase
          .from("controls")
          .update({ status: newControlStatus })
          .eq("id", updatedEvidence.control_id);
          
        if (controlError) console.error("Control Update Failed:", controlError);
     }
    return NextResponse.json({ success: true, verdict });

  } catch (error: any) {
    console.error("Validation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}