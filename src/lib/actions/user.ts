import User from "../models/user.model";

import { connect } from "../mongodb/mongoose";

// type clerkInfo = {
//   id: string;
//   first_name: string;
//   last_name: string;
//   image_url: string;
//   email_addresses: { email_address: string }[]; // Corrected type
//   username: string;
// };
export const createOrUpdateUser = async (
  id: string,
  first_name: string | null,
  last_name: string | null,
  image_url: string | null,
  email_addresses: { email_address: string }[],
  username: string
) => {
  try {
    await connect();
    const user = await User.findOneAndUpdate(
      { clerkId: id },
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
    console.log("Error creating or updating user:", error);
  }
};

export const deleteUser = async (id) => {
  try {
    await connect();
    await User.findOneAndDelete({ clerkId: id });
  } catch (error) {
    console.log("Error deleting user:", error);
    console.log("Error deleting user:", error);
  }
};
