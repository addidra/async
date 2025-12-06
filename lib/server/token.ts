import { getCollection } from "./mongodb";
import { currentUser } from "@clerk/nextjs/server";
import { decrypt } from "./crypto";

export async function refreshToken() {
    const integrationCollection = await getCollection("integrations");
    const integrationCredentialsCollection = await getCollection("integration_credentials");

    const user = await currentUser();
    const integration = await integrationCollection.findOne({ clerkId: user!.id });
    const creds = await integrationCredentialsCollection.findOne({ integrationId: integration!._id });
    const refreshToken = decrypt(creds!.refreshTokenEnc);
    const clientId = decrypt(creds!.clientIdEnc);
    const clientSecret = decrypt(creds!.clientSecretEnc);
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
    await integrationCredentialsCollection.updateOne(
        { integrationId: integration!._id },
        { $set: { accessToken: newTokenData.access_token } }
    );
    return newTokenData.access_token;
}