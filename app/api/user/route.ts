// import { Webhook } from "svix";
// import { headers } from "next/headers";
// import { NextResponse } from "next/server";
// import { usersCollection } from "@/lib/mongodb";

// export async function POST(req: Request) {
//     const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

//     if (!WEBHOOK_SECRET) {
//         throw new Error("Missing Clerk webhook secret");
//     }

//     // Parse request
//     const payload = await req.text();
//     const headerList = await headers();

//     const svixHeaders = {
//         "svix-id": headerList.get("svix-id")!,
//         "svix-timestamp": headerList.get("svix-timestamp")!,
//         "svix-signature": headerList.get("svix-signature")!,
//     };

//     const wh = new Webhook(WEBHOOK_SECRET);

//     let evt: any;
//     try {
//         evt = wh.verify(payload, svixHeaders);
//     } catch (err) {
//         console.error("Webhook verification failed:", err);
//         return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
//     }

//     const eventType = evt.type;
//     const data = evt.data;

//     if (eventType === "user.created") {
//         const user = {
//             clerkId: data.id,
//             email: data.email_addresses[0].email_address,
//             username:
//                 data.username ||
//                 data.email_addresses[0].email_address.split("@")[0],
//             createdAt: new Date(),
//             updatedAt: new Date(),
//         };

//         // Upsert user
//         await usersCollection.updateOne(
//             { clerkId: user.clerkId },
//             { $setOnInsert: user },
//             { upsert: true }
//         );

//         console.log("User stored in DB:", user.email);
//     }

//     return NextResponse.json({ ok: true });
// }
