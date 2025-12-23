import Link from 'next/link'
import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BankTabItem } from './BankTabItem'
import BankInfo from './BankInfo'
import TransactionsTable from './TransactionsTable'
import { Pagination } from './Pagination'

const RecentTransactions = ({
    accounts,
    transactions = [],
    appwriteItemId,
    page = 1,
    totalTransactions = transactions.length,
    limit = 10
}: RecentTransactionsProps) => {
  // Use server-provided total count and limit to compute pages and avoid client-side slicing
  const rowsPerPage = Number(limit) || 10;
  const totalPages = Math.max(1, Math.ceil(Number(totalTransactions || transactions.length) / rowsPerPage));

    return (
        <section className='recent-transactions'>
            <header className='flex items-center justify-between'>
                <h2 className='recent-transactions-label'>
                    Recent Transactions
                </h2>
                <Link
                    href={appwriteItemId ? `/transaction-history?id=${appwriteItemId}` : '/transaction-history'}
                    className="view-all-btn"
                >
                    View All
                </Link>
            </header>
            <Tabs defaultValue={appwriteItemId} className="w-full">
                <TabsList
                    className='recent-transactions-tablist'>
                    {accounts.map((account: Account) => (
                        <TabsTrigger key={account.id} value={account.appwriteItemId}>
                            <BankTabItem
                                key={account.id}
                                account={account}
                                appwriteItemId={appwriteItemId}
                            />
                        </TabsTrigger>
                    ))}
                </TabsList>

                {accounts.map((account: Account) => (
                    <TabsContent
                        value={account.appwriteItemId}
                        key={account.id}
                        className="space-y-4"
                    >
                        <BankInfo
                            account={account}
                            appwriteItemId={appwriteItemId}
                            type="full"
                        />
                        <TransactionsTable transactions={transactions} account={account} />

                        <Pagination page={page} totalPages={totalPages} />
                    </TabsContent>
                ))}
            </Tabs>
        </section>
    )
}

export default RecentTransactions