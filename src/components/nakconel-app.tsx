import { useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BANKS } from "@/lib/banks";
import {
  buyAirtime,
  confirmTopup,
  getTransactionPage,
  getWallet,
  payBill,
  resolveAccount,
  saveProfile,
  setPin as savePin,
  startTopup,
  transfer,
  type LedgerEntry,
  type WalletView,
} from "@/lib/wallet.functions";
import { addDemoFunds, createDemoWallet } from "@/lib/wallet/demo";
import {
  addDemoExpense,
  addDemoInvoice,
  addDemoPaymentLink,
  addDemoTeamMember,
  createDemoBusiness,
  getDemoBusinessSummary,
  markDemoInvoiceSent,
  simulateDemoInvoicePayment,
  simulateDemoLinkPayment,
  type DemoBusiness,
} from "@/lib/business/demo";
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Delete,
  FileText,
  Globe2,
  Headphones,
  Home,
  LayoutGrid,
  Plus,
  QrCode,
  Search,
  Send,
  Shield,
  UserRound,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Smartphone,
  Zap,
  Tv,
  Droplets,
  GraduationCap,
  Check,
} from "lucide-react";

type Screen =
  | "splash"
  | "welcome"
  | "phone"
  | "access"
  | "pin"
  | "personal"
  | "address"
  | "home"
  | "business"
  | "accounts"
  | "account"
  | "txns"
  | "send"
  | "bank"
  | "receive"
  | "add"
  | "airtime"
  | "people"
  | "bills"
  | "card"
  | "statements"
  | "notes"
  | "profile"
  | "security"
  | "help"
  | "kyc"
  | "tx"
  | "ticket"
  | "more";

type Tab = "home" | "accounts" | "card" | "more";

type Tx = {
  id: string;
  title: string;
  meta: string;
  amount: number;
  who: string;
  bank?: string;
  ref?: string;
  createdAt?: string;
  demo?: boolean;
};

const AIRTIME = [
  { id: "MTN", color: "#FFCC00", ink: "#1a1a1a" },
  { id: "Airtel", color: "#ED1C24", ink: "#fff" },
  { id: "Glo", color: "#50B848", ink: "#fff" },
  { id: "9mobile", color: "#006E53", ink: "#fff" },
];

function ngn(n: number) {
  const sign = n < 0 ? "−" : "";
  const body = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(Math.abs(n));
  return sign + body;
}

function tabFor(screen: Screen): Tab | null {
  if (["home", "send", "bank", "receive", "add", "airtime", "txns", "tx", "notes", "bills"].includes(screen)) return "home";
  if (["accounts", "account", "statements", "people"].includes(screen)) return "accounts";
  if (screen === "card") return "card";
  if (
    ["more", "profile", "security", "help", "kyc", "ticket"].includes(screen)
  )
    return "more";
  return null;
}

function Logo({ size = 88 }: { size?: number }) {
  return (
    <img
      src="/mark.png"
      alt="Nakconel"
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
    />
  );
}

function Wordmark({ light = false }: { light?: boolean }) {
  const color = light ? "text-[#f3d7a1]" : "text-wine";
  return (
    <div className={`text-center ${color}`}>
      <p className="font-display text-[22px] leading-none tracking-[0.22em]">NAKCONEL</p>
      <p className="mt-1 text-[10px] tracking-[0.42em]">BANK</p>
    </div>
  );
}

function Btn({
  children,
  onClick,
  tone = "solid",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "solid" | "ghost" | "line";
  disabled?: boolean;
}) {
  const cls =
    tone === "solid"
      ? "bg-wine text-white shadow-[0_8px_20px_rgba(60,6,9,0.18)]"
      : tone === "line"
        ? "border border-wine bg-transparent text-wine"
        : "bg-transparent text-wine";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[52px] w-full items-center justify-center rounded-2xl text-[15px] font-semibold transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${cls}`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-muted">{label}</span>
      <span className="flex h-12 items-center gap-2 rounded-2xl border border-line bg-paper px-3">
        {icon ? <span className="text-wine">{icon}</span> : null}
        <input
          value={value}
          type={type}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-[#c3b2a4]"
        />
      </span>
    </label>
  );
}

function BackTitle({ title, onBack, sub }: { title: string; onBack: () => void; sub?: string }) {
  return (
    <div className="mb-1">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1 text-[13px] font-medium text-wine">
        <ChevronLeft size={18} /> Back
      </button>
      <h1 className="text-[26px] font-semibold tracking-tight text-ink">{title}</h1>
      {sub ? <p className="mt-1 text-[13px] leading-5 text-muted">{sub}</p> : null}
    </div>
  );
}

function Row({
  title,
  meta,
  amount,
  onClick,
  icon,
}: {
  title: string;
  meta?: string;
  amount?: number;
  onClick?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f6ebe3] text-[13px] font-semibold text-wine">
        {icon ?? title.slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-ink">{title}</span>
        {meta ? <span className="block truncate text-[12px] text-muted">{meta}</span> : null}
      </span>
      {amount != null ? (
        <span className={`text-[13px] font-semibold tabular-nums ${amount >= 0 ? "text-credit" : "text-wine"}`}>
          {amount >= 0 ? "+" : ""}
          {ngn(amount)}
        </span>
      ) : (
        <ChevronRight size={16} className="text-[#c9b8aa]" />
      )}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[22px] border border-line bg-paper ${className}`}>{children}</div>;
}

function Keypad({ onKey }: { onKey: (k: string) => void }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <div className="mt-auto grid grid-cols-3 gap-y-1 pt-4">
      {keys.map((k) => (
        <button
          key={k || "blank"}
          type="button"
          disabled={!k}
          onClick={() => k && onKey(k)}
          className="flex h-14 items-center justify-center text-[22px] font-medium text-ink disabled:opacity-0"
        >
          {k === "del" ? <Delete size={22} /> : k}
        </button>
      ))}
    </div>
  );
}

function Nav({ tab, onNav, desktop = false }: { tab: Tab; onNav: (t: Tab) => void; desktop?: boolean }) {
  const items: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "accounts", label: "Accounts", icon: Wallet },
    { id: "card", label: "Cards", icon: CreditCard },
    { id: "more", label: "More", icon: LayoutGrid },
  ];
  return (
    <nav className={desktop ? "hidden w-full flex-col gap-1 lg:flex" : "fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md justify-around border-t border-line bg-[#fffdfb]/95 px-2 py-2 backdrop-blur lg:hidden"}>
      {items.map((item) => {
        const Icon = item.icon;
        const on = tab === item.id;
        return (
          <button key={item.id} type="button" onClick={() => onNav(item.id)} className={desktop ? `flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors ${on ? "bg-[#f6ebe3] text-wine" : "text-[#b6a496] hover:bg-[#f8f0e8]"}` : "flex w-16 flex-col items-center gap-1 py-1"}>
            <Icon size={20} strokeWidth={on ? 2.4 : 1.8} className={on ? "text-wine" : "text-[#b6a496]"} />
            <span className={`${desktop ? "text-[14px]" : "text-[11px]"} ${on ? "font-semibold text-wine" : "text-[#b6a496]"}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Pills({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full px-4 py-2 text-[13px] font-semibold ${
            value === opt ? "bg-wine text-white" : "border border-line bg-paper text-ink"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function NakconelApp() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [, setStack] = useState<Screen[]>([]);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [acctTab, setAcctTab] = useState("Transactions");
  const [who, setWho] = useState("Recent");
  const [fund, setFund] = useState("Account");
  const [bill, setBill] = useState("Airtime");
  const [tx, setTx] = useState<Tx>({ id: "", title: "", meta: "", amount: 0, who: "" });
  const [amount, setAmount] = useState("");
  const [acctNo, setAcctNo] = useState("");
  const [pickedBank, setPickedBank] = useState<(typeof BANKS)[number] | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [bankQuery, setBankQuery] = useState("");
  const [narration, setNarration] = useState("");
  const [payee, setPayee] = useState("");
  const [network, setNetwork] = useState("MTN");
  const [airtimePhone, setAirtimePhone] = useState("");
  const [airtimeAmt, setAirtimeAmt] = useState("500");
  const [noteTab, setNoteTab] = useState("All");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [payPin, setPayPin] = useState("");
  const [topupAmount, setTopupAmount] = useState("1000");
  const [nameStatus, setNameStatus] = useState<"idle" | "checking" | "live" | "manual">("idle");
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [business, setBusiness] = useState<DemoBusiness>(() => createDemoBusiness());
  const [businessSection, setBusinessSection] = useState("Overview");
  const [invoiceClient, setInvoiceClient] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [paymentLinkTitle, setPaymentLinkTitle] = useState("");
  const [paymentLinkAmount, setPaymentLinkAmount] = useState("");
  const [expenseMerchant, setExpenseMerchant] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Supplies");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamEmail, setTeamEmail] = useState("");
  const [teamRole, setTeamRole] = useState<"Admin" | "Finance" | "Viewer">("Viewer");
  const [busy, setBusy] = useState(false);
  const [loadingMoreEntries, setLoadingMoreEntries] = useState(false);
  const session = useCurrentUserState();
  const userId = session.user?.id;
  const idem = useRef(crypto.randomUUID());

  const go = (next: Screen) => {
    setError("");
    setStack((s) => [...s, screen]);
    setScreen(next);
  };
  const back = () => {
    setError("");
    setStack((s) => {
      const copy = [...s];
      const prev = copy.pop();
      setScreen(prev ?? "home");
      return copy;
    });
  };
  const resetTo = (next: Screen) => {
    setError("");
    setStack([]);
    setScreen(next);
  };

  const enterDemo = () => {
    setDemoMode(true);
    setWallet(createDemoWallet());
    setBusiness(createDemoBusiness());
    setBusinessSection("Overview");
    resetTo("home");
  };
  const exitDemo = () => {
    setDemoMode(false);
    setWallet(null);
    setBusiness(createDemoBusiness());
    resetTo("welcome");
  };

  const refreshWallet = async () => {
    const next = await getWallet();
    setWallet(next);
    return next;
  };

  useEffect(() => {
    if (!userId || demoMode) return;
    refreshWallet().catch(() => setError("Couldn't open your wallet."));
  }, [userId, demoMode]);

  useEffect(() => {
    if (!userId || demoMode) return;
    const reference = new URLSearchParams(window.location.search).get("topup");
    if (!reference) return;
    confirmTopup({ data: { reference } })
      .then(async (result) => {
        window.history.replaceState({}, "", "/");
        if (result.ok) {
          applyEntry(result.entry);
          await refreshWallet();
          setScreen("tx");
        } else setError(result.error);
      })
      .catch(() => setError("Couldn't confirm the payment."));
  }, [userId, demoMode]);

  useEffect(() => {
    if (demoMode || !wallet?.capabilities.bankTransfers || acctNo.length !== 10 || !pickedBank || !userId) {
      setNameStatus("idle");
      return;
    }
    let cancelled = false;
    setNameStatus("checking");
    resolveAccount({ data: { accountNumber: acctNo, bankId: pickedBank.id } })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setPayee(result.accountName);
          setNameStatus("live");
        } else setNameStatus("manual");
      })
      .catch(() => {
        if (!cancelled) setNameStatus("manual");
      });
    return () => {
      cancelled = true;
    };
  }, [acctNo, demoMode, pickedBank, userId, wallet?.capabilities.bankTransfers]);

  const applyEntry = (entry: LedgerEntry, demo = false) => {
    setTx({
      id: entry.id,
      title: entry.title,
      meta: entry.meta,
      amount: entry.amountKobo / 100,
      who: entry.counterparty,
      bank: entry.bankName,
      ref: entry.reference,
      createdAt: entry.createdAt,
      demo,
    });
    idem.current = crypto.randomUUID();
    setPayPin("");
  };

  const displayName = name.trim().split(" ")[0] || wallet?.profile.fullName.split(" ")[0] || session.user?.displayName?.split(" ")[0] || "there";
  const fullName = name.trim() || wallet?.profile.fullName || session.user?.displayName || "Nakconel customer";
  const profilePhone = phone || wallet?.profile.phone || "";
  const phonePretty = profilePhone ? profilePhone.replace(/(\d{3})(\d{3})(\d{0,4})/, "$1 $2 $3").trim() : null;
  const balanceLabel = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format((wallet?.balanceKobo ?? 0) / 100);
  const savedPeople = wallet?.beneficiaries ?? [];
  const businessSummary = getDemoBusinessSummary(business);

  const shownTx = useMemo(() => {
    const rows: Tx[] = (wallet?.entries ?? []).map((entry) => ({
      id: entry.id,
      title: entry.title,
      meta: entry.meta,
      amount: entry.amountKobo / 100,
      who: entry.counterparty,
      bank: entry.bankName,
      ref: entry.reference,
      createdAt: entry.createdAt,
      demo: demoMode,
    }));
    return rows.filter((row) => {
      const q = query.trim().toLowerCase();
      const hit = !q || row.title.toLowerCase().includes(q) || row.who.toLowerCase().includes(q);
      if (!hit) return false;
      if (filter === "Debit") return row.amount < 0;
      if (filter === "Credit") return row.amount > 0;
      return true;
    });
  }, [wallet, query, filter, demoMode]);

  const openTx = (row: Tx) => {
    setTx(row);
    go("tx");
  };

  const onNav = (tab: Tab) => {
    setStack([]);
    setScreen(tab === "home" ? "home" : tab === "accounts" ? "accounts" : tab === "card" ? "card" : "more");
  };

  const tab = tabFor(screen);

  const frame = (node: React.ReactNode, dark = false) => (
    <div className="min-h-dvh bg-[#efe2d2] lg:p-6">
      <div className={`mx-auto flex min-h-dvh w-full max-w-md flex-col shadow-[0_0_0_1px_rgba(90,40,30,0.04)] lg:min-h-[calc(100dvh-3rem)] lg:max-w-7xl lg:flex-row lg:overflow-hidden lg:rounded-[32px] lg:shadow-[0_18px_60px_rgba(60,6,9,0.12)] ${dark ? "bg-[#14080a] text-white" : "bg-cream text-ink"}`}>
        <aside className="hidden w-[272px] shrink-0 flex-col border-r border-[#eadfd2] bg-paper px-5 py-8 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <Logo size={42} />
            <div className="text-left"><p className="font-display text-[16px] tracking-[0.16em] text-wine">NAKCONEL</p><p className="mt-0.5 text-[9px] tracking-[0.34em] text-muted">BANK</p></div>
          </div>
          <div className="mt-12">{tab ? <Nav tab={tab} onNav={onNav} desktop /> : <p className="px-2 text-[13px] leading-6 text-muted">Secure banking designed around your everyday finances.</p>}</div>
          <div className="mt-auto rounded-2xl bg-[#f6ebe3] p-4"><Shield size={18} className="text-wine" /><p className="mt-3 text-[13px] font-semibold text-ink">{demoMode ? "Demo preview" : "Your security matters"}</p><p className="mt-1 text-[12px] leading-5 text-muted">{demoMode ? "Sample data only. Do not enter real passwords or identity details." : "Use a strong password and keep your transaction PIN private."}</p></div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {demoMode ? (
            <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-300 bg-amber-50 px-4 py-3 text-[12px] leading-5 text-amber-950">
              <span><strong>DEMO ONLY.</strong> Sample data and simulated balance; no real money moves.</span>
              <button type="button" onClick={exitDemo} className="min-h-11 rounded-xl border border-amber-700 px-3 font-semibold">Exit demo</button>
            </div>
          ) : null}
          <main className={`mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-5 pt-7 lg:px-10 lg:pt-10 ${tab ? "pb-28 lg:pb-10" : "pb-6 lg:pb-10"}`}>{node}</main>
          {tab ? <Nav tab={tab} onNav={onNav} /> : null}
        </div>
      </div>
    </div>
  );

  if (screen === "splash") {
    return (
      <button
        type="button"
        onClick={() => {
          if (session.isPending) return;
          resetTo(session.user ? "home" : "welcome");
        }}
        className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-between overflow-hidden px-8 py-16 text-center lg:min-h-[calc(100dvh-3rem)] lg:max-w-7xl lg:rounded-[32px] lg:px-20 lg:py-20 lg:text-left"
        style={{
          background:
            "radial-gradient(90% 45% at 100% 100%, rgba(224,181,106,0.28), transparent 55%), radial-gradient(70% 40% at 0% 88%, rgba(224,181,106,0.16), transparent 50%), linear-gradient(180deg, #6a1a22 0%, #3c0609 58%, #2a0508 100%)",
        }}
      >
        <span className="lg:hidden" />
        <span className="flex flex-col items-center lg:mr-auto lg:items-start lg:pl-10">
          <Logo size={148} />
          <span className="mt-6 block font-display text-[28px] tracking-[0.28em] text-[#f0d7a4] lg:text-[40px]">NAKCONEL</span>
          <span className="mt-2 block text-[11px] tracking-[0.5em] text-[#f0d7a4] lg:text-[13px]">BANK</span>
          <span className="mt-10 hidden max-w-md text-[28px] font-semibold leading-tight tracking-tight text-white lg:block">Banking designed for the way you move.</span>
          <span className="mt-4 hidden max-w-sm text-[15px] leading-7 text-[#f0d7a4]/85 lg:block">Manage everyday money, payments, and your financial future from one secure account.</span>
        </span>
        <span className="text-[13px] text-[#f0d7a4]/90 lg:mr-auto lg:pl-10">Banking for today, building for tomorrow.</span>
        <span className="absolute right-20 top-1/2 hidden w-[360px] -translate-y-1/2 rounded-[28px] border border-white/15 bg-white/10 p-7 text-left shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur lg:block">
          <Shield size={24} className="text-[#f0d7a4]" />
          <span className="mt-8 block text-[12px] font-semibold uppercase tracking-[0.18em] text-[#f0d7a4]">Secure access</span>
          <span className="mt-3 block text-[24px] font-semibold leading-tight text-white">Your banking, protected by design.</span>
          <span className="mt-5 block border-t border-white/15 pt-5 text-[14px] leading-6 text-[#f6ead4]/85">Sign in securely to manage your account, complete transfers, and control your cards.</span>
        </span>
      </button>
    );
  }

  if (screen === "welcome") {
    return frame(
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:justify-center">
        <div className="mt-10 flex flex-col items-center lg:mt-0">
          <Logo size={86} />
          <div className="mt-4">
            <Wordmark />
          </div>
          <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.16em] text-wine">Personal banking</p>
          <h1 className="mt-3 text-center text-[26px] font-semibold tracking-tight lg:text-[36px]">Open an account in minutes</h1>
          <p className="mt-3 max-w-sm text-center text-[14px] leading-6 text-muted">Register securely, create your banking PIN, and complete your profile when you are ready.</p>
        </div>
        <div className="mt-auto flex flex-col gap-3 pt-16 lg:mt-10 lg:pt-0">
          <Btn
            onClick={() => {
              setMode("signup");
              setPhone("");
              setPin("");
              setName("");
              setEmail("");
              setPassword("");
              go("access");
            }}
          >
            Register an account
          </Btn>
          <Btn
            tone="ghost"
            onClick={() => {
              setMode("login");
              setPin("");
              setEmail("");
              setPassword("");
              go("access");
            }}
          >
            Log in
          </Btn>
          {import.meta.env.DEV ? (
            <Btn tone="ghost" onClick={enterDemo}>
              Explore safe demo
            </Btn>
          ) : null}
        </div>
      </div>,
    );
  }

  if (screen === "phone") {
    return frame(
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col items-center">
          <Logo size={54} />
          <div className="mt-2">
            <Wordmark />
          </div>
        </div>
        <div className="mt-6">
          <p className="text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-wine">Step 2 of 4</p>
          <h1 className="mt-2 text-center text-[22px] font-semibold">Add your mobile number</h1>
          <p className="mt-1 text-center text-[13px] text-muted">We use this to protect and support your account.</p>
        </div>
        <div className="mt-5 flex h-14 items-center gap-3 rounded-2xl border border-line bg-paper px-3">
          <Smartphone size={20} className="text-wine" aria-hidden="true" />
          <span className="text-[15px] font-semibold">+234</span>
          <span className="text-[15px] tabular-nums text-ink">{phone ? phonePretty : <span className="text-[#c3b2a4]">Phone number</span>}</span>
        </div>
        {error ? <p className="text-center text-[12px] text-wine">{error}</p> : null}
        <div className="mt-4">
          <Btn
            onClick={() => {
              if (phone.length < 10) {
                setError("Enter the 10 digits after +234.");
                return;
              }
              if (mode !== "signup") {
                go("access");
                return;
              }
              void authClient.getSession().then((sessionResult) => {
                if (!sessionResult.data?.user) {
                  setMode("login");
                  setError("Log in with the same email before you set a PIN.");
                  go("access");
                  return;
                }
                const savedPhone = phone.length === 10 ? `0${phone}` : phone;
                void saveProfile({
                  data: { fullName: name.trim(), phone: savedPhone, address: "", gender: "", dob: "" },
                }).then((next) => setWallet(next));
                setPin("");
                setError("");
                go("pin");
              });
            }}
          >
            Continue
          </Btn>
        </div>
        <p className="mt-3 text-center text-[12px] leading-5 text-muted">Your number is stored securely and is never displayed publicly.</p>
        <Keypad
          onKey={(k) => {
            setError("");
            if (k === "del") setPhone((p) => p.slice(0, -1));
            else if (phone.length < 10) setPhone((p) => p + k);
          }}
        />
      </div>,
    );
  }

  if (screen === "access") {
    return frame(
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 lg:justify-center">
        <BackTitle
          title={mode === "signup" ? "Open your account" : "Welcome back"}
          sub={mode === "signup" ? "Step 1 of 4 · Start with your secure sign-in details." : "Use the email and password linked to your Nakconel account."}
          onBack={back}
        />
        {mode === "signup" ? <Field label="Full name" value={name} onChange={setName} placeholder="Enter your full name" /> : null}
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" />
        {mode === "signup" ? <p className="text-[12px] leading-5 text-muted">Use at least 8 characters. You will create a separate 4-digit transaction PIN next.</p> : null}
        {error ? <p className="text-[12px] text-wine">{error}</p> : null}
        <div className="mt-auto pt-5">
          <Btn
            disabled={busy}
            onClick={() => {
              void (async () => {
              const emailValue = email.trim().toLowerCase();
              if (mode === "signup" && name.trim().length < 3) {
                setError("Enter your full name.");
                return;
              }
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
                setError("Enter a real email, like name@gmail.com.");
                return;
              }
              if (password.length < 8) {
                setError("Use a password of at least 8 characters.");
                return;
              }
              setBusy(true);
              const result = await (mode === "signup"
                ? authClient.signUp.email({ email: emailValue, password, name: name.trim() })
                : authClient.signIn.email({ email: emailValue, password }));
                if (result.error) {
                  setBusy(false);
                  const message = result.error.message?.trim();
                  if (mode === "signup" && /already|exist/i.test(message ?? "")) {
                    setError("An account already exists for this email. Log in instead.");
                    return;
                  }
                  setError(
                    message && message !== "Internal Server Error"
                      ? message
                      : "The account was not saved. The server failed before it could store this email.",
                  );
                  return;
                }
                if (mode === "signup") {
                  const sessionResult = await authClient.getSession();
                  if (!sessionResult.data?.user) {
                    const signInResult = await authClient.signIn.email({ email: emailValue, password });
                    if (signInResult.error) {
                      setBusy(false);
                      setError("Your account was created, but we could not sign you in. Please use Log in to continue.");
                      setMode("login");
                      return;
                    }
                  }
                  setBusy(false);
                  go("phone");
                } else {
                  const nextWallet = await getWallet();
                  setWallet(nextWallet);
                  setBusy(false);
                  if (!nextWallet.hasPin) {
                    setMode("signup");
                    resetTo("pin");
                  } else {
                    resetTo("home");
                  }
                }
              })().catch(() => {
                setBusy(false);
                setError("We could not complete your sign-in. Please try again.");
              });
            }}
          >
            {busy ? "Please wait…" : mode === "signup" ? "Continue registration" : "Log in"}
          </Btn>
        </div>
        <p className="text-center text-[13px] text-muted">
          {mode === "signup" ? "Already have an account?" : "New to Nakconel?"}{" "}
          <button type="button" className="font-semibold text-wine" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setPassword(""); }}>
            {mode === "signup" ? "Log in" : "Register"}
          </button>
        </p>
      </div>,
    );
  }

  if (screen === "pin") {
    const creating = mode === "signup";
    return frame(
      <div className="flex flex-1 flex-col">
        <BackTitle title="" onBack={back} />
        <div className="-mt-6 text-center">
          <h1 className="text-[22px] font-semibold">{creating ? "Create your PIN" : "Enter your PIN"}</h1>
          <p className="mt-1 text-[13px] text-muted">{creating ? "Choose a 4-digit PIN for your account." : "Enter the 4-digit PIN for your account."}</p>
        </div>
        <div className="mt-8 flex justify-center gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className={`h-3.5 w-3.5 rounded-full ${pin.length > i ? "bg-wine" : "border border-[#d9c8b8] bg-paper"}`} />
          ))}
        </div>
        {error ? <p className="mt-3 text-center text-[12px] text-wine">{error}</p> : null}
        <Keypad
          onKey={(k) => {
            setError("");
            if (k === "del") {
              setPin((p) => p.slice(0, -1));
              return;
            }
            if (pin.length >= 4) return;
            const next = pin + k;
            setPin(next);
            if (next.length === 4) {
              setBusy(true);
              void savePin({ data: { pin: next } })
                .then((res) => {
                  setBusy(false);
                  if (!res.ok) {
                    setError(res.error);
                    setPin("");
                    return;
                  }
                  if (creating) go("personal");
                  else resetTo("home");
                })
                .catch((err: unknown) => {
                  setBusy(false);
                  setPin("");
                  const message = err instanceof Error ? err.message : "";
                  if (message === "Unauthorized" || /unauthorized/i.test(message)) {
                    setMode("login");
                    setError("Your sign-in did not stick. Log in with the same email, then set your PIN.");
                    go("access");
                    return;
                  }
                  setError(message || "The PIN could not be saved. Try again.");
                });
            }
          }}
        />
      </div>,
    );
  }

  if (screen === "personal") {
    return frame(
      <div className="flex flex-1 flex-col gap-4">
        <BackTitle title="Personal Details" sub="Let’s get to know you." onBack={back} />
        <Field label="Full Name" value={name} onChange={setName} placeholder="Enter your full name" icon={<UserRound size={16} />} />
        <Field label="Date of Birth" value={dob} onChange={setDob} type="date" placeholder="DD / MM / YYYY" />
        <div>
          <p className="mb-2 text-[12px] font-medium text-muted">Gender</p>
          <div className="flex gap-4 text-[14px]">
            {["Male", "Female", "Other"].map((g) => (
              <button key={g} type="button" onClick={() => setGender(g)} className="flex items-center gap-2">
                <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${gender === g ? "border-wine" : "border-[#c9b8aa]"}`}>
                  {gender === g ? <span className="h-2 w-2 rounded-full bg-wine" /> : null}
                </span>
                {g}
              </button>
            ))}
          </div>
        </div>
        {error ? <p className="text-[12px] text-wine">{error}</p> : null}
        <div className="mt-auto">
          <Btn
            onClick={() => {
              if (name.trim().length < 3 || !dob) {
                setError("Enter your full name and date of birth.");
                return;
              }
              go("address");
            }}
          >
            Next
          </Btn>
        </div>
      </div>,
    );
  }

  if (screen === "address") {
    return frame(
      <div className="flex flex-1 flex-col gap-3">
        <BackTitle title="Residential Address" sub="Please confirm your information." onBack={back} />
        {[
          ["Full Name", fullName],
          ["Phone Number", `+234 ${phonePretty}`],
          ["Date of Birth", dob],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-line bg-paper px-3 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f6ebe3] text-wine">
              <UserRound size={16} />
            </span>
            <span>
              <span className="block text-[11px] text-muted">{label}</span>
              <span className="block text-[14px] font-medium">{value}</span>
            </span>
          </div>
        ))}
        <Field label="Address" value={address} onChange={setAddress} placeholder="Ibadan, Oyo State" icon={<Home size={16} />} />
        <p className="text-[12px] leading-5 text-muted">
          Phone and identity details have not been independently verified. Do not enter identity numbers here.
        </p>
        {error ? <p className="text-[12px] text-wine">{error}</p> : null}
        <div className="mt-auto pt-2">
          <Btn
            disabled={busy}
            onClick={() => {
              if (address.trim().length < 3) {
                setError("Enter your address.");
                return;
              }
              setBusy(true);
              void saveProfile({
                data: { fullName: name.trim(), phone, address: address.trim(), gender, dob },
              })
                .then((next) => {
                  setWallet(next);
                  setBusy(false);
                  resetTo("home");
                })
                .catch(() => {
                  setBusy(false);
                  setError("We couldn't save your profile. Please try again.");
                });
            }}
          >
            {busy ? "Saving…" : "Continue"}
          </Btn>
        </div>
      </div>,
    );
  }

  if (screen === "home") {
    return frame(
      <>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-semibold">Good morning, {displayName.split(" ")[0]}</h1>
            <p className="text-[13px] text-muted">Here’s your account overview.</p>
          </div>
          <button type="button" onClick={() => go("notes")} className="flex h-10 w-10 items-center justify-center rounded-full bg-paper text-wine" aria-label="Notifications">
            <Bell size={18} />
          </button>
        </div>
        <div
          className="rounded-[24px] p-5 text-[#f8e7c8]"
          style={{ background: "linear-gradient(145deg, #7a2430 0%, #4a1016 55%, #3c0609 100%)" }}
        >
          <p className="text-[12px] text-[#f0d7a4]/80">Total Balance</p>
          <p className="mt-1 font-display text-[32px] leading-none tracking-wide text-[#f8e7c8]">{balanceLabel}</p>
          <p className="mt-3 text-[12px] text-[#f0d7a4]/75">NGN wallet · {wallet?.receivingAccountNumber ?? "No receiving account issued"}</p>
          {demoMode ? <p className="mt-1 text-[11px] font-semibold text-[#f0d7a4]">Sample balance · no real value</p> : null}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Send", icon: <ArrowUpRight size={18} />, to: "send" as Screen },
            { label: "Receive", icon: <ArrowDownLeft size={18} />, to: "receive" as Screen },
            { label: "Add Money", icon: <Plus size={18} />, to: "add" as Screen },
            { label: "Airtime", icon: <Smartphone size={18} />, to: "airtime" as Screen },
          ].map((action) => (
            <button key={action.label} type="button" onClick={() => go(action.to)} className="flex flex-col items-center gap-2">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper text-wine">{action.icon}</span>
              <span className="text-center text-[11px] font-medium leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
        {demoMode ? (
          <button
            type="button"
            onClick={() => {
              setBusinessSection("Overview");
              go("business");
            }}
            className="flex items-center justify-between rounded-2xl border border-line bg-paper p-4 text-left"
          >
            <span>
              <span className="block text-[14px] font-semibold">Business workspace</span>
              <span className="mt-1 block text-[12px] text-muted">Invoices, payment links, expenses and team · demo</span>
            </span>
            <Building2 size={20} className="text-wine" />
          </button>
        ) : null}
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Recent Transactions</h2>
          <button type="button" className="text-[12px] font-semibold text-wine" onClick={() => go("txns")}>
            View all
          </button>
        </div>
        <Card className="px-3">
          {shownTx.slice(0, 4).length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">No transactions yet</p>
          ) : (
            shownTx.slice(0, 4).map((row) => (
              <Row key={row.id} title={row.title} meta={row.meta} amount={row.amount} onClick={() => openTx(row)} />
            ))
          )}
        </Card>
      </>,
    );
  }

  if (screen === "business") {
    if (!demoMode) {
      return frame(
        <>
          <BackTitle title="Business workspace" onBack={back} />
          <Card className="border-amber-300 bg-amber-50 p-4 text-[13px] leading-5 text-amber-950">
            Business tools are available only in the clearly labeled demo preview. No business money movement is connected.
          </Card>
        </>,
      );
    }

    const sections = ["Overview", "Invoices", "Payment links", "Expenses", "Team"];
    const inputError = (reason: unknown) =>
      reason instanceof Error ? reason.message : "The demo record could not be saved.";
    const toAmount = (value: string) => Number(value.replace(/\D/g, ""));
    const clearBusinessError = () => setError("");

    return frame(
      <div className="flex flex-1 flex-col gap-4">
        <BackTitle title="Business workspace" sub={business.name} onBack={back} />
        <Card className="border-amber-300 bg-amber-50 p-4 text-[13px] leading-5 text-amber-950">
          <p className="font-semibold">Demo business data only</p>
          <p>Invoices, collections, expenses, and team changes are local previews. No customer payments are requested or settled.</p>
        </Card>
        <Pills value={businessSection} options={sections} onChange={(section) => { setBusinessSection(section); clearBusinessError(); }} />

        {businessSection === "Overview" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Collected (demo)", businessSummary.collectedNaira],
                ["Outstanding", businessSummary.outstandingNaira],
                ["Expenses", businessSummary.expensesNaira],
                ["Net activity", businessSummary.netDemoNaira],
              ].map(([label, amount]) => (
                <Card key={label} className="p-4">
                  <p className="text-[12px] text-muted">{label}</p>
                  <p className="mt-2 text-[18px] font-semibold tabular-nums">{ngn(Number(amount))}</p>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setBusinessSection("Invoices")} className="rounded-2xl border border-line bg-paper p-4 text-left">
                <p className="text-[12px] text-muted">Invoices</p>
                <p className="mt-1 text-[22px] font-semibold">{businessSummary.invoiceCount}</p>
                <p className="text-[12px] text-wine">Manage invoices</p>
              </button>
              <button type="button" onClick={() => setBusinessSection("Payment links")} className="rounded-2xl border border-line bg-paper p-4 text-left">
                <p className="text-[12px] text-muted">Active links</p>
                <p className="mt-1 text-[22px] font-semibold">{businessSummary.activeLinkCount}</p>
                <p className="text-[12px] text-wine">Manage payment links</p>
              </button>
            </div>
            <h2 className="text-[15px] font-semibold">Recent business activity</h2>
            <Card className="px-3">
              {business.invoices.slice(0, 3).map((invoice) => (
                <Row key={invoice.id} title={invoice.client} meta={`${invoice.description} · ${invoice.status}`} amount={invoice.amountNaira} />
              ))}
            </Card>
          </>
        ) : null}

        {businessSection === "Invoices" ? (
          <>
            <Card className="space-y-3 p-4">
              <h2 className="text-[15px] font-semibold">Create invoice</h2>
              <Field label="Client" value={invoiceClient} onChange={setInvoiceClient} placeholder="Client name" />
              <Field label="Description" value={invoiceDescription} onChange={setInvoiceDescription} placeholder="What are you billing for?" />
              <Field label="Amount (NGN)" value={invoiceAmount} onChange={(value) => setInvoiceAmount(value.replace(/\D/g, ""))} placeholder="100000" />
              <Btn onClick={() => {
                try {
                  setBusiness((current) => addDemoInvoice(current, {
                    id: crypto.randomUUID(),
                    client: invoiceClient,
                    description: invoiceDescription,
                    amountNaira: toAmount(invoiceAmount),
                    createdAt: new Date().toISOString(),
                  }));
                  setInvoiceClient("");
                  setInvoiceDescription("");
                  setInvoiceAmount("");
                  setError("");
                } catch (reason) { setError(inputError(reason)); }
              }}>Save draft</Btn>
            </Card>
            <Card className="px-3">
              {business.invoices.map((invoice) => (
                <div key={invoice.id} className="border-b border-line py-3 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">{invoice.client}</p>
                      <p className="text-[12px] text-muted">{invoice.description} · {invoice.status}</p>
                    </div>
                    <p className="shrink-0 text-[13px] font-semibold">{ngn(invoice.amountNaira)}</p>
                  </div>
                  {invoice.status === "Draft" ? (
                    <button type="button" onClick={() => setBusiness((current) => markDemoInvoiceSent(current, invoice.id))} className="mt-2 min-h-11 rounded-xl border border-wine px-3 text-[12px] font-semibold text-wine">Mark sent (demo)</button>
                  ) : null}
                  {invoice.status === "Sent" ? (
                    <button type="button" onClick={() => setBusiness((current) => simulateDemoInvoicePayment(current, invoice.id))} className="mt-2 min-h-11 rounded-xl border border-wine px-3 text-[12px] font-semibold text-wine">Simulate paid</button>
                  ) : null}
                </div>
              ))}
            </Card>
          </>
        ) : null}

        {businessSection === "Payment links" ? (
          <>
            <Card className="space-y-3 p-4">
              <h2 className="text-[15px] font-semibold">Create payment link</h2>
              <Field label="Link description" value={paymentLinkTitle} onChange={setPaymentLinkTitle} placeholder="e.g. Consultation" />
              <Field label="Amount (NGN)" value={paymentLinkAmount} onChange={(value) => setPaymentLinkAmount(value.replace(/\D/g, ""))} placeholder="25000" />
              <Btn onClick={() => {
                try {
                  setBusiness((current) => addDemoPaymentLink(current, {
                    id: crypto.randomUUID(),
                    title: paymentLinkTitle,
                    amountNaira: toAmount(paymentLinkAmount),
                    createdAt: new Date().toISOString(),
                  }));
                  setPaymentLinkTitle("");
                  setPaymentLinkAmount("");
                  setError("");
                } catch (reason) { setError(inputError(reason)); }
              }}>Create demo link</Btn>
            </Card>
            <Card className="px-3">
              {business.paymentLinks.map((link) => (
                <div key={link.id} className="border-b border-line py-3 last:border-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">{link.title}</p>
                      <p className="text-[12px] text-muted">nakconel.demo/{link.id} · {link.status}</p>
                    </div>
                    <p className="shrink-0 text-[13px] font-semibold">{ngn(link.amountNaira)}</p>
                  </div>
                  {link.status === "Active" ? (
                    <button type="button" onClick={() => setBusiness((current) => simulateDemoLinkPayment(current, link.id))} className="mt-2 min-h-11 rounded-xl border border-wine px-3 text-[12px] font-semibold text-wine">Simulate payment</button>
                  ) : null}
                </div>
              ))}
            </Card>
          </>
        ) : null}

        {businessSection === "Expenses" ? (
          <>
            <Card className="space-y-3 p-4">
              <h2 className="text-[15px] font-semibold">Record expense</h2>
              <Field label="Merchant or description" value={expenseMerchant} onChange={setExpenseMerchant} placeholder="Office supplies" />
              <Field label="Category" value={expenseCategory} onChange={setExpenseCategory} placeholder="Supplies" />
              <Field label="Amount (NGN)" value={expenseAmount} onChange={(value) => setExpenseAmount(value.replace(/\D/g, ""))} placeholder="10000" />
              <Btn onClick={() => {
                try {
                  setBusiness((current) => addDemoExpense(current, {
                    id: crypto.randomUUID(),
                    merchant: expenseMerchant,
                    category: expenseCategory,
                    amountNaira: toAmount(expenseAmount),
                    createdAt: new Date().toISOString(),
                  }));
                  setExpenseMerchant("");
                  setExpenseAmount("");
                  setError("");
                } catch (reason) { setError(inputError(reason)); }
              }}>Add demo expense</Btn>
            </Card>
            <Card className="px-3">
              {business.expenses.map((expense) => (
                <Row key={expense.id} title={expense.merchant} meta={`${expense.category} · demo record`} amount={-expense.amountNaira} />
              ))}
            </Card>
          </>
        ) : null}

        {businessSection === "Team" ? (
          <>
            <Card className="space-y-3 p-4">
              <h2 className="text-[15px] font-semibold">Add a demo teammate</h2>
              <Field label="Name" value={teamName} onChange={setTeamName} placeholder="Team member name" />
              <Field label="Email" type="email" value={teamEmail} onChange={setTeamEmail} placeholder="name@company.com" />
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-medium text-muted">Role</span>
                <select value={teamRole} onChange={(event) => setTeamRole(event.target.value as "Admin" | "Finance" | "Viewer")} className="h-12 w-full rounded-2xl border border-line bg-paper px-3 text-[14px]">
                  <option value="Viewer">Viewer</option>
                  <option value="Finance">Finance</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>
              <Btn onClick={() => {
                try {
                  setBusiness((current) => addDemoTeamMember(current, {
                    id: crypto.randomUUID(),
                    name: teamName,
                    email: teamEmail,
                    role: teamRole,
                  }));
                  setTeamName("");
                  setTeamEmail("");
                  setError("");
                } catch (reason) { setError(inputError(reason)); }
              }}>Add demo teammate</Btn>
            </Card>
            <Card className="px-3">
              {business.team.map((member) => (
                <Row key={member.id} title={member.name} meta={`${member.email} · ${member.role} · demo`} />
              ))}
            </Card>
          </>
        ) : null}

        {error ? <p role="alert" className="text-[13px] text-wine">{error}</p> : null}
      </div>,
    );
  }

  if (screen === "accounts") {
    return frame(
      <>
        <h1 className="text-[26px] font-semibold">My Accounts</h1>
        <button type="button" onClick={() => go("account")} className="w-full text-left">
          <div className="rounded-[24px] p-5 text-[#f8e7c8]" style={{ background: "linear-gradient(145deg, #7a2430, #3c0609)" }}>
            <p className="text-[12px] text-[#f0d7a4]/80">Main Wallet</p>
            <p className="mt-2 font-display text-[30px] leading-none">{balanceLabel}</p>
            <p className="mt-3 text-[12px] text-[#f0d7a4]/75">Available Balance</p>
          </div>
        </button>
        <p className="text-[13px] text-muted">One NGN wallet. No savings or business accounts have been opened.</p>
      </>,
    );
  }

  if (screen === "account") {
    return frame(
      <>
        <BackTitle title="Main Wallet" onBack={back} />
        <p className="font-display text-[34px] leading-none text-ink">{balanceLabel}</p>
        <Pills value={acctTab} options={["Transactions", "Details", "Settings"]} onChange={setAcctTab} />
        {acctTab === "Transactions" ? (
          <Card className="px-3">
            {shownTx.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">No transactions yet</p>
            ) : (
              shownTx.slice(0, 4).map((row) => (
                <Row key={row.id} title={row.title} meta={row.meta} amount={row.amount} onClick={() => openTx(row)} />
              ))
            )}
          </Card>
        ) : null}
        {acctTab === "Details" ? (
          <Card className="space-y-3 p-4 text-[14px]">
            <p className="flex justify-between"><span className="text-muted">Account name</span><span>{fullName}</span></p>
            <p className="flex justify-between"><span className="text-muted">Receiving account</span><span>{wallet?.receivingAccountNumber ?? "Not issued"}</span></p>
            <p className="flex justify-between"><span className="text-muted">Bank</span><span>Nakconel</span></p>
            <p className="flex justify-between"><span className="text-muted">Currency</span><span>NGN</span></p>
          </Card>
        ) : null}
        {acctTab === "Settings" ? (
          <Card className="px-3">
            <Row title="Statements" meta="Ledger summary" onClick={() => go("statements")} />
            <Row title="Beneficiaries" meta="Saved accounts" onClick={() => go("people")} />
          </Card>
        ) : null}
        <Btn onClick={() => go("txns")}>View All</Btn>
      </>,
    );
  }

  if (screen === "txns") {
    return frame(
      <>
        <BackTitle title="Transactions" onBack={back} />
        <label className="flex h-12 items-center gap-2 rounded-2xl border border-line bg-paper px-3">
          <Search size={16} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transactions..." className="w-full bg-transparent text-[14px] outline-none" />
        </label>
        <Pills value={filter} options={["All", "Debit", "Credit"]} onChange={setFilter} />
        <Card className="px-3">
          {shownTx.map((row) => (
            <Row key={row.id} title={row.title} meta={row.meta} amount={row.amount} onClick={() => openTx(row)} />
          ))}
          {shownTx.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">No transactions</p> : null}
        </Card>
        {error ? <p className="text-[12px] text-wine">{error}</p> : null}
        {wallet?.nextEntriesCursor ? (
          <Btn
            tone="line"
            disabled={loadingMoreEntries}
            onClick={() => {
              const cursor = wallet.nextEntriesCursor;
              if (!cursor || loadingMoreEntries) return;
              setLoadingMoreEntries(true);
              setError("");
              void getTransactionPage({ data: { cursor } })
                .then((page) => {
                  setWallet((current) =>
                    current
                      ? {
                          ...current,
                          entries: [...current.entries, ...page.entries],
                          nextEntriesCursor: page.nextCursor,
                        }
                      : current,
                  );
                  setLoadingMoreEntries(false);
                })
                .catch(() => {
                  setLoadingMoreEntries(false);
                  setError("We couldn't load more transactions. Please try again.");
                });
            }}
          >
            {loadingMoreEntries ? "Loading…" : "Load more transactions"}
          </Btn>
        ) : null}
      </>,
    );
  }

  if (screen === "send") {
    if (!wallet?.capabilities.bankTransfers) {
      return frame(
        <>
          <BackTitle title="Send Money" onBack={back} />
          <Card className="border-amber-300 bg-amber-50 p-4 text-[13px] leading-5 text-amber-950">
            Bank transfers are unavailable. A licensed payout partner is not connected, and this wallet will not debit funds for an unsupported transfer.
          </Card>
        </>,
      );
    }
    const resolved = payee.trim();
    const banks = BANKS.filter((b) => b.name.toLowerCase().includes(bankQuery.trim().toLowerCase()));
    const recent = shownTx.filter((row) => row.amount < 0);
    return frame(
      <>
        <BackTitle title="Send Money" sub="Enter the account you want to pay." onBack={back} />
        <Field label="Amount" value={amount} onChange={(v) => setAmount(v.replace(/\D/g, "").slice(0, 9))} placeholder="0.00" />
        <Field
          label="Account Number"
          value={acctNo}
          onChange={(v) => {
            setPayee("");
            setAcctNo(v.replace(/\D/g, "").slice(0, 10));
          }}
          placeholder="10-digit account number"
        />
        <div>
          <p className="mb-1.5 text-[12px] font-medium text-muted">Bank</p>
          <button
            type="button"
            onClick={() => {
              setBankQuery("");
              setBankOpen(true);
            }}
            className="flex h-14 w-full items-center gap-3 rounded-2xl border border-line bg-paper px-3 text-left"
          >
            {pickedBank ? (
              <img src={pickedBank.logo} alt="" className="h-8 w-8 rounded-lg object-contain" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f6ebe3] text-wine">
                <Building2 size={16} />
              </span>
            )}
            <span className={`flex-1 text-[15px] ${pickedBank ? "text-ink" : "text-[#c3b2a4]"}`}>{pickedBank ? pickedBank.name : "Select bank"}</span>
            <ChevronRight size={16} className="text-[#c9b8aa]" />
          </button>
        </div>
        {nameStatus === "checking" ? <p className="text-[12px] text-muted">Checking the account name…</p> : null}
        {nameStatus === "live" && resolved ? (
          <Card className="px-4 py-3">
            <p className="text-[11px] text-muted">Account name</p>
            <p className="text-[15px] font-semibold">{resolved}</p>
          </Card>
        ) : null}
        {nameStatus === "manual" ? (
          <Field label="Account name" value={payee} onChange={setPayee} placeholder="Name on the account" />
        ) : null}
        <Field label="Narration" value={narration} onChange={setNarration} placeholder="What is this for?" />
        <Field label="Transaction PIN" type="password" value={payPin} onChange={(v) => setPayPin(v.replace(/\D/g, "").slice(0, 4))} placeholder="4 digits" />
        {error ? <p className="text-[12px] text-wine">{error}</p> : null}
        <Btn
          onClick={() => {
            const n = Number(amount || 0);
            if (!pickedBank) {
              setError("Select a bank.");
              return;
            }
            if (acctNo.length !== 10) {
              setError("Account number must be 10 digits.");
              return;
            }
            if (resolved.length < 3) {
              setError(nameStatus === "checking" ? "Still checking the account name." : "Enter the account name.");
              return;
            }
            if (n < 100) {
              setError("Enter an amount of at least ₦100.");
              return;
            }
            if (payPin.length !== 4) {
              setError("Enter your 4-digit PIN.");
              return;
            }
            setBusy(true);
            void transfer({
              data: {
                amountNaira: n,
                pin: payPin,
                idempotencyKey: idem.current,
                meta: narration,
                counterparty: resolved,
                bankName: pickedBank.name,
                accountNumber: acctNo,
                bankId: pickedBank.id,
                accountName: resolved,
                narration,
              },
            })
              .then(async (result) => {
                setBusy(false);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                applyEntry(result.entry);
                await refreshWallet();
                go("tx");
              })
              .catch(() => {
                setBusy(false);
                setError("The transfer did not go through.");
              });
          }}
        >
          {busy ? "Sending…" : "Continue"}
        </Btn>
        <div className="pt-2">
          <h2 className="mb-2 text-[15px] font-semibold">Beneficiaries and recent transfers</h2>
          <Pills value={who} options={["Beneficiaries", "Recent"]} onChange={setWho} />
        </div>
        <Card className="px-3">
          {who === "Beneficiaries" ? (
            savedPeople.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-muted">No saved beneficiaries yet. A successful transfer saves one.</p>
            ) : (
              savedPeople
                .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || query === "")
                .map((p) => (
                  <Row
                    key={p.id}
                    title={p.name}
                    meta={`${p.bankName} · ${p.accountNumber}`}
                    icon={<img src={BANKS.find((b) => b.id === p.bankId)?.logo ?? "/mark.png"} alt="" className="h-7 w-7 object-contain" />}
                    onClick={() => {
                      setPickedBank(BANKS.find((b) => b.id === p.bankId) ?? null);
                      setAcctNo(p.accountNumber);
                      setPayee(p.name);
                      setNameStatus("live");
                      setError("");
                    }}
                  />
                ))
            )
          ) : recent.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">No transfers yet</p>
          ) : (
            recent.map((row) => <Row key={row.id} title={row.title} meta={row.meta} amount={row.amount} onClick={() => openTx(row)} />)
          )}
        </Card>
        {bankOpen ? (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45" onClick={() => setBankOpen(false)}>
            <div
              className="flex max-h-[86dvh] w-full max-w-md flex-col rounded-t-[28px] bg-cream px-5 pt-3 pb-6"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[#e4d5c8]" />
              <h2 className="text-[20px] font-semibold">Select bank</h2>
              <p className="text-[12px] text-muted">Nigerian banks and wallets</p>
              <label className="mt-3 flex h-12 items-center gap-2 rounded-2xl border border-line bg-paper px-3">
                <Search size={16} className="text-muted" />
                <input
                  value={bankQuery}
                  onChange={(e) => setBankQuery(e.target.value)}
                  placeholder="Search for a bank"
                  className="w-full bg-transparent text-[14px] outline-none"
                  autoFocus
                />
              </label>
              <div className="mt-4 overflow-y-auto pb-2">
                <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                  {banks.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setPickedBank(b);
                        setPayee("");
                        setBankOpen(false);
                        setError("");
                      }}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl border bg-white p-1.5 ${pickedBank?.id === b.id ? "border-wine" : "border-line"}`}>
                        <img src={b.logo} alt="" className="h-full w-full object-contain" />
                      </span>
                      <span className="line-clamp-2 text-center text-[10px] leading-tight font-medium">{b.name}</span>
                    </button>
                  ))}
                </div>
                {banks.length === 0 ? <p className="py-8 text-center text-[13px] text-muted">No bank matches that search.</p> : null}
              </div>
            </div>
          </div>
        ) : null}
      </>,
    );
  }

  if (screen === "bank") {
    return frame(
      <>
        <BackTitle title="Bank transfer" onBack={back} />
        <Card className="border-amber-300 bg-amber-50 p-4 text-[13px] leading-5 text-amber-950">
          Bank transfers are not enabled. No transfer was created and no money was moved.
        </Card>
      </>,
    );
  }

  if (screen === "receive") {
    return frame(
      <>
        <BackTitle title="Receive Money" sub="Incoming bank transfers are not connected." onBack={back} />
        <Card className="p-4">
          <p className="text-[14px] font-semibold">No receiving account issued</p>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            This wallet is not a bank account. A bank or payment partner must issue an account before it can receive external transfers.
          </p>
        </Card>
        <Pills value={who} options={["Recent", "Saved"]} onChange={setWho} />
        <Card className="px-3">
          {(who === "Saved" ? savedPeople : []).length === 0 && who === "Saved" ? (
            <p className="py-6 text-center text-[13px] text-muted">No saved beneficiaries yet.</p>
          ) : who === "Saved" ? (
            savedPeople.map((p) => (
              <Row key={p.id} title={p.name} meta={`${p.bankName} · ${p.accountNumber}`} onClick={() => go("people")} />
            ))
          ) : shownTx.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">No transfers in yet.</p>
          ) : (
            shownTx.slice(0, 4).map((row) => (
              <Row key={row.id} title={row.title} meta={row.meta} amount={row.amount} onClick={() => openTx(row)} />
            ))
          )}
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Card className="flex flex-col items-center gap-2 p-4 text-center">
            <QrCode className="text-wine" />
            <p className="text-[13px] font-semibold">Generate QR Code</p>
            <p className="text-[11px] text-muted">Share your QR code</p>
          </Card>
          <Card className="flex flex-col items-center gap-2 p-4 text-center">
            <Send className="text-wine" />
            <p className="text-[13px] font-semibold">Request Money</p>
            <p className="text-[11px] text-muted">Send a request link</p>
          </Card>
        </div>
        <Btn disabled>No account details to share</Btn>
      </>,
    );
  }

  if (screen === "add") {
    const methods = [
      {
        id: "Account",
        title: "Card",
        meta: wallet?.capabilities.cardTopups
          ? "Paystack. Balance updates only after payment is confirmed."
          : "Unavailable until card payments are connected.",
      },
    ];
    return frame(
      <>
        <BackTitle title="Add Money" sub={demoMode ? "Simulate a sample balance change." : "Choose a funding method."} onBack={back} />
        {demoMode ? (
          <Card className="border-amber-300 bg-amber-50 p-4 text-[13px] leading-5 text-amber-950">
            Demo funding changes sample data in this browser only. It does not contact a payment provider or represent a real deposit.
          </Card>
        ) : null}
        {!demoMode ? <div className="flex flex-col gap-2">
          {methods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setFund(m.id)}
              className={`rounded-2xl border px-4 py-3 text-left ${fund === m.id ? "border-wine bg-[#f8efe9]" : "border-line bg-paper"}`}
            >
              <p className="text-[14px] font-semibold">{m.title}</p>
              <p className="text-[12px] text-muted">{m.meta}</p>
            </button>
          ))}
        </div> : null}
        <Field label="Amount" value={topupAmount} onChange={(v) => setTopupAmount(v.replace(/\D/g, "").slice(0, 9))} placeholder="1000" />
        {error ? <p className="text-[12px] text-wine">{error}</p> : null}
        <div className="mt-auto">
          <Btn
            onClick={() => {
              const n = Number(topupAmount || 0);
              if (n < 100) {
                setError("Enter at least ₦100.");
                return;
              }
              if (demoMode) {
                if (!wallet) {
                  setError("Demo wallet is unavailable. Exit and re-enter demo mode.");
                  return;
                }
                const result = addDemoFunds(wallet, n, crypto.randomUUID(), new Date().toISOString());
                setWallet(result.wallet);
                applyEntry(result.entry, true);
                go("tx");
                return;
              }
              if (!wallet?.capabilities.cardTopups) {
                setError("Card payments are not connected. Your wallet balance has not changed.");
                return;
              }
              setBusy(true);
              void startTopup({ data: { amountNaira: n, callbackUrl: window.location.origin } })
                .then((result) => {
                  setBusy(false);
                  if (!result.ok) {
                    setError(
                      result.reason === "not_connected"
                        ? "Card payments are not connected yet. Your balance stays the same until a payment succeeds."
                        : "The payment could not be started.",
                    );
                    return;
                  }
                  window.location.href = result.authorizationUrl;
                })
                .catch(() => {
                  setBusy(false);
                  setError("The payment could not be started.");
                });
            }}
          >
            {busy ? "Please wait…" : demoMode ? "Add demo funds" : "Continue"}
          </Btn>
        </div>
      </>,
    );
  }

  if (screen === "people") {
    const list = savedPeople.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    return frame(
      <>
        <BackTitle title="Beneficiaries" sub="Search beneficiaries." onBack={back} />
        <label className="flex h-12 items-center gap-2 rounded-2xl border border-line bg-paper px-3">
          <Search size={16} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search beneficiaries..." className="w-full bg-transparent text-[14px] outline-none" />
        </label>
        <Card className="px-3">
          {list.map((p) => (
            <Row
              key={p.id}
              title={p.name}
              meta={`${p.bankName} · ${p.accountNumber}`}
              icon={<img src={BANKS.find((b) => b.id === p.bankId)?.logo ?? "/mark.png"} alt="" className="h-7 w-7 object-contain" />}
              onClick={() => {
                setPickedBank(BANKS.find((b) => b.id === p.bankId) ?? null);
                setAcctNo(p.accountNumber);
                setPayee(p.name);
                setNameStatus("live");
                go("send");
              }}
            />
          ))}
        </Card>
      </>,
    );
  }

  if (screen === "airtime") {
    if (!wallet?.capabilities.airtime) {
      return frame(
        <>
          <BackTitle title="Airtime" onBack={back} />
          <Card className="border-amber-300 bg-amber-50 p-4 text-[13px] leading-5 text-amber-950">
            Airtime purchases are not connected to a service provider. No wallet debit will be made.
          </Card>
        </>,
      );
    }
    const chips = ["100", "200", "500", "1000", "2000", "5000"];
    return frame(
      <div className="flex flex-1 flex-col gap-4">
        <BackTitle title="Airtime" sub="Buy airtime for any Nigerian number." onBack={back} />
        <div className="grid grid-cols-4 gap-2">
          {AIRTIME.map((net) => (
            <button
              key={net.id}
              type="button"
              onClick={() => setNetwork(net.id)}
              className={`flex h-16 items-center justify-center rounded-2xl text-[13px] font-semibold ${network === net.id ? "ring-2 ring-wine ring-offset-2" : ""}`}
              style={{ background: net.color, color: net.ink }}
            >
              {net.id}
            </button>
          ))}
        </div>
        <Field
          label="Phone Number"
          value={airtimePhone}
          onChange={(v) => setAirtimePhone(v.replace(/\D/g, "").slice(0, 11))}
          placeholder="0801 234 5678"
          icon={<Smartphone size={16} />}
        />
        <div>
          <p className="mb-2 text-[12px] font-medium text-muted">Amount</p>
          <div className="grid grid-cols-3 gap-2">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAirtimeAmt(c)}
                className={`h-11 rounded-2xl text-[13px] font-semibold ${airtimeAmt === c ? "bg-wine text-white" : "border border-line bg-paper text-ink"}`}
              >
                ₦{Number(c).toLocaleString("en-NG")}
              </button>
            ))}
          </div>
        </div>
        {error ? <p className="text-[12px] text-wine">{error}</p> : null}
        <Field label="Transaction PIN" type="password" value={payPin} onChange={(v) => setPayPin(v.replace(/\D/g, "").slice(0, 4))} placeholder="4 digits" />
        <div className="mt-auto">
          <Btn
            onClick={() => {
              if (airtimePhone.length < 11) {
                setError("Enter an 11-digit phone number.");
                return;
              }
              if (payPin.length !== 4) {
                setError("Enter your 4-digit PIN.");
                return;
              }
              setBusy(true);
              void buyAirtime({
                data: {
                  amountNaira: Number(airtimeAmt),
                  pin: payPin,
                  idempotencyKey: idem.current,
                  meta: network,
                  counterparty: airtimePhone,
                  bankName: network,
                  network,
                  phone: airtimePhone,
                },
              })
                .then(async (result) => {
                  setBusy(false);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  applyEntry(result.entry);
                  await refreshWallet();
                  go("tx");
                })
                .catch(() => {
                  setBusy(false);
                  setError("The airtime purchase did not go through.");
                });
            }}
          >
            {busy ? "Buying…" : `Buy ${network} airtime`}
          </Btn>
        </div>
      </div>,
    );
  }

  if (screen === "bills") {
    if (!wallet?.capabilities.billPayments) {
      return frame(
        <>
          <BackTitle title="Payments & Bills" onBack={back} />
          <Card className="border-amber-300 bg-amber-50 p-4 text-[13px] leading-5 text-amber-950">
            Bill payments are not connected to a service provider. No payment will be submitted or debited.
          </Card>
        </>,
      );
    }
    const services = [
      { id: "Airtime", icon: <Smartphone size={18} /> },
      { id: "Data", icon: <Globe2 size={18} /> },
      { id: "Electricity", icon: <Zap size={18} /> },
      { id: "Cable TV", icon: <Tv size={18} /> },
      { id: "Water", icon: <Droplets size={18} /> },
      { id: "Education", icon: <GraduationCap size={18} /> },
    ];
    return frame(
      <>
        <BackTitle title="Payments & Bills" sub="Select a service." onBack={back} />
        <div className="grid grid-cols-3 gap-3">
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setBill(s.id)}
              className={`flex flex-col items-center gap-2 rounded-2xl border py-4 ${bill === s.id ? "border-wine bg-[#f8efe9]" : "border-line bg-paper"}`}
            >
              <span className="text-wine">{s.icon}</span>
              <span className="text-[12px] font-medium">{s.id}</span>
            </button>
          ))}
        </div>
        <h2 className="text-[14px] font-semibold">Recent Payments</h2>
        <Card className="px-3">
          {shownTx.filter((row) => row.amount < 0).slice(0, 3).length === 0 ? (
            <p className="py-6 text-center text-[13px] text-muted">No payments yet</p>
          ) : (
            shownTx
              .filter((row) => row.amount < 0)
              .slice(0, 3)
              .map((row) => <Row key={row.id} title={row.title} meta={row.meta} amount={row.amount} onClick={() => openTx(row)} />)
          )}
        </Card>
        <Field label="Transaction PIN" type="password" value={payPin} onChange={(v) => setPayPin(v.replace(/\D/g, "").slice(0, 4))} placeholder="4 digits" />
        {error ? <p className="text-[12px] text-wine">{error}</p> : null}
        <Btn
          onClick={() => {
            if (payPin.length !== 4) {
              setError("Enter your 4-digit PIN.");
              return;
            }
            setBusy(true);
            void payBill({
              data: {
                amountNaira: 2000,
                pin: payPin,
                idempotencyKey: idem.current,
                meta: bill,
                counterparty: bill,
                bankName: "Nakconel",
                service: bill,
              },
            })
              .then(async (result) => {
                setBusy(false);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                applyEntry(result.entry);
                await refreshWallet();
                go("tx");
              })
              .catch(() => {
                setBusy(false);
                setError("The payment did not go through.");
              });
          }}
        >
          {busy ? "Paying…" : "Pay Now"}
        </Btn>
      </>,
    );
  }

  if (screen === "card") {
    return frame(
      <>
        <h1 className="text-[26px] font-semibold">Virtual Card</h1>
        <Card className="space-y-2 border-amber-300 bg-amber-50 p-4 text-[13px] leading-5 text-amber-950">
          <p className="font-semibold">No card has been issued.</p>
          <p>A card-issuing partner is not connected. Card details and controls are unavailable.</p>
        </Card>
      </>,
    );
  }

  if (screen === "statements") {
    return frame(
      <>
        <BackTitle title="Statements" onBack={back} />
        <p className="text-[13px] text-muted">Summary of the most recent {wallet?.entries.length ?? 0} ledger entries.</p>
        <Card className="space-y-3 p-4 text-[14px]">
          <p className="flex justify-between"><span className="text-muted">Credits in listed entries</span><span className="text-credit">{ngn((wallet?.entries ?? []).filter((e) => e.amountKobo > 0).reduce((s, e) => s + e.amountKobo, 0) / 100)}</span></p>
          <p className="flex justify-between"><span className="text-muted">Debits in listed entries</span><span className="text-wine">{ngn((wallet?.entries ?? []).filter((e) => e.amountKobo < 0).reduce((s, e) => s + e.amountKobo, 0) / 100)}</span></p>
          <p className="flex justify-between font-semibold"><span>Closing Balance</span><span>{balanceLabel}</span></p>
        </Card>
        <Btn disabled>Statement export unavailable</Btn>
      </>,
    );
  }

  if (screen === "notes") {
    return frame(
      <>
        <BackTitle title="Notifications" onBack={back} />
        <Pills value={noteTab} options={["All", "Transactions"]} onChange={setNoteTab} />
        <Card className="px-3">
          {shownTx.map((row) => <Row key={row.id} title={row.title} meta={row.meta} amount={row.amount} onClick={() => openTx(row)} />)}
          {shownTx.length === 0 ? <p className="py-6 text-center text-[13px] text-muted">No wallet activity yet.</p> : null}
        </Card>
      </>,
    );
  }

  if (screen === "profile") {
    return frame(
      <>
        <BackTitle title="My Profile" onBack={back} />
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f6ebe3] text-wine">
            <UserRound />
          </span>
          <span>
            <span className="block text-[16px] font-semibold">{fullName}</span>
            <span className="block text-[13px] text-muted">{phonePretty ? `+234 ${phonePretty}` : "Phone number not added"}</span>
          </span>
        </Card>
        <Card className="px-3">
          <Row title="Personal Information" meta={gender} onClick={() => go("personal")} />
          <Row title="Account Limits" meta="Not configured" />
          <Row title="KYC Status" meta="Not verified" onClick={() => go("kyc")} />
        </Card>
      </>,
    );
  }

  if (screen === "security") {
    return frame(
      <>
        <BackTitle title="Security" onBack={back} />
        <Card className="px-3">
          <Row title="Transaction PIN" meta={wallet?.hasPin ? "Set" : "Not set"} />
          <Row title="Change PIN" meta="PIN reset is not available yet" />
          <Row title="Two-Factor Authentication" meta="SMS verification is not connected" />
          <Row title="Active Devices" meta="Device management is not available" />
          <Row title="Report a Problem" meta="Support tickets not available" onClick={() => go("ticket")} />
          <Row title="Biometric Login" meta="Not configured" />
          <Row title="Privacy Settings" />
        </Card>
      </>,
    );
  }

  if (screen === "help") {
    return frame(
      <div className="flex flex-1 flex-col gap-3">
        <BackTitle title="Help & Support" onBack={back} />
        <Card className="space-y-2 border-amber-300 bg-amber-50 p-4 text-[13px] leading-5 text-amber-950">
          <p className="font-semibold">Support is not connected.</p>
          <p>There is no live chat, support inbox, or ticket service configured in this wallet yet.</p>
        </Card>
      </div>,
    );
  }

  if (screen === "kyc") {
    return frame(
      <div className="flex flex-1 flex-col gap-4">
        <BackTitle title="Identity Verification" sub="KYC is not enabled for this wallet." onBack={back} />
        <Card className="space-y-2 border-amber-300 bg-amber-50 p-4 text-[13px] leading-5 text-amber-950">
          <p className="font-semibold">Status: Not verified</p>
          <p>
            Nakconel is not connected to an identity verification provider. No document or selfie has been verified, and this profile must not be treated as KYC-complete.
          </p>
          <p>Do not send NIN, BVN, or identity documents through this app.</p>
        </Card>
      </div>,
    );
  }

  if (screen === "tx") {
    return frame(
      <div className="flex flex-1 flex-col">
        <BackTitle title="Transaction Details" onBack={back} />
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e5f6ec] text-credit">
            <Check />
          </span>
          <p className={`mt-3 text-[13px] font-semibold ${tx.demo ? "text-amber-800" : "text-credit"}`}>
            {tx.demo ? "Demo preview · no money moved" : "Ledger entry recorded"}
          </p>
          <p className="mt-2 text-[14px] text-muted">{tx.title}</p>
          <p className="mt-1 font-display text-[32px]">{ngn(Math.abs(tx.amount))}</p>
        </div>
        <Card className="space-y-3 p-4 text-[14px]">
          <p className="flex justify-between gap-4"><span className="text-muted">To</span><span className="text-right">{tx.who}</span></p>
          <p className="flex justify-between gap-4"><span className="text-muted">Provider</span><span>{tx.bank || "—"}</span></p>
          <p className="flex justify-between gap-4"><span className="text-muted">Date</span><span>{tx.createdAt ? new Date(tx.createdAt).toLocaleString("en-NG") : "—"}</span></p>
          <p className="flex justify-between gap-4"><span className="text-muted">Reference</span><span className="tabular-nums">{tx.ref || "—"}</span></p>
        </Card>
        <div className="mt-auto flex flex-col gap-3 pt-6">
          <Btn disabled>Receipt sharing unavailable</Btn>
          <Btn tone="line" disabled>Download unavailable</Btn>
        </div>
      </div>,
    );
  }

  if (screen === "ticket") {
    return frame(
      <>
        <BackTitle title="Report a Problem" onBack={back} />
        <Card className="space-y-2 border-amber-300 bg-amber-50 p-4 text-[13px] leading-5 text-amber-950">
          <p className="font-semibold">Support tickets are not available.</p>
          <p>No message was sent. Nakconel has not connected a support service yet.</p>
        </Card>
      </>,
    );
  }

  const more: { title: string; meta: string; to: Screen; icon: React.ReactNode }[] = [
    ...(demoMode
      ? [{ title: "Business workspace", meta: "Invoices, links, expenses · demo", to: "business" as Screen, icon: <Building2 size={16} /> }]
      : []),
    { title: "Profile", meta: fullName, to: "profile", icon: <UserRound size={16} /> },
    { title: "Statements", meta: "Wallet activity summary", to: "statements", icon: <FileText size={16} /> },
    { title: "Notifications", meta: "Wallet activity", to: "notes", icon: <Bell size={16} /> },
    { title: "Beneficiaries", meta: "Saved accounts", to: "people", icon: <UserRound size={16} /> },
    { title: "Payments & Bills", meta: "Airtime, data, power", to: "bills", icon: <Zap size={16} /> },
    { title: "Security", meta: "PIN, devices, biometrics", to: "security", icon: <Shield size={16} /> },
    { title: "Help & Support", meta: "Support not connected", to: "help", icon: <Headphones size={16} /> },
    { title: "KYC", meta: "Identity verification", to: "kyc", icon: <Check size={16} /> },
  ];

  return frame(
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold">More</h1>
          <p className="text-[13px] text-muted">{fullName}</p>
        </div>
        <Logo size={42} />
      </div>
      <Card className="px-3">
        {more.map((item) => (
          <Row key={item.title} title={item.title} meta={item.meta} icon={item.icon} onClick={() => go(item.to)} />
        ))}
      </Card>
      {!demoMode ? <UserButton /> : null}
    </>,
  );
}
