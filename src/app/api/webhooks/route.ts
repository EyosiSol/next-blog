import { Webhook, WebhookRequiredHeaders } from "svix";
import { headers } from "next/headers";
import { createOrUpdateUser, deleteUser } from "@/lib/actions/user";
// import { WebhookEvent } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/clerk-sdk-node";

type ClerkEvent = {
  id: string;
  type: string;
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
    email_addresses?: { email_address: string }[] | null;
    username?: string | null;
  };
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const SIGNING_SECRET = process.env.SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error(
      "Error: Please add SIGNING_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Validate headers
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Error occurred -- missing svix headers", {
      status: 400,
    });
  }

  // Get and verify payload
  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(SIGNING_SECRET);
  let evt: ClerkEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    } as WebhookRequiredHeaders) as ClerkEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new NextResponse("Error occurred during verification", {
      status: 400,
    });
  }

  const { id, type: eventType, data } = evt;

  console.log(`Received webhook with ID ${id} and event type ${eventType}`);
  console.log("Webhook payload:", body);

  try {
    if (eventType === "user.created" || eventType === "user.updated") {
      const user = await createOrUpdateUser({
        id: data.id,
        first_name: data.first_name ?? null,
        last_name: data.last_name ?? null,
        image_url: data.image_url ?? null,
        email_addresses: data.email_addresses ?? [],
        username: data.username ?? null,
      });

      if (user && eventType === "user.created") {
        try {
          await clerkClient.users.updateUserMetadata(data.id, {
            publicMetadata: {
              userMongoId: user._id,
              isAdmin: user.isAdmin,
            },
          });
        } catch (error) {
          console.error("Error updating user metadata:", error);
        }
      }
    } else if (eventType === "user.deleted") {
      await deleteUser(data.id);
    }
  } catch (error) {
    console.error(`Error processing event ${eventType}:`, error);
    return new NextResponse("Error occurred during event handling", {
      status: 400,
    });
  }

  return new NextResponse("", { status: 200 });
}
