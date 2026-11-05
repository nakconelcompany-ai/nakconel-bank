export type DemoInvoice = {
  id: string;
  client: string;
  description: string;
  amountNaira: number;
  status: "Draft" | "Sent" | "Paid (demo)";
  createdAt: string;
};

export type DemoPaymentLink = {
  id: string;
  title: string;
  amountNaira: number;
  status: "Active" | "Paid (demo)";
  createdAt: string;
};

export type DemoExpense = {
  id: string;
  merchant: string;
  category: string;
  amountNaira: number;
  createdAt: string;
};

export type DemoTeamMember = {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Finance" | "Viewer";
};

export type DemoBusiness = {
  name: string;
  invoices: DemoInvoice[];
  paymentLinks: DemoPaymentLink[];
  expenses: DemoExpense[];
  team: DemoTeamMember[];
};

export function createDemoBusiness(): DemoBusiness {
  return {
    name: "Nakconel Creative Studio",
    invoices: [
      { id: "invoice-001", client: "Northstar Media", description: "Brand identity package", amountNaira: 450_000, status: "Paid (demo)", createdAt: "2026-11-02T10:00:00.000Z" },
      { id: "invoice-002", client: "Cedar House", description: "Website design milestone", amountNaira: 280_000, status: "Sent", createdAt: "2026-11-03T10:00:00.000Z" },
      { id: "invoice-003", client: "Palm Works", description: "Product photography", amountNaira: 125_000, status: "Draft", createdAt: "2026-11-04T10:00:00.000Z" },
    ],
    paymentLinks: [
      { id: "link-001", title: "Brand strategy session", amountNaira: 75_000, status: "Active", createdAt: "2026-11-04T10:00:00.000Z" },
    ],
    expenses: [
      { id: "expense-001", merchant: "Studio supplies", category: "Supplies", amountNaira: 32_500, createdAt: "2026-11-02T10:00:00.000Z" },
      { id: "expense-002", merchant: "Workspace internet", category: "Utilities", amountNaira: 18_000, createdAt: "2026-11-03T10:00:00.000Z" },
    ],
    team: [
      { id: "team-001", name: "Amina Bello", email: "amina@example.test", role: "Owner" },
      { id: "team-002", name: "Tunde Okafor", email: "tunde@example.test", role: "Finance" },
    ],
  };
}

function assertRecord(id: string, amountNaira: number, createdAt: string) {
  if (!id || !Number.isSafeInteger(amountNaira) || amountNaira < 1) {
    throw new Error("Enter a valid description and whole-naira amount.");
  }
  if (!createdAt || !Number.isFinite(Date.parse(createdAt))) {
    throw new Error("Invalid record date.");
  }
}

export function addDemoInvoice(
  business: DemoBusiness,
  input: Omit<DemoInvoice, "status">,
): DemoBusiness {
  assertRecord(input.id, input.amountNaira, input.createdAt);
  if (!input.client.trim() || !input.description.trim()) {
    throw new Error("Enter a client and invoice description.");
  }
  return { ...business, invoices: [{ ...input, status: "Draft" }, ...business.invoices] };
}

export function markDemoInvoiceSent(business: DemoBusiness, id: string): DemoBusiness {
  return {
    ...business,
    invoices: business.invoices.map((invoice) =>
      invoice.id === id && invoice.status === "Draft"
        ? { ...invoice, status: "Sent" }
        : invoice,
    ),
  };
}

export function simulateDemoInvoicePayment(business: DemoBusiness, id: string): DemoBusiness {
  return {
    ...business,
    invoices: business.invoices.map((invoice) =>
      invoice.id === id && invoice.status === "Sent"
        ? { ...invoice, status: "Paid (demo)" }
        : invoice,
    ),
  };
}

export function addDemoPaymentLink(
  business: DemoBusiness,
  input: Omit<DemoPaymentLink, "status">,
): DemoBusiness {
  assertRecord(input.id, input.amountNaira, input.createdAt);
  if (!input.title.trim()) throw new Error("Enter a payment link title.");
  return { ...business, paymentLinks: [{ ...input, status: "Active" }, ...business.paymentLinks] };
}

export function simulateDemoLinkPayment(business: DemoBusiness, id: string): DemoBusiness {
  return {
    ...business,
    paymentLinks: business.paymentLinks.map((link) =>
      link.id === id && link.status === "Active" ? { ...link, status: "Paid (demo)" } : link,
    ),
  };
}

export function addDemoExpense(business: DemoBusiness, input: DemoExpense): DemoBusiness {
  assertRecord(input.id, input.amountNaira, input.createdAt);
  if (!input.merchant.trim() || !input.category.trim()) {
    throw new Error("Enter an expense name and category.");
  }
  return { ...business, expenses: [input, ...business.expenses] };
}

export function addDemoTeamMember(
  business: DemoBusiness,
  input: DemoTeamMember,
): DemoBusiness {
  if (
    !input.id ||
    !input.name.trim() ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
    input.role === "Owner"
  ) {
    throw new Error("Enter a valid team member and select a non-owner role.");
  }
  if (business.team.some((member) => member.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("This person is already on the demo team.");
  }
  return { ...business, team: [...business.team, input] };
}

export function getDemoBusinessSummary(business: DemoBusiness) {
  const collectedNaira =
    business.invoices
      .filter((invoice) => invoice.status === "Paid (demo)")
      .reduce((sum, invoice) => sum + invoice.amountNaira, 0) +
    business.paymentLinks
      .filter((link) => link.status === "Paid (demo)")
      .reduce((sum, link) => sum + link.amountNaira, 0);
  const outstandingNaira = business.invoices
    .filter((invoice) => invoice.status === "Sent")
    .reduce((sum, invoice) => sum + invoice.amountNaira, 0);
  const expensesNaira = business.expenses.reduce((sum, expense) => sum + expense.amountNaira, 0);

  return {
    collectedNaira,
    outstandingNaira,
    expensesNaira,
    netDemoNaira: collectedNaira - expensesNaira,
    invoiceCount: business.invoices.length,
    activeLinkCount: business.paymentLinks.filter((link) => link.status === "Active").length,
  };
}
