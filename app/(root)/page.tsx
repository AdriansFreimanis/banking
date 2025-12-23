import RightSidebar from '@/components/RightSidebar';
import HeaderBox from '@/components/ui/HeaderBox';
import TotalBalanceBox from '@/components/ui/TotalBalanceBox';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getAccounts } from '@/lib/actions/bank.actions';
import React from 'react';
import RecentTransactions from '@/components/RecentTransactions';

const Home = async ({ searchParams }: SearchParamProps) => {
  const loggedIn = await getLoggedInUser();

  // Fetch Plaid/Appwrite enriched accounts for the logged in user
  let accountsResponse: any = null;
  let accounts: any[] = [];
  let totalBanks = 0;
  let totalCurrentBalance = 0;
  let currentPage = 1;
  let transactions: any[] = [];
  let totalTransactions = 0;
  let appwriteItemId: string = '';

  // Parse page, limit and optional account id from query params and validate
  const rawPage = Array.isArray(searchParams?.page) ? searchParams?.page[0] : searchParams?.page;
  const rawLimit = Array.isArray(searchParams?.limit) ? searchParams?.limit[0] : searchParams?.limit;
  const rawAccountId = Array.isArray(searchParams?.id) ? searchParams?.id[0] : searchParams?.id;
  const parsedPage = parseInt(String(rawPage || ""), 10);
  const parsedLimit = parseInt(String(rawLimit || ""), 10);
  const safePage = !Number.isNaN(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const safeLimit = !Number.isNaN(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
  const safeAccountId = rawAccountId ? String(rawAccountId) : undefined;

  if (loggedIn?.$id) {
    accountsResponse = await getAccounts({ userId: loggedIn.$id, page: safePage, limit: safeLimit, bankId: safeAccountId });
    console.log('getAccounts response for user', loggedIn.$id, accountsResponse);

    if (accountsResponse) {
      accounts = accountsResponse.data || [];
      totalBanks = accountsResponse.totalBanks ?? accounts.length;
      totalCurrentBalance = accountsResponse.totalCurrentBalance ?? accounts.reduce((sum: number, a: any) => sum + (a.currentBalance || 0), 0);
      appwriteItemId = safeAccountId || accountsResponse.appwriteItemId || null;
      transactions = accountsResponse.transactions || [];
      totalTransactions = accountsResponse.totalTransactions ?? (accountsResponse.transactions?.length || 0);
      currentPage = accountsResponse.currentPage || safePage;
    }
  }
    // Build a single display name to avoid duplicating first + full name in the UI
    const displayName = loggedIn
      ? (loggedIn.name && loggedIn.name.trim().length > 0
          ? loggedIn.name
          : `${(loggedIn.firstName || '').trim()} ${(loggedIn.lastName || '').trim()}`.trim())
      : 'Guest';

    return (
      <section className="home">
        <div className="home-content">
          <header className="home-header">
            <HeaderBox
              type="greeting"
              title={`Welcome`}
              user={displayName}
              subtext="Access and manage your account and payments"
            />
          <TotalBalanceBox
            accounts={accounts}
            totalBanks={totalBanks || accounts.length}
            totalCurrentBalance={totalCurrentBalance}
          />
        </header>

        <RecentTransactions
        accounts={accounts}
        transactions={transactions}
        appwriteItemId={appwriteItemId}
        page={currentPage}
        totalTransactions={totalTransactions} />
      </div>

      <RightSidebar
        user={loggedIn as any}
        transactions={[]}
        banks={accounts.map((a: any) => ({ $id: a.appwriteItemId, ...a }))}
      />
    </section>
  );
};

export default Home;
