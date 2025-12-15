import { createClient } from "@supabase/supabase-js";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const maxDuration = 60;

const ControlExtractionSchema = z.object({
  controls: z.array(
    z.object({
      control_code: z.string().describe("The unique ID of the control (e.g., 'AC.L1-3.1.1' or '1.1')"),
      family: z.string().describe("The domain or family this control belongs to (e.g., 'Access Control')"),
      description: z.string().describe("The full text requirement of the control."),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const standardName = (formData.get("standardName") || formData.get("name")) as string | null;

    if (!file || !standardName) {
      return NextResponse.json({ error: "Missing file or standard name." }, { status: 400 });
    }

    // 1. Parse File
    let rawText = "";
    const buffer = Buffer.from(await file.arrayBuffer());

    if (file.name.endsWith(".xlsx") || file.name.endsWith(".csv")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        rawText += `\n--- Sheet: ${sheetName} ---\n`;
        rawText += XLSX.utils.sheet_to_txt(sheet, { blankrows: false });
      });
    } else {
      rawText = buffer.toString("utf-8");
    }

    // 2. AI Extraction
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: ControlExtractionSchema,
      prompt: `
        You are a Compliance Data Analyst. 
        Extract unique security controls from standard: "${standardName}".
        IGNORE intro text, legal notices, headers, footers.
        Extract 'control_code', 'family', and 'description'.
        
        Content:
        ${rawText.slice(0, 100000)} 
      `,
    });

    const controls = object.controls;
    
    if (controls.length === 0) {
      return NextResponse.json({ error: "No controls found." }, { status: 422 });
    }

    // 3. Database Operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // A. Upsert Standard Record (The "Folder")
    const { data: stdRecord, error: stdError } = await supabase
      .from("standards_library")
      .upsert(
        { name: standardName, description: `Imported from ${file.name}` }, 
        { onConflict: "name" }
      )
      .select()
      .single();

    if (stdError) throw new Error(`DB Error (Standard): ${stdError.message}`);

    // B. THE FIX: Delete existing controls for this standard (Overwrite logic)
    const { error: deleteError } = await supabase
      .from("master_controls")
      .delete()
      .eq("standard_id", stdRecord.id);

    if (deleteError) throw new Error(`DB Error (Cleanup): ${deleteError.message}`);

    // C. Insert New Controls
    const controlsToInsert = controls.map((c) => ({
      standard_id: stdRecord.id,
      control_code: c.control_code,
      family: c.family,
      description: c.description,
    }));

    const { error: insertError } = await supabase
      .from("master_controls")
      .insert(controlsToInsert);

    if (insertError) throw new Error(`DB Error (Insert): ${insertError.message}`);

    // D. Update Total Count
    await supabase
        .from("standards_library")
        .update({ total_controls: controls.length })
        .eq("id", stdRecord.id);

    return NextResponse.json({ 
      success: true, 
      count: controls.length, 
      standard: stdRecord.name 
    });

  } catch (error: any) {
    console.error("[Ingest Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}