import { Pagination } from '@/components/Pagination';
import TransactionsTable from '@/components/TransactionsTable';
import HeaderBox from '@/components/ui/HeaderBox';
import { getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { formatAmount } from '@/lib/utils';
import React from 'react'

const TransactionHistory = async ({ searchParams: { id, page } }: SearchParamProps) => {
  const currentPage = Number(page as string) || 1;
  const loggedIn = await getLoggedInUser();
  const accounts = await getAccounts({
    userId: loggedIn.$id
  })

  if (!accounts?.data?.length) {
    return <div>No accounts found</div>;
  }

  const rowsPerPage = 10;

  const allTransactions = accounts.transactions ?? [];

  const totalPages = Math.ceil(allTransactions.length / rowsPerPage);

  const indexOfLastTransaction = currentPage * rowsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;

  const currentTransactions = allTransactions.slice(
    indexOfFirstTransaction,
    indexOfLastTransaction
  );

  return (
    <div className="transactions">
      <div className="transactions-header">
        <HeaderBox
          title="Transaction History"
          subtext="See your bank details and transactions."
        />
      </div>

      <div className="space-y-6">
        <div className="transactions-account grid grid-rows-3 gap-4">
          {accounts.data.map((account: Account) => (
            <div
              key={account.id}
              className="w-full rounded-xl bg-blue-600 p-6 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-18 font-bold text-white">
                  {account.name}
                </h2>

                <p className="text-14 text-blue-100">
                  {account.officialName}
                </p>
              </div>

              <div className="mt-4">
                <p className="text-14 font-semibold tracking-widest text-white">
                  ●●●● ●●●● ●●●● {account.mask}
                </p>

                <p className="text-14 mt-2 text-white">
                  Balance: {formatAmount(account.currentBalance)}
                </p>
              </div>
            </div>
          ))}
        </div>


        <section className="flex w-full flex-col gap-6">
          <TransactionsTable transactions={currentTransactions} />
          {totalPages > 1 && (
            <div className="my-4 w-full">
              <Pagination totalPages={totalPages} page={currentPage} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default TransactionHistory