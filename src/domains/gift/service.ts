import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { postJournal } from '@/domains/ledger/service';
import { writeAudit } from '@/lib/audit';
import type { GiftOccasion, GiftCardStatus } from '@prisma/client';

const GIFT_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes 0, 1, I, O to prevent confusion
const DEFAULT_EXPIRY_DAYS = 365; // 1 year
const REWARD_POINTS_PER_GIFT_REDEEM = 50;

/**
 * Generate a formatted gift card code: NKC-XXXX-XXXX-XXXX
 */
export function generateGiftCardCode(): string {
  const bytes = randomBytes(12);
  let chars = '';
  for (let i = 0; i < bytes.length; i++) {
    chars += GIFT_CODE_ALPHABET[bytes[i] % GIFT_CODE_ALPHABET.length];
  }
  return `NKC-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

/**
 * Standardize code for hashing (strip spaces/dashes and uppercase)
 */
export function normalizeGiftCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * Cryptographic SHA-256 hash of the normalized code
 */
export function hashGiftCode(raw: string): string {
  const norm = normalizeGiftCode(raw);
  return createHash('sha256').update(`nkc-gift:${norm}`).digest('hex');
}

/**
 * Mask code for safe display (e.g., NKC-****-****-9ABC)
 */
export function maskGiftCode(codeOrRaw: string): string {
  const norm = normalizeGiftCode(codeOrRaw);
  if (norm.length < 4) return 'NKC-****-****-****';
  const last4 = norm.slice(-4);
  return `NKC-****-****-${last4}`;
}

export type PurchaseGiftCardInput = {
  creatorUserId?: string;
  senderName?: string;
  amountKobo: number; // e.g. 100000 = ₦1,000
  occasion?: GiftOccasion;
  message?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  businessId?: string;
  pinVerified?: boolean;
};

/**
 * Get or create the operational gift liability pool account on the ledger
 */
async function getOrCreateGiftPoolAccount(tx?: any): Promise<string> {
  const client = tx || prisma;
  let pool = await client.account.findFirst({
    where: { accountNumber: 'GIFT_POOL_NGN' },
  });
  if (!pool) {
    const owner = await client.user.findFirst({ where: { role: 'owner' } })
      || await client.user.findFirst();
    pool = await client.account.create({
      data: {
        userId: owner?.id || '00000000-0000-0000-0000-000000000000',
        accountNumber: 'GIFT_POOL_NGN',
        currency: 'NGN',
        status: 'ACTIVE',
      },
    });
  }
  return pool.id;
}

/**
 * Purchase and issue a new Nakconel Gift Card.
 * Debits the creator's account and credits the gift liability ledger account.
 */
export async function purchaseGiftCard(input: PurchaseGiftCardInput) {
  if (!Number.isSafeInteger(input.amountKobo) || input.amountKobo < 100_00) {
    throw new Error('Minimum gift card amount is ₦100');
  }
  if (input.amountKobo > 500_000_00) {
    throw new Error('Maximum gift card amount is ₦500,000');
  }

  // If purchased by an authenticated user, debit their NGN account
  let debitAccountId: string | null = null;
  if (input.creatorUserId) {
    if (!input.pinVerified) {
      throw new Error('Transaction PIN verification required.');
    }
    const senderAcc = await prisma.account.findFirst({
      where: { userId: input.creatorUserId, currency: 'NGN', status: 'ACTIVE' },
    });
    if (!senderAcc) throw new Error('Active NGN funding account not found.');
    debitAccountId = senderAcc.id;
  }

  const rawCode = generateGiftCardCode();
  const codeHash = hashGiftCode(rawCode);
  const codeMasked = maskGiftCode(rawCode);
  const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const card = await (prisma as any).$transaction(async (tx: any) => {
    // If user funded, post double-entry ledger debit to pool
    if (debitAccountId && input.creatorUserId) {
      // Check the available ledger balance inside the same database transaction.
      // This prevents Gift purchases from creating an overdraft.
      const [credits, debits] = await Promise.all([
        tx.ledgerEntry.aggregate({
          where: { creditAccountId: debitAccountId, status: 'POSTED', currency: 'NGN' },
          _sum: { amount: true },
        }),
        tx.ledgerEntry.aggregate({
          where: { debitAccountId, status: 'POSTED', currency: 'NGN' },
          _sum: { amount: true },
        }),
      ]);
      const availableBalance = (credits._sum.amount ?? 0) - (debits._sum.amount ?? 0);
      if (availableBalance < input.amountKobo) {
        throw new Error('Insufficient balance. Gift cards can only be purchased with available funds.');
      }

      const poolAccountId = await getOrCreateGiftPoolAccount(tx);
      await postJournal({
        description: `Gift Card Purchase - ${input.occasion || 'GENERAL'}`,
        entries: [
          {
            debitAccountId,
            creditAccountId: poolAccountId,
            amount: input.amountKobo,
            reference: `GIFT-PURCHASE-${rawCode.replace(/-/g, '')}`,
          },
        ],
      }, tx);
    }

    const created = await tx.giftCard.create({
      data: {
        codeHash,
        codeMasked,
        amount: input.amountKobo,
        balance: input.amountKobo,
        currency: 'NGN',
        status: 'ACTIVE',
        occasion: input.occasion || 'GENERAL',
        message: input.message ? input.message.trim().slice(0, 300) : null,
        senderName: input.senderName?.trim() || null,
        recipientEmail: input.recipientEmail?.trim().toLowerCase() || null,
        recipientPhone: input.recipientPhone?.trim() || null,
        creatorUserId: input.creatorUserId || null,
        businessId: input.businessId || null,
        expiresAt,
      },
    });

    if (input.creatorUserId) {
      await writeAudit({
        userId: input.creatorUserId,
        action: 'GIFT_CARD_CREATED',
        resource: 'giftCard',
        resourceId: created.id,
        ip: 'system',
        meta: { giftCardId: created.id, amountKobo: input.amountKobo, occasion: input.occasion },
      });
    }

    return created;
  }, { isolationLevel: 'Serializable' });

  return {
    giftCard: card,
    rawCode, // Returned ONLY on initial purchase so the sender can share/download it
  };
}

/**
 * Preview gift card details without redeeming
 */
export async function previewGiftCard(rawCode: string) {
  const codeHash = hashGiftCode(rawCode);
  const card = await (prisma as any).giftCard.findUnique({
    where: { codeHash },
    select: {
      id: true,
      codeMasked: true,
      amount: true,
      balance: true,
      currency: true,
      status: true,
      occasion: true,
      message: true,
      senderName: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  if (!card) throw new Error('Gift card not found or invalid code.');

  const isExpired = new Date(card.expiresAt) < new Date();
  return {
    ...card,
    isExpired,
    isValid: card.status === 'ACTIVE' && !isExpired && card.balance > 0,
  };
}

export type RedeemGiftCardInput = {
  userId: string;
  accountId: string;
  rawCode: string;
};

/**
 * Redeem a gift card directly into a customer's active account.
 * Atomically updates card balance, records redemption, credits recipient account,
 * and awards merchant loyalty points.
 */
export async function redeemGiftCard(input: RedeemGiftCardInput) {
  const codeHash = hashGiftCode(input.rawCode);

  const account = await prisma.account.findFirst({
    where: { id: input.accountId, userId: input.userId, currency: 'NGN', status: 'ACTIVE' },
  });
  if (!account) throw new Error('Active NGN receiving account not found.');

  return (prisma as any).$transaction(async (tx: any) => {
    const card = await tx.giftCard.findUnique({ where: { codeHash } });
    if (!card) throw new Error('Gift card not found.');

    if (card.status !== 'ACTIVE') {
      throw new Error(`This gift card is ${card.status.toLowerCase()} and cannot be redeemed.`);
    }

    if (new Date(card.expiresAt) < new Date()) {
      await tx.giftCard.update({ where: { id: card.id }, data: { status: 'EXPIRED' } });
      throw new Error('This gift card has expired.');
    }

    if (card.balance <= 0) {
      throw new Error('This gift card balance has already been fully redeemed.');
    }

    const redeemAmount = card.balance;

    // 1. Credit recipient's account on the ledger from the gift liability pool
    const poolAccountId = await getOrCreateGiftPoolAccount(tx);
    const journal = await postJournal({
      description: `Gift Card Redemption (${card.occasion})`,
      entries: [
        {
          debitAccountId: poolAccountId,
          creditAccountId: account.id,
          amount: redeemAmount,
          reference: `GIFT-REDEEM-${card.id.slice(0, 8)}`,
        },
      ],
    }, tx);

    // 2. Mark gift card redeemed
    const updatedCard = await tx.giftCard.update({
      where: { id: card.id },
      data: {
        status: 'REDEEMED',
        balance: 0,
        redeemedAt: new Date(),
        redeemedByUserId: input.userId,
      },
    });

    // 3. Create redemption record
    const redemption = await tx.giftRedemption.create({
      data: {
        giftCardId: card.id,
        userId: input.userId,
        amount: redeemAmount,
        accountId: account.id,
        journalId: journal.id,
      },
    });

    // 4. Award loyalty reward points for using Nakconel Gift
    await awardRewardPointsInternal(
      tx,
      input.userId,
      REWARD_POINTS_PER_GIFT_REDEEM,
      `Gift Card Redemption Bonus (${card.occasion})`,
      card.id,
    );

    await writeAudit({
      userId: input.userId,
      action: 'GIFT_CARD_REDEEMED',
      resource: 'giftCard',
      resourceId: card.id,
      ip: 'system',
      meta: { giftCardId: card.id, amountKobo: redeemAmount },
    });

    return {
      success: true,
      redeemedAmountKobo: redeemAmount,
      currency: card.currency,
      pointsAwarded: REWARD_POINTS_PER_GIFT_REDEEM,
      giftCard: updatedCard,
      redemption,
    };
  });
}

/**
 * List gifts sent or received by a specific user
 */
export async function listUserGifts(userId: string) {
  const [sent, received, rewards] = await Promise.all([
    (prisma as any).giftCard.findMany({
      where: { creatorUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    (prisma as any).giftRedemption.findMany({
      where: { userId },
      include: {
        giftCard: {
          select: {
            codeMasked: true,
            occasion: true,
            message: true,
            senderName: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    getRewardAccount(userId),
  ]);

  return {
    sent,
    received,
    rewards,
  };
}

/**
 * Internal helper to award loyalty reward points
 */
async function awardRewardPointsInternal(
  tx: any,
  userId: string,
  points: number,
  description: string,
  reference?: string,
) {
  let rewardAcc = await tx.rewardAccount.findUnique({ where: { userId } });
  if (!rewardAcc) {
    rewardAcc = await tx.rewardAccount.create({
      data: { userId, pointsBalance: 0, lifetimeEarned: 0 },
    });
  }

  const newBalance = rewardAcc.pointsBalance + points;
  const newLifetime = points > 0 ? rewardAcc.lifetimeEarned + points : rewardAcc.lifetimeEarned;

  await tx.rewardAccount.update({
    where: { id: rewardAcc.id },
    data: { pointsBalance: newBalance, lifetimeEarned: newLifetime },
  });

  await tx.rewardEntry.create({
    data: {
      rewardAccountId: rewardAcc.id,
      points,
      description,
      reference: reference || null,
    },
  });
}

/**
 * Get customer's loyalty reward points and ledger history
 */
export async function getRewardAccount(userId: string) {
  let account = await (prisma as any).rewardAccount.findUnique({
    where: { userId },
    include: {
      entries: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!account) {
    account = await (prisma as any).rewardAccount.create({
      data: { userId, pointsBalance: 0, lifetimeEarned: 0 },
      include: { entries: true },
    });
  }

  return account;
}

/**
 * Admin: List and filter all gift cards across the system
 */
export async function adminListGiftCards(params: {
  status?: GiftCardStatus;
  limit?: number;
  offset?: number;
}) {
  const where: any = {};
  if (params.status) where.status = params.status;

  const [cards, total, activeSum, redeemedSum] = await Promise.all([
    (prisma as any).giftCard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
      skip: params.offset || 0,
      include: {
        redemptions: {
          select: { id: true, userId: true, amount: true, createdAt: true },
        },
      },
    }),
    (prisma as any).giftCard.count({ where }),
    (prisma as any).giftCard.aggregate({
      where: { status: 'ACTIVE' },
      _sum: { balance: true },
      _count: true,
    }),
    (prisma as any).giftCard.aggregate({
      where: { status: 'REDEEMED' },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return {
    cards,
    total,
    metrics: {
      activeCount: activeSum._count,
      activeLiabilityKobo: activeSum._sum.balance || 0,
      redeemedCount: redeemedSum._count,
      redeemedVolumeKobo: redeemedSum._sum.amount || 0,
    },
  };
}

/**
 * Admin: Revoke or cancel an active gift card
 */
export async function adminRevokeGiftCard(cardId: string, adminUserId: string) {
  const card = await (prisma as any).giftCard.findUnique({ where: { id: cardId } });
  if (!card) throw new Error('Gift card not found.');
  if (card.status !== 'ACTIVE') {
    throw new Error(`Cannot revoke card with status '${card.status}'.`);
  }

  const updated = await (prisma as any).giftCard.update({
    where: { id: cardId },
    data: { status: 'CANCELLED' },
  });

  await writeAudit({
    userId: adminUserId,
    action: 'ADMIN_REVOKE_GIFT_CARD',
    resource: 'giftCard',
    resourceId: cardId,
    ip: 'admin',
    meta: { giftCardId: cardId, balanceKobo: card.balance },
  });

  return updated;
}
