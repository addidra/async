import axios from "axios";

export async function POST(req:Request){
    const accessToken = process.env.zoho_access_token;
    try {
        const body = await req.json();
        const leadData = body.leadData;
        console.log("Received lead data:", leadData);
        const res = await axios.post(
            "https://www.zohoapis.com/crm/v8/Leads", {"data":[leadData]},
            {
                headers: {
                    Authorization: `Zoho-oauthtoken ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );
        return Response.json(res.data);
    } catch (error: any) {
        console.error("Zoho schema fetch error:", error.response?.data || error)
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