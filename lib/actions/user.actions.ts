"use server";

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { parseStringify } from "../utils";
import { redirect } from "next/navigation";

// SIGN IN ----------------------------------------------------

export const signIn = async ({ email, password }: signInProps) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);

    // Write session cookie so middleware can read it
    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    // Redirect immediately after successful login
    redirect("/");

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

// SIGN UP ----------------------------------------------------

export const signUp = async (userData: SignUpParams) => {
  const { email, password, firstname, lastname } = userData;

  try {
    const { account } = await createAdminClient();

    const newUserAccount = await account.create({
      userId: ID.unique(),
      email,
      password,
      name: `${firstname} ${lastname}`,
    });

    const session = await account.createEmailPasswordSession({ email, password });

    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    redirect("/");

  } catch (error) {
    console.error("Error creating account:", error);
    throw error;
  }
};

// GET LOGGED-IN USER -----------------------------------------

export const getLoggedInUser = async () => {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();

    const fullName = user.name || "";
    const [firstName = "", lastName = ""] = fullName.split(" ");

    return {
      $id: user.$id,
      email: user.email,
      userId: user.$id,
      dwollaCustomerUrl: "",
      dwollaCustomerId: "",
      firstName,
      lastName,
      name: fullName,
      address1: "",
      city: "",
      state: "",
      postalCode: "",
      dateOfBirth: "",
      ssn: "",
    };
  } catch {
    return null;
  }
};

// LOGOUT ------------------------------------------------------

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();

    cookies().delete("appwrite-session");
    await account.deleteSession("current");

    redirect("/sign-in");

  } catch (error) {
    console.error("Error logging out:", error);
    return null;
  }
};
