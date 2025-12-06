import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { clientPromise } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(
    req: NextRequest,
    context: { params: { integrationId: string } }
) {
    const user = await currentUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const integrationId = context.params.integrationId;

    const client = await clientPromise;
    const integrationCollection = client.db("async").collection("integrations");
    const integrationCredentialCollection = client.db("async").collection("integration_credentials");

    await integrationCollection.deleteOne({
        _id: new ObjectId(integrationId),
        clerkId: user.id,
    });

    await integrationCredentialCollection.deleteMany({
        integrationId: new ObjectId(integrationId),
    });

    return NextResponse.json({ message: "Integration deleted" });
}
