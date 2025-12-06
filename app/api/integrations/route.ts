import { currentUser } from "@clerk/nextjs/server";
import { clientPromise } from "@/lib/mongodb";
import { ObjectId } from "mongodb";


export async function GET() {
    const user = await currentUser();
    if (!user) return new Response("Unauthorized", { status: 401 });
    const client = await clientPromise;
    const integrationCollection = client.db("async").collection("integrations");
    let integrations = await integrationCollection.find({ clerkId: user.id }).toArray();
    return new Response(JSON.stringify(integrations), { status: 200 });
}

