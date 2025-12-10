import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  console.log("--- Starting Standard Ingestion ---");

  try {
    // Dynamic Import of XLSX to prevent server crash
    const XLSX = await import("xlsx");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    if (!file || !name) {
      return NextResponse.json({ error: "Missing file or name" }, { status: 400 });
    }

    console.log(`Processing: ${name} (${file.size} bytes)`);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) return NextResponse.json({ error: "Empty sheet" }, { status: 400 });

    // Create Library Record
    const { data: standard, error: stdError } = await supabase
      .from("standards_library")
      .insert({ 
        name, 
        total_controls: rows.length, 
        description: `Imported from ${file.name}` 
      })
      .select()
      .single();

    if (stdError) throw stdError;

   // Helper: Find column with exclusions to prevent overlaps
   const getCol = (row: any, candidates: string[], exclusions: string[] = []) => {
    const keys = Object.keys(row);
    
    // 1. Try Exact Matches first (Best)
    for (const key of keys) {
        if (candidates.some(c => key.toLowerCase() === c)) return row[key];
    }

    // 2. Try Fuzzy Matches (with exclusions)
    for (const key of keys) {
        const lowerKey = key.toLowerCase();
        // Check if key matches candidate AND does NOT contain any exclusion words
        if (candidates.some(c => lowerKey.includes(c)) && 
            !exclusions.some(e => lowerKey.includes(e))) {
            return row[key];
        }
    }
    return "";
};

const controlsToInsert = [];

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  
  // FIX: When looking for "control" (ID), explicitly ignore "description", "text", "question"
  const code = getCol(row, ["id", "control", "number", "ref"], ["desc", "text", "question", "requirement"]) || `ROW-${i+1}`;
  
  // Description search doesn't need strict exclusions usually
  const desc = getCol(row, ["desc", "requirement", "question", "text", "guidance"]);
  
  const family = getCol(row, ["family", "domain", "group", "category"]) || "General";
  const guidance = getCol(row, ["guide", "help", "discussion", "implementation"]) || "";

  if (!desc) continue;


      // Vectorize
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: `${code}: ${desc} ${guidance}`,
      });

      controlsToInsert.push({
        standard_id: standard.id,
        control_code: String(code),
        family: String(family),
        description: String(desc),
        guidance: String(guidance),
        embedding: embeddingResponse.data[0].embedding
      });
    }

    const { error: insertError } = await supabase
      .from("master_controls")
      .insert(controlsToInsert);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, count: controlsToInsert.length });

  } catch (error: any) {
    console.error("Ingest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}