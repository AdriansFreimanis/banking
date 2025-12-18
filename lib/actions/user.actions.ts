"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, extractIdFromUrl, parseStringify } from "../utils";
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
  const { email, firstName, lastName } = userData;

  let newUserAccount;

  try {
    const { account, database } = await createAdminClient();

    newUserAccount = await account.create({
      userId: ID.unique(),
      email,
      password,
      name: `${firstName} ${lastName}`,
    });

    if(!newUserAccount) throw new Error("Account creation failed");

   
    const dwollaPayload = {
      firstName: userData.firstName,
      lastName: userData.lastName,
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
    const { account: sessionAccount } = await createSessionClient();
    const sessionUser = await sessionAccount.get();

    // Attempt to resolve the full user document from the DB so we include Dwolla IDs and other stored fields
    const { database } = await createAdminClient();
    const users = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [sessionUser.$id])]
    );

    if (users && users.total === 1) {
      return parseStringify(users.documents[0]);
    }

    // Fallback: return minimal info constructed from the auth account
    const fullName = sessionUser.name || "";
    const [firstName = "", lastName = ""] = fullName.split(" ");

    return {
      $id: sessionUser.$id,
      email: sessionUser.email,
      userId: sessionUser.$id,
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
  } catch (err) {
    console.error('Error fetching logged-in user document', err);
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
      // Request transactions in addition to auth so we can access transaction data
      products: ['auth', 'transactions'] as Products[],
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
  shareableId,
}: createBankAccountProps) => {
  try {
    const { database } = await createAdminClient();
    
    // Extract fundingSourceId from the Dwolla URL
    const fundingSourceId = extractIdFromUrl(fundingSourceUrl);
    
    console.log('Creating bank account with:', {
      userId,
      bankId,
      accountId,
      fundingSourceId,
      shareableId,
    });
    
    const bankAccount = await database.createDocument(
       DATABASE_ID!,
       BANK_COLLECTION_ID!,
       ID.unique(),
       {
      userId: userId,
        bankId,
        accountId,
        accessToken,
        fundingSourceId,
        shareableId,  
       }
    )
     console.log('Bank account created successfully:', bankAccount.$id, 'userId stored:', bankAccount.userId);
    return parseStringify(bankAccount);
     
  } catch (error) {
    console.error('Error creating bank account:', error);
    return null;
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

    // Ensure we have the latest users collection document for the session user
    const { account: sessionAccount } = await createSessionClient();
    const sessionUser = await sessionAccount.get();

    const { database } = await createAdminClient();
    const users = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [sessionUser.$id])]
    );

    if (!users || users.total !== 1) {
      console.error('Could not find matching user document for session id', sessionUser.$id, users);
      throw new Error('User document not found for session user');
    }

    const dbUser = users.documents[0];

    if (!dbUser.dwollaCustomerId) {
      console.error('Dwolla customer id is missing on users document', dbUser);
      throw new Error('Missing Dwolla customer id for user. Please contact support.');
    }

    // Create a funding source URL for the account using the Dwolla customer ID, processor token, and bank name
    let fundingSourceUrl: string | null = null;
    try {
      fundingSourceUrl = await addFundingSource({
        dwollaCustomerId: dbUser.dwollaCustomerId,
        processorToken,
        bankName: accountData.name,
      });
    } catch (err: any) {
      console.error('Dwolla addFundingSource error:', err);
      throw new Error(`Failed to create funding source with Dwolla: ${err?.message || err}`);
    }

    // If the funding source URL is not created, throw an error
    if (!fundingSourceUrl) {
      console.error('Dwolla addFundingSource returned no URL', { dbUser: dbUser.$id, account: accountData.account_id });
      throw new Error('Failed to create funding source with Dwolla');
    }

    // Use the users collection document `$id` as the relationship when creating the bank document
    // Use the `userId` value stored on the users document (this is the
    // auth account id) so the banks `userId` field contains the user table's
    // `userId` value as requested.
    const usersCollectionUserId = users.documents[0].userId;

    if (!usersCollectionUserId) {
      console.error('users document found but missing `userId` field', users.documents[0]);
      throw new Error('User document missing userId field');
    }

    // Create a bank account using the users collection document `$id` as the relationship
    // Appwrite relation attributes expect an array of document ids, so pass an array
    const appwriteUserDocId = users.documents[0].$id;

    const bankAccountResult = await createBankAccount({
      userId: appwriteUserDocId,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });
    
    if (!bankAccountResult) {
      console.error('Failed to create bank account');
      throw new Error('Failed to create bank account');
    }
    
    console.log('Bank account creation successful, revalidating path');

    // Revalidate the path to reflect the changes
    revalidatePath("/");

    // Return a success message
    return parseStringify({
      publicTokenExchange: "complete",
    });
  } catch (error) {
    // Log any errors that occur during the process
    console.error("An error occurred while exchanging token:", error);
    throw error;
  }
};

export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const { database } = await createAdminClient();
    // The caller may pass either the auth user id (user.userId) or the
    // users-collection document id. Normalize to the users-collection
    // document id before querying the banks relation attribute.
    let userDocId = userId;

    // If a users document exists for the provided auth id, use that doc's $id
    const users = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    );

    if (users && users.total === 1) {
      userDocId = users.documents[0].$id;
    }

    const banks = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('userId', [userDocId])]
    );

    return parseStringify(banks.documents);
  } catch (error) {
    console.log(error)
  }
}

export const getBank = async ({ documentId }: getBankProps) => {
  try {
    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('$id', [documentId])]
    )

    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.log(error)
  }
}

export const getBankByAccountId = async ({ accountId }: getBankByAccountIdProps) => {
  try {
    const { database } = await createAdminClient();

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('accountId', [accountId])]
    )

    if(bank.total !== 1) return null;

    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.log(error)
  }
}
