import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx"; 

export async function POST(req: Request) {
  try {
    console.log("--- STARTING FINAL CMMC INGEST (FIXED) ---");
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const forceUpdate = formData.get("force") === "true"; 

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const supabase = await createClient();

    // 1. Check Auth & Org
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
        return NextResponse.json({ error: "User has no organization linked." }, { status: 400 });
    }

    // 2. PARSE THE FILE
    let data: any = { name: "", controls: [] };
    let sheetsProcessed = 0; 
    let validControls: any[] = [];
    
    const buffer = await file.arrayBuffer();

    if (file.name.endsWith(".json")) {
        const text = new TextDecoder().decode(buffer);
        data = JSON.parse(text);
        validControls = data.controls;
    } else {
        // --- MATRIX CRAWLER LOGIC ---
        const workbook = XLSX.read(buffer, { type: "array" });
        
        console.log(`Debug: Processing ${workbook.SheetNames.length} sheets...`);

        for (const sheetName of workbook.SheetNames) {
            
            // IGNORE MAPPING/SUMMARY TABS
            const lowerName = sheetName.toLowerCase();
            if (sheetName.startsWith("#") || lowerName.includes("mapping") || lowerName.includes("summary")) {
                console.log(`Debug: Skipping ignored sheet "${sheetName}"`);
                continue;
            }

            const sheet = workbook.Sheets[sheetName];
            const grid = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
            if (!grid || grid.length === 0) continue;

            let sheetControlsFound = 0;

            for (let r = 0; r < grid.length; r++) {
                const row = grid[r];
                if (!row) continue;

                for (let c = 0; c < row.length; c++) {
                    const cellValue = row[c];
                    if (!cellValue || typeof cellValue !== 'string') continue;

                    const cmmcRegex = /([A-Z]{2,3}\.L\d-[\d\.]+)/;
                    const match = cellValue.match(cmmcRegex);

                    if (match) {
                        const fullText = cellValue;
                        const controlId = match[1];

                        const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
                        const idIndex = lines.findIndex(l => l.includes(controlId));
                        
                        let title = "";
                        let description = "";

                        if (idIndex !== -1 && idIndex + 1 < lines.length) {
                            title = lines[idIndex + 1];
                            description = lines.slice(idIndex + 2).join("\n");
                        } else {
                            description = fullText.replace(controlId, "").trim();
                        }

                        validControls.push({
                            control_code: controlId,
                            family: sheetName, 
                            description: title + "\n" + description, 
                            guidance: ""
                        });
                        sheetControlsFound++;
                    }
                }
            }
            if (sheetControlsFound > 0) {
                console.log(`Debug: Extracted ${sheetControlsFound} controls from sheet "${sheetName}"`);
                sheetsProcessed++;
            }
        }

        data = {
            name: formData.get("name") || file.name.replace(/\.[^/.]+$/, ""),
            version: "CMMC 2.0", 
            description: `Imported from Excel Matrix (${sheetsProcessed} sheets processed)`,
            controls: validControls
        };
    }

    console.log(`Debug: TOTAL Extracted ${data.controls.length} valid controls.`);

    // 3. DUPLICATE CHECK (SAFE MODE)
    // We log exactly what we are checking to debug the stall
    console.log(`Debug: Checking for duplicates... Name: "${data.name}", Org: "${profile.organization_id}"`);
    
    let existing = null;
    try {
        const { data: found, error: findError } = await supabase
            .from("standards_library")
            .select("id")
            .eq("name", data.name)
            .eq("organization_id", profile.organization_id)
            .maybeSingle(); // <--- CRITICAL CHANGE: maybeSingle() doesn't crash on 0 rows

        if (findError) {
            console.error("Debug: Find Error:", findError);
            // If error is permission related, we might want to throw, but let's proceed to insert attempt if safe
        }
        existing = found;
        console.log("Debug: Duplicate Check Result:", existing ? "Found ID: " + existing.id : "No duplicate found.");
    
    } catch (checkErr) {
        console.error("Debug: CRASH in Duplicate Check:", checkErr);
    }


    if (existing && !forceUpdate) {
      return NextResponse.json({ 
        error: "Standard already exists", 
        requiresConfirmation: true, 
        standardName: data.name 
      }, { status: 409 });
    }

    let standardId = existing?.id;

    // 4. HEADER INSERT
    console.log("Debug: Writing Standard Header to DB...");
    if (existing && forceUpdate) {
        await supabase.from("standards_library")
            .update({
                version: data.version,
                description: data.description,
                total_controls: data.controls.length
            })
            .eq("id", standardId);
        
        // Delete old controls
        await supabase.from("master_controls").delete().eq("standard_id", standardId);
    } else {
        const { data: newStd, error: insertError } = await supabase.from("standards_library")
            .insert({
                name: data.name,
                version: data.version,
                description: data.description,
                organization_id: profile.organization_id,
                total_controls: data.controls.length
            })
            .select()
            .single();
        
        if (insertError) {
            console.error("Debug: Header Insert Failed:", insertError);
            throw insertError;
        }
        standardId = newStd.id;
        console.log("Debug: Standard Header Created. ID:", standardId);
    }

    // 5. BULK CONTROL INSERT
    console.log(`Debug: Writing ${data.controls.length} controls to master_controls...`);
    if (data.controls && data.controls.length > 0) {
        const CHUNK_SIZE = 100;
        let insertedCount = 0;

        for (let i = 0; i < data.controls.length; i += CHUNK_SIZE) {
            const chunk = data.controls.slice(i, i + CHUNK_SIZE).map((c: any) => ({
                standard_id: standardId,
                organization_id: profile.organization_id,
                control_code: String(c.control_code).substring(0, 50),
                family: String(c.family).substring(0, 100),
                description: c.description,
                guidance: c.guidance || null
            }));
            
            const { error: ctrlError } = await supabase.from("master_controls").insert(chunk);
            if (ctrlError) {
                console.error("Batch Insert Error at index " + i, ctrlError);
                throw ctrlError;
            }
            insertedCount += chunk.length;
        }
        
        // Update total count
        await supabase.from("standards_library")
            .update({ total_controls: insertedCount })
            .eq("id", standardId);
    }

    console.log("Debug: Ingest Complete. Returning Success.");
    return NextResponse.json({ success: true, count: data.controls.length });

  } catch (error: any) {
    console.error("Ingest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}