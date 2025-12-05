import axios from 'axios'
import { GoogleGenAI } from '@google/genai';
export async function POST(req: Request) {
    const ai = new GoogleGenAI({})
    const body = await req.json();
    const schema = body.schema;
    const prompt = body.prompt;

    console.log("Received schema:", schema);
    console.log("Received prompt:", prompt);
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: String(prompt),
            config: {
                temperature: 0.2,
                maxOutputTokens: 1024,
                responseMimeType: "application/json",
                systemInstruction: `
                    You are an expert at creating ZOHO Lead based on user prompts.
                    Given the user prompt, generate a valid JSON object adhering to the following instructions:
                    Understand the user prompt and extract relevant information to populate the fields defined in the schema.
                    Convert the Annual revenue to annual if mentioned the monthly revenue respectively.
                    JSON output should single line output.Only output the JSON object without any extra text.
                    If only the name is provided assume it as last name.
                    The JSON object should have keys as per the value of the "name" key defined in the field definitions.
                    Verify if the required fields are present in the output as per the user prompt.
                    If any required field is missing, respond with {"data": {..lead fields..}, "status":"error", "field": ["field_name of required field missing"]}.
                    If all required fields are present, respond with {"data": {..lead fields..}, "status": "success"}.
                    Below are the field definitions to guide you:
                    ${schema}
                    Output example:
                    {
                        "data":{"Last_Name": "Doe", "First_Name": "John", "Email": "email@text.com"},
                        "status": "success" | "error",
                        "field": ["list of required fields missing if any"]
                    }
                `,
            }
        });


        // for await (const chunk of response) {
        //     console.log("LLM Chunk:", chunk);
        // }
        console.log("LLM Response:", response);
        return Response.json(response);
    } catch (error: any) {
        console.error("LLM fetch error:", error.response?.data || error)
        return new Response(
            JSON.stringify({
                success: false,
                error: "Failed to fetch Zoho schema",
                details: error?.response?.data || error.message,
            }),
            {
                status: error?.response?.status || 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

}
