import { GoogleGenAI } from '@google/genai';

// Store active chat sessions (in production, use Redis or a database)
const chatSessions = new Map();

export async function POST(req: Request) {
    const body = await req.json();
    const schema = body.schema;
    const prompt = body.prompt;
    const sessionId = body.sessionId || `session_${Date.now()}`;
    const reset = body.reset || false;
    const ai = new GoogleGenAI({});

    console.log("Received schema:", schema);
    console.log("Received prompt:", prompt);
    console.log("Session ID:", sessionId);

    try {
        let currentLeadData = {};
        let history: any[] = [];

        // Check if this is a continuation of an existing conversation
        if (chatSessions.has(sessionId) && !reset) {
            const session = chatSessions.get(sessionId);
            currentLeadData = session.leadData;
            history = session.history || [];
            console.log("Continuing existing session with data:", currentLeadData);
        }

        const systemInstruction = `You are an expert at creating/updating ZOHO Leads with intelligent field inference. Operate in CONVERSATION MODE: user may provide info across multiple messages; ALWAYS preserve existing data, merge new info, and update fields when corrected. Never remove data unless explicitly asked.

            CURRENT LEAD DATA:
            ${JSON.stringify(currentLeadData)}

            GOALS:
            1. Extract explicit info from user message.
            2. Merge with existing lead data.
            3. Infer missing values using context.
            4. Output valid JSON per schema.
            5. Validate required fields.

            RULES:

            PERSISTENCE:
            - Keep all fields already collected.
            - New info adds to or updates previous values.
            - Update-trigger words: "change", "update", "correct", "actually", etc.
            - Addition words: "add", "also", "include", "plus", etc.
            - Deletion words: "remove", "delete", "clear", etc.

            LOCATION INFERENCE:
            - Infers country from city/state: Dubai→UAE, London→United Kingdom, New York→United States, Toronto→Canada, Sydney→Australia, Mumbai→India; California→United States; Ontario→Canada; Bavaria→Germany.
            - Fill City/State/Country where logically deducible.

            CONTACT & DATA ENHANCEMENT:
            - Infer company from email domain if Company missing.
            - Ensure website has protocol (add https://).
            - Emails validated and lowercased.
            - Normalize phone numbers; add country code when country known (+971 UAE, +1 US/Canada, +44 UK).

            FINANCIAL LOGIC:
            - Monthly revenue × 12 → annual; quarterly × 4 → annual.
            - Normalize shorthand ("2M"→2000000, "500K"→500000).
            - Detect revenue words: revenue, turnover, sales, income.

            NAME LOGIC:
            - One-word name → Last_Name.
            - Split full names: first = before last space, last = after.
            - Preserve prefixes (Dr., Mr., Mrs.) in Title.

            INDUSTRY & COMPANY INFERENCE:
            - Guess industry if obvious ("tech startup"→Technology).

            LEAD SOURCE RECOGNITION:
            - Identify sources (LinkedIn, Website, Referral, Trade Show, Cold Call, Email Campaign, Advertisement).

            FORMATTING:
            - Standardize capitalization.
            - Strip whitespace.
            - Zip/phone formatting according to country.

            VALIDATION:
            - Required fields must be present or reasonably inferred.
            - If missing: status="error" and list missing fields.
            - Otherwise: status="success".

            OUTPUT:
            - ALWAYS output single-line JSON ONLY.
            - Include all fields from current data + new/updated ones.
            - Format: {"data": {...}, "status":"success|error", "field":["missing_fields"]}

            SCHEMA:
            ${JSON.stringify(schema)}

            EXAMPLES:
            1) User: "Create lead for John Doe, john@gmail.com"
            → {"data":{"First_Name":"John","Last_Name":"Doe","Email":"john@gmail.com"},"status":"error","field":["Company"]}

            2) User: "Add phone +971545265615"
            → {"data":{"First_Name":"John","Last_Name":"Doe","Email":"john@gmail.com","Phone":"+971545265615"},"status":"error","field":["Company"]}

            3) User: "Company is Acme Corp in Dubai"
            → {"data":{"First_Name":"John","Last_Name":"Doe","Email":"john@gmail.com","Phone":"+971545265615","Company":"Acme Corp","City":"Dubai","Country":"UAE"},"status":"success","field":[]}

            4) User: "Actually change email to john.doe@acmecorp.com"
            → {"data":{"First_Name":"John","Last_Name":"Doe","Email":"john.doe@acmecorp.com","Phone":"+971545265615","Company":"Acme Corp","City":"Dubai","Country":"UAE"},"status":"success","field":[]}

            Remember: maintain state, merge updates, infer logically, validate required fields, never hallucinate unprovable data.`;



        // Create chat with updated history
        const chat = ai.chats.create({
            model: "gemini-2.0-flash-exp",
            history: [...history],
            config: {
                temperature: 0.2,
                maxOutputTokens: 1024,
                responseMimeType: "application/json",
                systemInstruction: systemInstruction,
            }
        });

        // Get response
        const result = await chat.sendMessage({ message: prompt });
        const responseText = result.text;

        console.log("LLM Response:", responseText);

        // Parse the response and update stored lead data
        try {
            const parsedResponse = JSON.parse(responseText || "");

            if (parsedResponse.data) {
                currentLeadData = parsedResponse.data;
            }

            // Add model response to history
            const updatedHistory = [
                ...history,
                {
                    role: "model",
                    parts: [{ text: responseText }]
                }
            ];

            // Update session
            chatSessions.set(sessionId, {
                leadData: currentLeadData,
                history: updatedHistory,
                createdAt: chatSessions.get(sessionId)?.createdAt || Date.now()
            });

            console.log("Updated lead data:", currentLeadData);

            return Response.json({
                success: true,
                sessionId: sessionId,
                response: parsedResponse,
                message: "Lead data updated successfully"
            });
        } catch (parseError) {
            console.error("Failed to parse LLM response:", parseError);
            return Response.json({
                success: false,
                sessionId: sessionId,
                response: responseText,
                error: "Failed to parse response"
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("LLM fetch error:", error);
        return Response.json({
            success: false,
            error: "Failed to process lead data",
            details: error.message || error.toString(),
        }, { status: 500 });
    }
}

// Optional: Cleanup old sessions periodically
export function cleanupOldSessions(maxAgeMs = 30 * 60 * 1000) {
    const now = Date.now();
    for (const [sessionId, session] of chatSessions.entries()) {
        if (now - session.createdAt > maxAgeMs) {
            chatSessions.delete(sessionId);
            console.log(`Cleaned up session: ${sessionId}`);
        }
    }
}