import { prisma } from '@/lib/prisma';
import { getAccountBalanceKobo } from '@/domains/ledger/service';
import { getBusinessCashFlowForecast } from './service';

/**
 * A data-aware first version of Nakconel AI chat.
 * Replies are grounded in the signed-in user's own account records and
 * approved product information. It is intentionally deterministic until
 * a vetted generative-AI provider is configured.
 */
export async function answerFinancialChat(userId: string, rawMessage: string) {
  const message = rawMessage.trim().toLowerCase();
  const account = await prisma.account.findFirst({
    where: { userId, currency: 'NGN', status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });

  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let balanceNgn: number | null = null;
  let transfers: Array<{
    id: string;
    amount: number;
    fee: number;
    status: string;
    beneficiaryName: string;
    note: string | null;
    createdAt: Date;
  }> = [];

  if (account) {
    const [balanceKobo, recentTransfers] = await Promise.all([
      getAccountBalanceKobo(account.id),
      prisma.transfer.findMany({
        where: { fromAccountId: account.id, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          amount: true,
          fee: true,
          status: true,
          beneficiaryName: true,
          note: true,
          createdAt: true,
        },
      }),
    ]);
    balanceNgn = balanceKobo / 100;
    transfers = recentTransfers;
  }

  const totalSpentNgn = transfers
    .filter((item) => item.status === 'COMPLETED')
    .reduce((sum, item) => sum + item.amount + item.fee, 0) / 100;
  const completedCount = transfers.filter((item) => item.status === 'COMPLETED').length;
  const money = (value: number) => '₦' + value.toLocaleString('en-NG', { maximumFractionDigits: 2 });

  let reply: string;

  if (/\b(balance|available|how much.*(have|money)|my money|funds)\b/.test(message)) {
    reply = account
      ? `Your current Nakconel NGN ledger balance is ${money(balanceNgn ?? 0)}. This is the balance recorded in your Nakconel account, not a bank statement or proof of external settlement.`
      : 'You do not have an active NGN wallet account yet. Once your account is active, I can help explain its balance.';
  } else if (/\b(spent|spending|expenses|outflow|expenditure)\b/.test(message)) {
    reply = account
      ? `Over the last 30 days, your completed outgoing Nakconel transfers total ${money(totalSpentNgn)} across ${completedCount} completed transfers. This total includes recorded transfer fees and does not include expenses paid outside Nakconel.`
      : 'I cannot see an active NGN account to analyse yet.';
  } else if (/\b(transaction|transactions|history|recent transfer|last transfer)\b/.test(message)) {
    if (!account) {
      reply = 'There is no active NGN account available for transaction-history analysis yet.';
    } else if (transfers.length === 0) {
      reply = 'I could not find outgoing transfers in the last 30 days.';
    } else {
      const lines = transfers.slice(0, 5).map((item) =>
        `• ${item.beneficiaryName}: ${money(item.amount / 100)} — ${item.status.toLowerCase()} (${item.createdAt.toLocaleDateString('en-NG')})`
      );
      reply = 'Here are your latest outgoing transfer records from the last 30 days:\n' + lines.join('\n') + '\n\nOnly records shown in Nakconel are included.';
    }
  } else if (/\b(budget|save|saving|manage my money|spending plan)\b/.test(message)) {
    reply = `A simple starting point is the 50/30/20 budgeting method: plan roughly 50% for needs, 30% for wants and 20% for savings or debt goals. Treat those as flexible planning categories, not strict rules. Your recorded completed transfers in the last 30 days total ${money(totalSpentNgn)}; payments made outside Nakconel are not included.`;
  } else if (/\b(business|cash.?flow|invoice|receivable|revenue)\b/.test(message)) {
    const forecast = await getBusinessCashFlowForecast(userId);
    if (!forecast.hasBusiness || !forecast.metrics) {
      reply = forecast.message ?? 'Create a business profile to use the business cash-flow overview.';
    } else {
      reply = `For ${forecast.businessName}, the current records show ${money(forecast.metrics.unpaidReceivablesNgn)} in unpaid receivables and ${money(forecast.metrics.totalExpensesNgn)} in recorded expenses. The estimated 30-day net cash-flow figure is ${money(forecast.metrics.projected30DayNetCashFlowNgn)}. This is a basic projection from saved invoices and expenses, not a guaranteed forecast.`;
    }
  } else if (/\b(gift|gift card|redeem|reward|points)\b/.test(message)) {
    reply = 'You can create a Nakconel Gift card in Gift & Rewards, choose an amount and occasion, then confirm with your transaction PIN. A recipient can inspect and redeem a valid code into an active Nakconel NGN account. Keep gift codes private until you are ready to share them.';
  } else if (/\b(transfer|send money|payout|bank transfer)\b/.test(message)) {
    reply = 'Nakconel currently supports the internal Nakconel-to-Nakconel transfer workflow. Transfers to external Nigerian banks and international payout corridors are not enabled in this prototype. Always check the displayed transaction status; do not treat a preview as a completed payment.';
  } else if (/\b(fx|exchange rate|currency|dollar|pound|euro)\b/.test(message)) {
    reply = 'The FX area currently provides indicative reference information only. It is not an executable customer quote and cannot submit an international payment. Check the International section for the current product status before making plans.';
  } else if (/\b(fraud|security|scam|password|pin|otp|safe)\b/.test(message)) {
    reply = 'Never share your password, transaction PIN, OTP, BVN, NIN or full card details in a chat. Nakconel support will not need your PIN or OTP. If you notice an unfamiliar transaction, stop using the affected session and contact the authorised support team through the official support channel.';
  } else if (/\b(hello|hi|hey|good morning|good afternoon|good evening)\b/.test(message)) {
    reply = 'Hello. I can help you understand your Nakconel balance, recent spending, transaction history, budgeting, business cash flow, gift cards, security and FX information. What would you like to check?';
  } else {
    reply = 'I can help with your Nakconel money information and general banking questions. Try asking “What is my balance?”, “How much did I spend in the last 30 days?”, “Show my recent transfers”, “Help me make a budget”, or ask about Gift, business cash flow, transfers or FX. I only use information available in your signed-in Nakconel account.';
  }

  return { reply, generatedAt: new Date().toISOString(), mode: 'account-aware-rules' as const };
}
