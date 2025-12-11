import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite';
import { Query } from 'node-appwrite';

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!;
const BANK_COLLECTION_ID = process.env.APPWRITE_BANK_COLLECTION_ID!;

export async function POST(req: Request) {
  try {
    const migrationKey = req.headers.get('x-migration-key');
    if (!migrationKey || migrationKey !== process.env.MIGRATION_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { oldUserId, newUserId, bankId } = body;

    if (!newUserId) {
      return NextResponse.json({ error: 'newUserId is required' }, { status: 400 });
    }

    const { database } = await createAdminClient();

    if (bankId) {
      // update single document
      await database.updateDocument(DATABASE_ID, BANK_COLLECTION_ID, bankId, {
        userId: newUserId,
      });
      return NextResponse.json({ updated: 1 });
    }

    if (!oldUserId) {
      return NextResponse.json({ error: 'oldUserId is required when bankId is not provided' }, { status: 400 });
    }

    const list = await database.listDocuments(DATABASE_ID, BANK_COLLECTION_ID, [Query.equal('userId', [oldUserId])]);
    const docs = list.documents || [];

    let updated = 0;
    for (const d of docs) {
      await database.updateDocument(DATABASE_ID, BANK_COLLECTION_ID, d.$id, {
        userId: newUserId,
      });
      updated++;
    }

    return NextResponse.json({ updated });
  } catch (err: any) {
    console.error('Migration error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
