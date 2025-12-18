import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";
import { streamText, generateObject } from "ai";
import { z } from "zod";
import OpenAI from "openai";

export const maxDuration = 60;

// Initialize clients
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 1. Define the "Brain" Schema
// This covers ALL capabilities without complex Tool definitions
const IntentSchema = z.object({
  action: z.enum(["chat", "search_policy", "check_status", "create_assessment"])
    .describe("The user's intent."),
  
  // Arguments (Optional depending on action)
  query: z.string().optional().describe("Search keywords if action is 'search_policy'."),
  standard_name: z.string().optional().describe("Standard name if action is 'create_assessment'."),
  asset_name: z.string().optional().describe("Asset/System name if action is 'create_assessment'."),
  status_filter: z.string().optional().describe("Filter for status check (e.g. 'SOC 2')."),
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    // --- PHASE 1: DECIDE INTENT ---
    const { object: intent } = await generateObject({
      model: openai("gpt-4o"),
      schema: IntentSchema,
      prompt: `
        Analyze the user's request: "${lastMessage}"
        
        - If asking about policy/rules -> "search_policy"
        - If asking about audit progress -> "check_status"
        - If wanting to start/launch an audit -> "create_assessment"
        - Otherwise -> "chat"
      `,
    });

    let toolResult = "";

    // --- PHASE 2: EXECUTE MANUALLY ---
    
    // A. SEARCH KNOWLEDGE BASE
    if (intent.action === "search_policy" && intent.query) {
      const embeddingResponse = await openaiClient.embeddings.create({
          model: "text-embedding-3-small",
          input: intent.query,
      });
      const embedding = embeddingResponse.data[0].embedding;

      const { data: chunks } = await supabase.rpc("match_documents", {
          query_embedding: embedding,
          match_threshold: 0.5,
          match_count: 3
      });

      if (chunks && chunks.length > 0) {
        toolResult = `FOUND DOCUMENTS:\n${chunks.map((c: any) => `[${c.document_name}]: ${c.content}`).join("\n\n")}`;
      } else {
        toolResult = "No relevant documents found in the library.";
      }
    }

    // B. CHECK STATUS
    else if (intent.action === "check_status") {
      let query = supabase.from("assessments").select("title, status, progress, standard");
      if (intent.status_filter) {
        query = query.ilike("title", `%${intent.status_filter}%`);
      }
      const { data } = await query;
      
      if (data && data.length > 0) {
        toolResult = `CURRENT ASSESSMENTS:\n${JSON.stringify(data, null, 2)}`;
      } else {
        toolResult = "No active assessments found.";
      }
    }

    // C. CREATE ASSESSMENT
    else if (intent.action === "create_assessment" && intent.standard_name && intent.asset_name) {
      // 1. Find Standard
      const { data: stds } = await supabase.from("standards_library")
        .select("id, name").ilike("name", `%${intent.standard_name}%`).limit(1);
      
      // 2. Find System
      const { data: sys } = await supabase.from("systems")
        .select("id, name").ilike("name", `%${intent.asset_name}%`).limit(1);

      if (!stds?.length) toolResult = `Error: Standard '${intent.standard_name}' not found.`;
      else if (!sys?.length) toolResult = `Error: Asset '${intent.asset_name}' not found.`;
      else {
        // 3. Create
        const { data: newAssess, error } = await supabase.from("assessments").insert({
            title: `AGENT: ${stds[0].name} on ${sys[0].name}`,
            system_id: sys[0].id,
            standard: stds[0].name,
            standard_id: stds[0].id,
            status: "In Progress", 
            progress: 0
        }).select().single();

        if (error) {
            toolResult = `Creation Failed: ${error.message}`;
        } else {
            // 4. Clone Controls
            const { data: masters } = await supabase.from("master_controls")
                .select("*").eq("standard_id", stds[0].id);
            
            if (masters) {
                const controls = masters.map((m: any) => ({
                    assessment_id: newAssess.id,
                    control_code: m.control_code,
                    description: m.description,
                    status: "Not Started"
                }));
                await supabase.from("controls").insert(controls);
            }
            toolResult = `SUCCESS: Started assessment (ID: ${newAssess.id}).`;
        }
      }
    }

    // --- PHASE 3: REPLY TO USER ---
    // We inject the "toolResult" into the system context so VibeBot knows what happened.
    const result = await streamText({
      model: openai("gpt-4o"),
      system: `
        You are 'VibeBot', the AI Compliance Officer.
        
        SYSTEM UPDATE:
        "${toolResult}"
        
        INSTRUCTIONS:
        - If 'SYSTEM UPDATE' contains search results, answer the user's question using that info.
        - If 'SYSTEM UPDATE' confirms an action (like creating an audit), inform the user successfully.
        - If 'SYSTEM UPDATE' is empty, just chat normally.
        - Be professional and concise.
      `,
      messages,
    });

    return result.toTextStreamResponse();

  } catch (error: any) {
    console.error("[Agent Error]", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}