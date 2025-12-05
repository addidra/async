import axios from 'axios'
export async function GET() {
    const accessToken = process.env.zoho_access_token;
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
