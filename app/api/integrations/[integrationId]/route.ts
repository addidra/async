import { currentUser } from "@clerk/nextjs/server";

import { clientPromise } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(req: Request, { params }: { params: { integrationId: string } }) {
    const user = await currentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const client = await clientPromise;
    const integrationCollection = client.db("async").collection("integrations");
    const integrationCredentialCollection = client.db("async").collection("integration_credentials");
    await integrationCollection.deleteOne({ _id: new ObjectId(params.integrationId), clerkId: user.id });
    await integrationCredentialCollection.deleteMany({ integrationId: new ObjectId(params.integrationId) });
    return new Response("Integration deleted", { status: 200 });
}