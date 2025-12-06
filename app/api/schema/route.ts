import { currentUser } from '@clerk/nextjs/server';
import axios from 'axios'
import { clientPromise } from '@/lib/mongodb';
import { decrypt } from '@/lib/utils';
export async function GET() {
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
    const refreshToken = decrypt(creds.refreshTokenEnc);
    const clientId = decrypt(creds.clientIdEnc);
    const clientSecret = decrypt(creds.clientSecretEnc);
    try {
        const res = await axios.get(
            "https://www.zohoapis.com/crm/v8/settings/fields?module=Leads",
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
        if (error.response.data.code == "INVALID_TOKEN") {
            console.log("Access token expired, refreshing...")
            // Refresh token logic can be implemented here
            const res = await fetch(
                `https://accounts.zoho.com/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token&scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );
            const newTokenData = await res.json();
            integrationCredentialsCollection.updateOne(
                { integrationId: integration._id },
                { $set: { accessTokenEnc: newTokenData.access_token } })
            console.log("Token refreshed. Please retry the request.")
            const resFields = await axios.get(
                "https://www.zohoapis.com/crm/v8/settings/fields?module=Leads",
                {
                    headers: {
                        Authorization: `Zoho-oauthtoken ${newTokenData.access_token}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            return Response.json(resFields.data);
        }
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
