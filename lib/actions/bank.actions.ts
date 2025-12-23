"use server";

import {
  ACHClass,
  CountryCode,
  TransferAuthorizationCreateRequest,
  TransferCreateRequest,
  TransferNetwork,
  TransferType,
} from "plaid";

import { plaidClient } from "../plaid";
import { parseStringify } from "../utils";

import { getTransactionsByBankId } from "./transaction.actions";
import { getBanks, getBank } from "./user.actions";

// Get multiple bank accounts
export const getAccounts = async ({ userId, page = 1, limit = 10, bankId }: getAccountsProps) => {
  try {
    // get banks from db
    const banks = await getBanks({ userId });

    const accounts = await Promise.all(
      banks?.map(async (bank: Bank) => {
        // get each account info from plaid
        const accountsResponse = await plaidClient.accountsGet({
          access_token: bank.accessToken,
        });
        const accountData = accountsResponse.data.accounts[0];

        // get institution info from plaid
        const institution = await getInstitution({
          institutionId: accountsResponse.data.item.institution_id!,
        });

        const account = {
          id: accountData.account_id,
          availableBalance: accountData.balances.available!,
          currentBalance: accountData.balances.current!,
          institutionId: institution.institution_id,
          name: accountData.name,
          officialName: accountData.official_name,
          mask: accountData.mask!,
          type: accountData.type as string,
          subtype: accountData.subtype! as string,
          appwriteItemId: bank.$id,
          shareableId: bank.shareableId,
          userId: bank.userId,
        };

        return account;
      })
    );

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((total, account) => {
      return total + account.currentBalance;
    }, 0);

    // Fetch transactions for each bank and combine them into a single list
    // If bankId (appwriteItemId) is provided, only fetch transactions for that bank
    const banksToProcess = bankId ? banks.filter((b: Bank) => b.$id === bankId) : banks;

    const allTransactionsArrays = await Promise.all(
      banksToProcess.map(async (bank: Bank) => {
        try {
          // Plaid-sourced transactions
          const plaidTransactions = (await getTransactions({
            accessToken: bank.accessToken,
          })) || [];

          // Appwrite-sourced transfer transactions (custom records)
          const transferTransactionsData = await getTransactionsByBankId({ bankId: bank.$id });
          const transferTransactions = (transferTransactionsData?.documents || []).map((t: Transaction) => ({
            id: t.$id,
            name: t.name ?? "Transfer",
            amount: Number(t.amount) || parseFloat(String(t.amount)) || 0,
            // Use Appwrite's full ISO timestamp for accuracy
            date: t.$createdAt,
            paymentChannel: t.channel ?? "online",
            category: t.category ?? "Transfer",
            type: t.senderBankId === bank.$id ? "debit" : "credit",
            accountId: bank.accountId,
            pending: false,
            image: "",
          }));

          // debug logs to help verify counts and normalized dates
          console.log(`[SERVER] Bank ${bank.$id} - plaidTx: ${plaidTransactions.length}, transferTx: ${transferTransactions.length}`);
          console.log(`[SERVER] Bank ${bank.$id} - transfer sample dates: ${transferTransactions.slice(0,3).map((x: Transaction) => x.date).join(', ')}`);

          // combine both sources so the frontend sees a unified list
          return [...plaidTransactions, ...transferTransactions];
        } catch (e) {
          console.error('Error fetching transactions for bank', bank.$id, e);
          return [];
        }
      })
    );

    const transactions = allTransactionsArrays.flat();

    // Sort combined transactions by date (newest first). Dates are normalized to YYYY-MM-DD.
    const sortedTransactions = transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Debug: show top 5 dates after sorting to verify ordering
    console.log(`[SERVER] Sorted transactions sample dates: ${sortedTransactions.slice(0,5).map(t => t.date).join(', ')}`);

    // Server-side paging: calculate total and slice the sorted array
    const totalTransactions = sortedTransactions.length;
    // Enforce a maximum of 10 rows per page so pages show at most 10 rows and the last page contains remaining items
    const requestedLimit = Number(limit) || 10;
    const safeLimit = Math.max(1, Math.min(10, Math.floor(requestedLimit)));
    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    const startIndex = (safePage - 1) * safeLimit;
    const paginatedTransactions = sortedTransactions.slice(startIndex, startIndex + safeLimit);

    return parseStringify({
      data: accounts,
      totalBanks,
      totalCurrentBalance,
      transactions: paginatedTransactions,
      totalTransactions,
      currentPage: safePage,
      limit: safeLimit,
    });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get one bank account
export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
  try {
    // get bank from db
    const bank = await getBank({ documentId: appwriteItemId });

    // get account info from plaid
    const accountsResponse = await plaidClient.accountsGet({
      access_token: bank.accessToken,
    });
    const accountData = accountsResponse.data.accounts[0];

    // get transfer transactions from appwrite
    const transferTransactionsData = await getTransactionsByBankId({
      bankId: bank.$id,
    });

    const transferTransactions = transferTransactionsData.documents.map(
      (transferData: Transaction) => ({
        id: transferData.$id,
        name: transferData.name ?? "Transfer",
        // ensure amount is a number to match Plaid shape
        amount: Number(transferData.amount) || parseFloat(String(transferData.amount)) || 0,
        // Use Appwrite's full ISO timestamp for accuracy
        date: transferData.$createdAt,
        paymentChannel: transferData.channel ?? "online",
        // default category to 'Transfer' for custom transactions
        category: transferData.category ?? "Transfer",
        type: transferData.senderBankId === bank.$id ? "debit" : "credit",
        // ensure the frontend filtering by accountId will include these items
        accountId: accountData.account_id,
        pending: false,
        image: "",
      })
    );

    // get institution info from plaid
    const institution = await getInstitution({
      institutionId: accountsResponse.data.item.institution_id!,
    });

    const transactions = await getTransactions({
      accessToken: bank?.accessToken,
    });

    const account = {
      id: accountData.account_id,
      availableBalance: accountData.balances.available!,
      currentBalance: accountData.balances.current!,
      institutionId: institution.institution_id,
      name: accountData.name,
      officialName: accountData.official_name,
      mask: accountData.mask!,
      type: accountData.type as string,
      subtype: accountData.subtype! as string,
      appwriteItemId: bank.$id,
      shareableId: bank.shareableId,
    };

    // sort transactions by date such that the most recent transaction is first
    const allTransactions = [...transactions, ...transferTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return parseStringify({
      data: account,
      transactions: allTransactions,
    });
  } catch (error) {
    console.error("An error occurred while getting the account:", error);
  }
};

// Get bank info
export const getInstitution = async ({
  institutionId,
}: getInstitutionProps) => {
  try {
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"] as CountryCode[],
    });

    const intitution = institutionResponse.data.institution;

    return parseStringify(intitution);
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get transactions
export const getTransactions = async ({
  accessToken,
}: getTransactionsProps) => {
  let hasMore = true;
  let transactions: any = [];

  try {
    // Iterate through each page of new transaction updates for item
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
      });

      const data = response.data;

      transactions = response.data.added.map((transaction) => ({
        id: transaction.transaction_id,
        name: transaction.name,
        paymentChannel: transaction.payment_channel,
        type: transaction.payment_channel,
        accountId: transaction.account_id,
        amount: transaction.amount,
        pending: transaction.pending,
        category:          
        transaction.personal_finance_category?.primary ??
        transaction.personal_finance_category?.detailed ??
        "Uncategorized",
        // Convert Plaid's YYYY-MM-DD date to a full ISO timestamp for consistent sorting
        date: new Date(transaction.date).toISOString(),
        image: transaction.logo_url,
      }));

      hasMore = data.has_more;
    }

    return parseStringify(transactions);
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Create Transfer
export const createTransfer = async () => {
  const transferAuthRequest: TransferAuthorizationCreateRequest = {
    access_token: "access-sandbox-cddd20c1-5ba8-4193-89f9-3a0b91034c25",
    account_id: "Zl8GWV1jqdTgjoKnxQn1HBxxVBanm5FxZpnQk",
    funding_account_id: "442d857f-fe69-4de2-a550-0c19dc4af467",
    type: "credit" as TransferType,
    network: "ach" as TransferNetwork,
    amount: "10.00",
    ach_class: "ppd" as ACHClass,
    user: {
      legal_name: "Anne Charleston",
    },
  };
  try {
    const transferAuthResponse =
      await plaidClient.transferAuthorizationCreate(transferAuthRequest);
    const authorizationId = transferAuthResponse.data.authorization.id;

    const transferCreateRequest: TransferCreateRequest = {
      access_token: "access-sandbox-cddd20c1-5ba8-4193-89f9-3a0b91034c25",
      account_id: "Zl8GWV1jqdTgjoKnxQn1HBxxVBanm5FxZpnQk",
      description: "payment",
      authorization_id: authorizationId,
    };

    const responseCreateResponse = await plaidClient.transferCreate(
      transferCreateRequest
    );

    const transfer = responseCreateResponse.data.transfer;
    return parseStringify(transfer);
  } catch (error) {
    console.error(
      "An error occurred while creating transfer authorization:",
      error
    );
  }
};