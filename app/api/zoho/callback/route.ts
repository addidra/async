import { NextResponse } from "next/server";
import axios from "axios";
import { decrypt, encrypt } from "@/lib/server/crypto";
import { clientPromise } from "@/lib/server/mongodb";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const userId = url.searchParams.get("state");
        const redirectUri = process.env.ZOHO_REDIRECT_URI || "http://localhost:3000/api/zoho/callback";

        if (!code || !userId) {
            return NextResponse.json({ error: "Missing code or userId" }, { status: 400 });
        }
        const client = await clientPromise;
        const integrationCredentialsCollection = client.db("async").collection("integrationCredentials");
        // Load encrypted client credentials for this user
        const creds = await integrationCredentialsCollection.findOne({ userId });
        if (!creds) {
            return NextResponse.json(
                { error: "Credentials not found for this user" },
                { status: 400 }
            );
        }

        const clientId = decrypt(creds.clientIdEnc);
        const clientSecret = decrypt(creds.clientSecretEnc);

        // Exchange code for tokens
        const tokenUrl = "https://accounts.zoho.com/oauth/v2/token";

        const tokenResponse = await axios.post(
            tokenUrl,
            new URLSearchParams({
                code,
                redirect_uri: redirectUri,
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "authorization_code",
            }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        if (!refresh_token) {
            console.error("❌ Zoho did NOT return refresh_token. Check Zoho app settings.");
        }

        // Save encrypted tokens
        await integrationCredentialsCollection.updateOne(
            { userId },
            {
                $set: {
                    accessToken: encrypt(access_token),
                    refreshTokenEnc: refresh_token ? encrypt(refresh_token) : creds.refreshTokenEnc,
                    accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
                },
            }
        );

        console.log("✅ Zoho tokens stored for user:", userId);

        return NextResponse.redirect("/dashboard/zoho-connected");
    } catch (error: any) {
        console.error("Zoho callback error:", error?.response?.data || error);
        return NextResponse.json(
            { error: "OAuth callback failed", details: error?.message },
            { status: 500 }
        );
    }
}
