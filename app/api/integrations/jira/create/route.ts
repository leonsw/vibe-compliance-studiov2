import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    // 1. We now expect 'riskId' (Optional)
    const { title, description, controlId, riskId } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 2. Get Credentials
    const { data: integration } = await supabase
      .from("integrations")
      .select("*")
      .eq("provider", "jira")
      .single();

    if (!integration) {
      return NextResponse.json({ error: "Jira integration not connected" }, { status: 404 });
    }

    const { domain, email, projectKey } = integration.config;
    const token = integration.encrypted_key;
    const authString = Buffer.from(`${email}:${token}`).toString('base64');

    // 3. Create Ticket in Jira
    const jiraUrl = `https://${domain}/rest/api/3/issue`;
    const payload = {
      fields: {
        project: { key: projectKey },
        summary: `[Vibe] ${title}`,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: description || "Remediation required." }]
            }
          ]
        },
        issuetype: { name: "Task" }
      }
    };

    const response = await fetch(jiraUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authString}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(JSON.stringify(data.errors || data.errorMessages));
    }

    const ticketKey = data.key; 
    const ticketUrl = `https://${domain}/browse/${ticketKey}`;

    // 4. Save as Evidence (Legacy support)
    if (controlId) {
        await supabase.from("evidence").insert({
            control_id: controlId,
            name: `Remediation Ticket: ${ticketKey}`,
            source_type: 'Integration',
            status: 'Pending',
            url: ticketUrl
        });
    }

    // 5. NEW: Link to Risk Record
    if (riskId) {
        await supabase.from("risks").update({
            jira_ticket_key: ticketKey,
            jira_ticket_url: ticketUrl,
            status: 'In Review' // Auto-update status since work has started
        }).eq("id", riskId);
    }

    return NextResponse.json({ success: true, ticketKey, ticketUrl });

  } catch (error: any) {
    console.error("Jira Creation Failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}