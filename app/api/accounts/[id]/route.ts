import { NextResponse } from 'next/server';
import { getAccount } from '@/lib/actions/bank.actions';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    const accountResp: any = await getAccount({ appwriteItemId: id });
    // getAccount returns a parsed object: { data: account, transactions: [...] }
    const transactions = accountResp?.transactions || [];

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error(`/api/accounts/${id}/transactions: error`, err);
    return NextResponse.json({ transactions: [] }, { status: 500 });
  }
}
