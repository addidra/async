import { currentUser } from '@clerk/nextjs/server';
import axios from 'axios';
import { clientPromise } from '@/lib/server/mongodb';
import { refreshToken } from '@/lib/server/token';
import { decrypt } from '@/lib/server/crypto';

async function fetchZohoFields(accessToken: string) {
    const response = await axios.get(
        "https://www.zohoapis.com/crm/v8/settings/fields?module=Leads",
        {
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
                "Content-Type": "application/json",
            },
        }
    );
    return response.data;
}

export async function GET() {
    try {
        const user = await currentUser();
        if (!user) {
            return new Response("Unauthorized", { status: 401 });
        }

        const client = await clientPromise;
        const integrationCollection = client.db("async").collection("integrations");
        const integration = await integrationCollection.findOne({ clerkId: user.id });

        if (!integration) {
            return new Response("Integration not found", { status: 404 });
        }

        const integrationCredentialsCollection = client.db("async").collection("integration_credentials");
        const creds = await integrationCredentialsCollection.findOne({ integrationId: integration._id });

        if (!creds) {
            return new Response("Credentials not found", { status: 404 });
        }

        let accessToken = creds.accessToken

        try {
            // Try with current access token
            const data = await fetchZohoFields(accessToken);
            return Response.json(data);
        } catch (error: any) {
            // Check if token is invalid
            if (error.response?.data?.code === "INVALID_TOKEN") {
                console.log("Access token expired, refreshing...");

                try {
                    // Refresh the token using your helper function
                    const newAccessToken: string = await refreshToken();
                    console.log("Token refreshed successfully");

                    // Retry with new token
                    const data = await fetchZohoFields(newAccessToken);
                    return Response.json(data);
                } catch (refreshError: any) {
                    console.error("Token refresh failed:", refreshError);
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: "Failed to refresh authentication token",
                            details: refreshError.message,
                        }),
                        {
                            status: 401,
                            headers: { "Content-Type": "application/json" },
                        }
                    );
                }
            }

            // Other API errors
            console.error("Zoho API error:", error.response?.data || error.message);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Failed to fetch Zoho schema",
                    details: error.response?.data || error.message,
                }),
                {
                    status: error.response?.status || 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    } catch (error: any) {
        console.error("Unexpected error:", error);
        return new Response(
            JSON.stringify({
                success: false,
                error: "Internal server error",
                details: error.message,
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}