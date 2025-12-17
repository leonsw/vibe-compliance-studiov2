import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { smartSplit } from "@/lib/ai/textSplitter";

// ✅ Important for pdfjs in Next route handlers
export const runtime = "nodejs"; 

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const documentName = formData.get("name") as string;
    
    // Grab the Storage Links (sent from frontend)
    const publicUrl = formData.get("url") as string || null;
    const storagePath = formData.get("storage_path") as string || null;

    if (!file || !documentName) {
        return NextResponse.json({ error: "Missing file or name" }, { status: 400 });
    }

    // --- 1. EXTRACT TEXT (Your Working Code) ---
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

    // --- 2. SAVE TO DATABASE (The Missing Part) ---
    // Note: This writes to the 'documents' table, NOT 'standards'.
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        name: documentName,
        status: "Processing",
        file_size: file.size,
        chunk_count: 0,
        url: publicUrl,           
        storage_path: storagePath 
      })
      .select()
      .single();

    if (docError) throw docError;

    // --- 3. CHUNK & EMBED ---
    const chunks = smartSplit(rawText, 1000, 200);
    const chunkData = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const text = chunks[i];
      if (!text || text.trim().length === 0) continue;

      try {
        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text,
        });

        chunkData.push({
            document_id: doc.id,
            content: text,
            embedding: embeddingResponse.data[0].embedding,
            chunk_index: i,
        });
      } catch (e) {
        console.warn(`Skipping chunk ${i}`, e);
      }
    }

    // --- 4. SAVE CHUNKS & UPDATE STATUS ---
    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(chunkData);

    if (insertError) throw insertError;

    await supabase
      .from("documents")
      .update({ status: "Ready", chunk_count: chunks.length })
      .eq("id", doc.id);

    // --- 5. RETURN SUCCESS ---
    // We specifically return 'chunks' so the frontend alert says "15 chunks created" instead of "undefined"
    return NextResponse.json({ success: true, chunks: chunks.length });

  } catch (error: any) {
    console.error("Ingestion Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}