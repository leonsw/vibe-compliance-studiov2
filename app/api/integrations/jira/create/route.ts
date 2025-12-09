import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { title, description, controlId } = await req.json();

    // 1. Get Jira Credentials from Database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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

    // 2. Construct Basic Auth Header
    const authString = Buffer.from(`${email}:${token}`).toString('base64');

    // 3. Call Jira API
    const jiraUrl = `https://${domain}/rest/api/3/issue`;
    const payload = {
      fields: {
        project: { key: projectKey },
        summary: `[Vibe] Compliance Failure: ${title}`,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: description || "No description." }]
            }
          ]
        },
        issuetype: { name: "Task" }
      }
    };

    console.log(`Creating Jira Ticket in ${domain} (Project: ${projectKey})...`);

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
        console.error("Jira API Error:", JSON.stringify(data));
        throw new Error(JSON.stringify(data.errors || data.errorMessages));
    }

    const ticketKey = data.key; // e.g. "SEC-42"
    const ticketUrl = `https://${domain}/browse/${ticketKey}`;

    // 4. Save Ticket as Evidence (So we can track it)
    await supabase.from("evidence").insert({
        control_id: controlId,
        name: `Remediation Ticket: ${ticketKey}`,
        source_type: 'Integration',
        status: 'Pending', // Pending = Open Ticket
        url: ticketUrl
    });

    return NextResponse.json({ success: true, ticketKey, ticketUrl });

  } catch (error: any) {
    console.error("Jira Creation Failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}