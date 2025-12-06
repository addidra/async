import { clientPromise } from "@/lib/mongodb";
import { currentUser } from "@clerk/nextjs/server";
import axios from "axios";

export async function POST(req:Request){
    // const accessToken = process.env.zoho_access_token;
    const user = await currentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const client = await clientPromise;
    const integrationCollection = client.db("async").collection("integrations");
    const integration = await integrationCollection.findOne({ clerkId: user.id });
    if (!integration) return new Response("Integration not found", { status: 404 });
    const integrationCredentialsCollection = client.db("async").collection("integration_credentials");
    const creds = await integrationCredentialsCollection.findOne({ integrationId: integration._id });
    if (!creds) return new Response("Credentials not found", { status: 404 });
    const accessToken = creds.accessTokenEnc;
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