import { currentUser } from '@clerk/nextjs/server';
import { Integration, IntegrationCredential } from "@/models/models";
import { clientPromise } from "@/lib/server/mongodb";
import { encrypt, decrypt } from "@/lib/server/crypto";

interface getTokenRequestBody {
    code: string;
    clientId: string;
    clientSecret: string;
    provider: string;
    orgId?: string | null;
}

export async function POST(req: Request) {
    const body: getTokenRequestBody = await req.json();

    const user = await currentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    console.log("Fetching Zoho token for user:", user.id);
    const res = await fetch(
        `https://accounts.zoho.com/oauth/v2/token?code=${body.code}&client_id=${body.clientId}&client_secret=${body.clientSecret}&grant_type=authorization_code`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );

    const creds = await res.json();
    console.log("Zoho token response data:", creds);

    const integration: Integration = {
        clerkId: user?.id || '',
        provider: body.provider,
        orgId: body.orgId || null,
        connected: true,
        createdAt: new Date(),
    }
    const client = await clientPromise;
    const integrationCollection = client.db("async").collection("integrations");
    const integrationCredentialCollection = client.db("async").collection("integration_credentials");
    const result = await integrationCollection.insertOne(integration);

    const integrationCredential: IntegrationCredential = {
        integrationId: result.insertedId,
        clientIdEnc: encrypt(body.clientId),
        clientSecretEnc: encrypt(body.clientSecret),
        refreshTokenEnc: encrypt(creds.refresh_token),
        accessToken: creds.access_token,
        tokenExpiry: new Date(Date.now() + creds.expires_in),
        createdAt: new Date(),
        updatedAt: new Date(),
    }
    await integrationCredentialCollection.insertOne(integrationCredential);
    return new Response(JSON.stringify({ message: 'Integration added successfully' }), { status: 200 });
}

// const data = {
//     access_token: '1000.2de2ba67b21de2e35c5976c10ddf1fbb.01847c0aba2df5cf6276f2cb40468f1c',
//     refresh_token: '1000.97e04fe63376764a26038db5f1f2cc7a.6ab5b9fc813a3a898c4d50667a3e28fe',
//     scope: 'ZohoCRM.settings.ALL ZohoCRM.modules.all',
//     api_domain: 'https://www.zohoapis.com',
//     token_type: 'Bearer',
//     expires_in: 3600
// }