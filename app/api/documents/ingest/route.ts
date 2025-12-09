import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { smartSplit } from "@/lib/ai/textSplitter";
import PDFParser from "pdf2json"; // The new library

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    console.log("--- Starting Ingestion (pdf2json) ---");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const documentName = formData.get("name") as string;

    if (!file || !documentName) {
      return NextResponse.json({ error: "Missing file or name" }, { status: 400 });
    }

    console.log(`Processing: ${documentName} (${file.type})`);

    // 1. Extract Text
    let rawText = "";
    
    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Wrap the event-based library in a Promise so we can "await" it
      rawText = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1); // 1 = Text content only

        pdfParser.on("pdfParser_dataError", (errData: any) => {
            console.error(errData.parserError);
            reject(new Error("PDF Parsing Failed"));
        });

        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            // Extract raw text from the messy JSON structure
            // @ts-ignore
            const text = pdfParser.getRawTextContent();
            resolve(text);
        });

        // Feed the buffer
        pdfParser.parseBuffer(buffer);
      });
      
      // Clean up artifacts (page breaks, weird spacing)
      rawText = rawText.replace(/----------------Page \(\d+\) Break----------------/g, "\n"); 
      
    } else {
      // Assume text/plain
      rawText = await file.text();
    }

    if (!rawText || rawText.length < 10) {
        throw new Error("Extracted text is empty or too short.");
    }

    // 2. Create Metadata Record
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        name: documentName,
        status: "Processing",
        file_size: file.size,
        chunk_count: 0
      })
      .select()
      .single();

    if (docError) throw docError;

    // 3. Smart Chunking
    const chunks = smartSplit(rawText, 1000, 200);
    console.log(`Smart Splitter generated ${chunks.length} chunks.`);

    // 4. Vectorize & Save (Batch)
    const chunkData = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const text = chunks[i];
      
      // Safety: Skip empty chunks
      if (!text || text.trim().length === 0) continue;

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
    }

    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(chunkData);

    if (insertError) throw insertError;

    // 5. Update Status
    await supabase
      .from("documents")
      .update({ status: "Ready", chunk_count: chunks.length })
      .eq("id", doc.id);

    return NextResponse.json({ success: true, chunks: chunks.length });

  } catch (error: any) {
    console.error("Ingestion Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}