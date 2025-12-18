import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai"; 

// ✅ CORRECT: Named exports only. NO 'export default' allowed here.
export const runtime = "nodejs";
export const maxDuration = 60; 

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { controlId } = await req.json();

    if (!controlId) {
      return NextResponse.json({ error: "Missing controlId" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch Control Context
    const { data: control, error: fetchError } = await supabase
      .from("controls")
      .select(`
        *,
        assessments (
            id,
            systems ( name, type )
        )
      `)
      .eq("id", controlId)
      .single();

    if (fetchError || !control) throw new Error("Control not found");

    const systemName = control.assessments?.systems?.name || "General System";
    const systemType = control.assessments?.systems?.type || "General";
    const controlText = `${control.control_code}: ${control.description}`;

    console.log(`--- Analyzing ${control.control_code} for ${systemName} ---`);

    // 2. Context Map (The Intelligence Layer)
    let searchContext = "";
    const typeLower = systemType.toLowerCase();

    if (typeLower.includes("identity") || typeLower.includes("idp")) {
        searchContext = "Okta Auth0 SSO MFA Password Policy Access Control";
    } else if (typeLower.includes("cloud") || typeLower.includes("aws")) {
        searchContext = "AWS Azure Encryption SecurityGroup IAM Backup";
    } else if (typeLower.includes("source") || typeLower.includes("repo")) {
        searchContext = "GitHub GitLab Branch Protection Merge Request SDLC";
    } else if (typeLower.includes("hr") || typeLower.includes("people")) {
        searchContext = "Background Check Onboarding Termination NDA Training";
    }

    // 3. Generate Embedding
    const queryText = `${controlText} ${searchContext}`;
    const embeddingResponse = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: queryText,
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 4. Vector Search (RPC Call)
    const { data: evidenceChunks, error: searchError } = await supabase.rpc(
      "match_documents", 
      {
        query_embedding: embedding,
        match_threshold: 0.5, 
        match_count: 5        
      }
    );

    if (searchError) throw searchError;

    // Format evidence
    const evidenceText = evidenceChunks
      ?.map((c: any) => `[Source: ${c.document_name}]\nContent: ${c.content}`)
      .join("\n\n") || "No specific documents found.";

    const evidenceLinks = evidenceChunks
        ?.map((c: any) => c.document_url || c.document_name)
        .filter((v: any, i: any, a: any) => a.indexOf(v) === i)
        .slice(0, 3); 

    // 5. AI Verdict
    const { object: analysis } = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        status: z.enum(["Met", "Not Met", "Partially Met"]),
        justification: z.string(),
      }),
      prompt: `
        You are an expert IT Auditor.
        TASK: Assess if the Control is implemented based STRICTLY on the provided Evidence.
        
        CONTEXT:
        Target: ${systemName} (${systemType})
        Control: "${control.description}"
        
        EVIDENCE:
        ${evidenceText}
        
        INSTRUCTIONS:
        - If evidence confirms the requirement, mark "Met".
        - If evidence is vague or missing specifics, mark "Partially Met".
        - If no relevant evidence, mark "Not Met".
        - Keep justification to 2 sentences max.
      `,
    });

    // 6. Update Database
    const { error: updateError } = await supabase
      .from("controls")
      .update({
        status: analysis.status,
        ai_justification: analysis.justification,
        evidence_links: evidenceLinks,
        last_assessed_at: new Date().toISOString()
      })
      .eq("id", controlId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, result: analysis });

  } catch (error: any) {
    console.error("Analysis Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}