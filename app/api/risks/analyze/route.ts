import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { threat } = await req.json();

    const { object: result } = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        severity: z.enum(['Low', 'Medium', 'High', 'Critical']),
        likelihood: z.enum(['Low', 'Medium', 'High']),
        reasoning: z.string().describe("Short explanation (max 2 sentences) justifying the score.")
      }),
      prompt: `
        You are a Chief Information Security Officer (CISO). 
        Analyze the following threat scenario and estimate its inherent risk level.
        
        THREAT: "${threat}"
        
        GUIDANCE:
        - Severity: Impact on confidentiality, integrity, availability, or business ops.
        - Likelihood: Probability of occurrence based on common attack vectors.
      `,
    });

    return NextResponse.json({ result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}