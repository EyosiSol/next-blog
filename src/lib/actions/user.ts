import User from "../models/user.model";

import { connect } from "../mongodb/mongoose";

type clerkInfo = {
  id: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  email_addresses: { email_address: string }[]; // Corrected type
  username: string;
};
export const createOrUpdateUser = async ({
  id,
  first_name,
  last_name,
  image_url,
  email_addresses,
  username,
}: clerkInfo) => {
  try {
    await connect();
    const user = await User.findOneAndUpdate(
      { clerkID: id },
      {
        $set: {
          firstName: first_name,
          lastName: last_name,
          profilePicture: image_url,
          email: email_addresses[0].email_address,
          username,
        },
      },
      { new: true, upsert: true }
    );

    return user;
  } catch (error) {
    console.log("Error Creating or Updating the user:", error);
  }
};

export const deleteUser = async (id: string) => {
  try {
    await connect();
    await User.findOneAndDelete({ clerkID: id });
  } catch (error) {
    console.log("Error Deleting the User:", error);
  }
};
