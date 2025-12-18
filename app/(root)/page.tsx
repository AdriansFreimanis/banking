import RightSidebar from '@/components/RightSidebar';
import HeaderBox from '@/components/ui/HeaderBox';
import TotalBalanceBox from '@/components/ui/TotalBalanceBox';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getAccounts } from '@/lib/actions/bank.actions';
import React from 'react';
import RecentTransactions from '@/components/RecentTransactions';

const Home = async () => {
  const loggedIn = await getLoggedInUser();

  // Fetch Plaid/Appwrite enriched accounts for the logged in user
  let accountsResponse: any = null;
  let accounts: any[] = [];
  let totalBanks = 0;
  let totalCurrentBalance = 0;
  let currentPage = 1;
  let transactions: any[] = [];
  let appwriteItemId: string = '';

  if (loggedIn?.$id) {
    accountsResponse = await getAccounts({ userId: loggedIn.$id });
    console.log('getAccounts response for user', loggedIn.$id, accountsResponse);

    if (accountsResponse) {
      accounts = accountsResponse.data || [];
      totalBanks = accountsResponse.totalBanks ?? accounts.length;
      totalCurrentBalance = accountsResponse.totalCurrentBalance ?? accounts.reduce((sum: number, a: any) => sum + (a.currentBalance || 0), 0);
      appwriteItemId = accountsResponse.appwriteItemId || null;
      transactions = accountsResponse.transactions || [];
      currentPage = accountsResponse.currentPage || 1;
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
        page={currentPage}/>
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
