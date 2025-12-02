"use server";

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { redirect } from "next/navigation";
import { CountryCode, Products, LinkTokenCreateRequest, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "../dwolla.actions";

const{
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

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

export const signUp = async ({password, ...userData}: SignUpParams) => {
  const { email, firstname, lastname } = userData;

  let newUserAccount;

  try {
    const { account, database } = await createAdminClient();

    newUserAccount = await account.create({
      userId: ID.unique(),
      email,
      password,
      name: `${firstname} ${lastname}`,
    });

    if(!newUserAccount) throw new Error("Account creation failed");

   
    const dwollaPayload = {
      firstName: userData.firstname,
      lastName: userData.lastname,
      email: userData.email,
      type: "personal",
      address1: userData.address1,
      city: userData.city,
      state: userData.state,
      postalCode: userData.postalCode,
      dateOfBirth: userData.dateOfBirth,
      ssn: userData.ssn,
    };

    const dwollaCustomerUrl = await createDwollaCustomer(dwollaPayload);

    if(!dwollaCustomerUrl) throw new Error("Dwolla customer creation failed");

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),{
        ...userData,
        userId: newUserAccount.$id,
        dwollaCustomerUrl,
        dwollaCustomerId,
      }
    );

    const session = await account.createEmailPasswordSession({ email, password });

    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify(newUser);

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

export const createLinkToken = async (user: User) => {
  try {

    // ensure client_name is a string. Some callers may pass `user.name` as an object
    const clientNameString =
      typeof user.name === 'string'
        ? user.name
        : `${(user.firstName || '').trim()} ${(user.lastName || '').trim()}`.trim() || 'Vexa';

    const tokenParams: LinkTokenCreateRequest = {
      user: { client_user_id: user.$id },
      client_name: clientNameString,
      products: ['auth'] as Products[],
      language: 'en',
      country_codes: ['US'] as CountryCode[],
    };

    // Call Plaid; cast call to any if SDK typings mismatch
    const response = await (plaidClient.linkTokenCreate as any)(tokenParams);
    return response?.data?.link_token ?? null;
  } catch (error) {
    console.log("Error creating link token:", error);
    return null;
  }
}

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  sharableId,
}: createBankAccountProps) => {
  try {
    const { database } = await createAdminClient();
    const bankAccount = await database.createDocument(
       DATABASE_ID!,
       BANK_COLLECTION_ID!,
       ID.unique(),
       {
        userId,
        bankId,
        accountId,
        accessToken,
        fundingSourceUrl,
        sharableId,  
       }
    )
    return parseStringify(bankAccount);
     
  } catch (error) {

  }
}

// This function exchanges a public token for an access token and item ID
export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    // Exchange public token for access token and item ID
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Get account information from Plaid using the access token
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    // Create a processor token for Dwolla using the access token and account ID
    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse =
      await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;

    // Create a funding source URL for the account using the Dwolla customer ID, processor token, and bank name
    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });

    // If the funding source URL is not created, throw an error
    if (!fundingSourceUrl) throw Error;

    // Create a bank account using the user ID, item ID, account ID, access token, funding source URL, and sharable ID
    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      sharableId: encryptId(accountData.account_id),
    });

    // Revalidate the path to reflect the changes
    revalidatePath("/");

    // Return a success message
    return parseStringify({
      publicTokenExchange: "complete",
    });
  } catch (error) {
    // Log any errors that occur during the process
    console.error("An error occurred while creating exchanging token:", error);
  }
};
