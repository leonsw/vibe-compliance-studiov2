import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server"; // Use Server Client for Auth Context
import OpenAI from "openai";
import { smartSplit } from "@/lib/ai/textSplitter";

// ✅ Important for pdfjs in Next route handlers
export const runtime = "nodejs"; 

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const policyId = formData.get("policyId") as string; // Frontend sends this now
    
    if (!file || !policyId) {
        return NextResponse.json({ error: "Missing file or policyId" }, { status: 400 });
    }

    // 1. AUTH & ORG CHECK (Crucial for RLS)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the User's Organization ID so we can tag the chunks correctly
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
        return NextResponse.json({ error: "User has no organization linked." }, { status: 400 });
    }

    // --- 2. EXTRACT TEXT (Your Working PDFJS Code) ---
    let rawText = "";

    if (file.type === "application/pdf") {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    
      // Avoid worker errors in Next.js
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc =
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs";
    
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
    
      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        disableFontFace: true,
      } as any);

      const pdfDocument = await loadingTask.promise;

      const textParts: string[] = [];
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        // Join words with space
        const pageText = (textContent.items as any[]).map((it) => it.str).join(" ");
        textParts.push(pageText);
      }

      rawText = textParts.join("\n\n");
    } else {
      // Fallback for .txt files
      rawText = await file.text();
    }

    // Clean up text
    rawText = rawText.replace(/\u0000/g, "").replace(/\n\s*\n/g, "\n");
    if (!rawText || rawText.length < 10) {
        throw new Error("Extracted text is empty or too short.");
    }

    // --- 3. CHUNK & EMBED ---
    // Note: If you don't have smartSplit locally, you can use a simple slice loop.
    // Assuming smartSplit exists based on your imports.
    const chunks = smartSplit(rawText, 1000, 200);
    const chunkData = [];
    
    console.log(`Debug: Processing ${chunks.length} chunks for Policy ${policyId}`);

    for (let i = 0; i < chunks.length; i++) {
      const text = chunks[i];
      if (!text || text.trim().length === 0) continue;

      try {
        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
        });

        chunkData.push({
            policy_id: policyId, // <--- UPDATED to match new schema
            organization_id: profile.organization_id, // <--- ADDED for RLS
            content: text,
            embedding: embeddingResponse.data[0].embedding,
            chunk_index: i,
        });
      } catch (e) {
        console.warn(`Skipping chunk ${i}`, e);
      }
    }

    // --- 4. SAVE CHUNKS & UPDATE STATUS ---
    if (chunkData.length > 0) {
        const { error: insertError } = await supabase
            .from("document_chunks")
            .insert(chunkData);

        if (insertError) {
            console.error("Chunk Insert Error:", insertError);
            throw insertError;
        }

        // Update the main policy record with the count
        await supabase
            .from("policies") // <--- UPDATED table name
            .update({ 
                status: "Published", 
                chunk_count: chunks.length 
            })
            .eq("id", policyId);
    }

    // --- 5. RETURN SUCCESS ---
    return NextResponse.json({ success: true, chunks: chunks.length });

  } catch (error: any) {
    console.error("Ingestion Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}