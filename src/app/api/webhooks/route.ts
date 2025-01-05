import { Webhook } from "svix";
import { headers } from "next/headers";
// import { WebhookEvent } from "@clerk/nextjs/server";
import { createOrUpdateUser, deleteUser } from "@/lib/actions/user";
import { clerkClient } from "@clerk/clerk-sdk-node";

interface WebhookEvent {
  type: string;
  data: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    email_addresses: { email_address: string }[]; // Corrected type
    username: string | null;
  };
}

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error(
      "Error: Please add SIGNING_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Create new Svix instance with secret

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing Svix headers", {
      status: 400,
    });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(SIGNING_SECRET);

  let evt: WebhookEvent;

  // Verify payload with headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id!,
      "svix-timestamp": svix_timestamp!,
      "svix-signature": svix_signature!,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error: Could not verify webhook:", err);
    return new Response("Error: Verification error", {
      status: 400,
    });
  }

  // Do something with payload
  // For this guide, log payload to console
  const { id } = evt.data;
  const eventType = evt.type;
  console.log(`Received webhook with ID ${id} and event type of ${eventType}`);
  console.log("Webhook payload:", body);

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const { id, first_name, last_name, image_url, email_addresses, username } =
      evt.data;

    try {
      const safeUsername = username || `user_${id}`;
      const user = await createOrUpdateUser({
        id,
        first_name,
        last_name,
        image_url,
        email_addresses,
        username: safeUsername,
      });
      console.log("user:", user);
      console.log("User created or updated successfully");

      if (user && eventType === "user.created") {
        try {
          await clerkClient.users.updateUserMetadata(id, {
            publicMetadata: {
              userMongoId: user._id,
              isAdmin: user.isAdmin,
            },
          });
          console.log("User metadata updated successfully");
        } catch (error) {
          console.error("Error updating user metadata:", error);
        }
      } else {
        console.log("User or eventType check failed");
      }
    } catch (error) {
      console.error("Error creating or updating user:", error);
      return new Response("Error occurred", { status: 400 });
    }
  }
  if (evt.type === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      try {
        await deleteUser(id);
      } catch (error) {
        console.error("Error deleting user:", error);
        return new Response("Error occurred", { status: 400 });
      }
    } else {
      console.error("Error: User ID is undefined");
      return new Response("Error occurred", { status: 400 });
    }
  }
  return new Response("Webhook received", { status: 200 });
}
