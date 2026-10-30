import { useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { BANKS } from "@/lib/banks";
import {
  buyAirtime,
  confirmTopup,
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
  Sparkles,
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
  | "otp"
  | "access"
  | "pin"
  | "face"
  | "personal"
  | "nin"
  | "address"
  | "home"
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
  | "business"
  | "world"
  | "assistant"
  | "kyc"
  | "kycDoc"
  | "kycSelfie"
  | "kycDone"
  | "tx"
  | "ticket"
  | "adminKyc"
  | "adminTx"
  | "adminReports"
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
};

const TXS: Tx[] = [
  { id: "1", title: "Airtime Purchase", meta: "Today · MTN", amount: -1000, who: "MTN", ref: "NAK123450001" },
  { id: "2", title: "Money Sent", meta: "Today · Zenith Bank", amount: -15000, who: "Mary Johnson", bank: "Zenith Bank", ref: "NAK123456789" },
  { id: "3", title: "Electricity Bill", meta: "Yesterday · IKEDC", amount: -5500, who: "IKEDC", ref: "NAK123450003" },
  { id: "4", title: "Food & Dining", meta: "Yesterday · 2:14 PM", amount: -8000, who: "Food Court", ref: "NAK123450004" },
  { id: "5", title: "Shopping", meta: "Mon · 4:02 PM", amount: -12000, who: "Slot Store", ref: "NAK123450005" },
  { id: "6", title: "Money Received", meta: "Mon · Adeola Stores", amount: 85000, who: "Adeola Stores", bank: "Nakconel", ref: "NAK123450006" },
];

const ACCOUNTS = [
  { id: "main", name: "Main Wallet", bal: 542750, hint: "Available balance" },
  { id: "sav", name: "Savings Account", bal: 120000, hint: "4.5% per year" },
  { id: "biz1", name: "Business Account", bal: 130000, hint: "ABC Enterprises" },
  { id: "biz2", name: "Business Account", bal: 460000, hint: "Collections" },
];

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
    ["more", "profile", "security", "help", "business", "world", "assistant", "kyc", "kycDoc", "kycSelfie", "kycDone", "ticket", "adminKyc", "adminTx", "adminReports"].includes(screen)
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
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "solid" | "ghost" | "line";
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
      className={`flex h-[52px] w-full items-center justify-center rounded-2xl text-[15px] font-semibold ${cls}`}
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

function Nav({ tab, onNav }: { tab: Tab; onNav: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "accounts", label: "Accounts", icon: Wallet },
    { id: "card", label: "Cards", icon: CreditCard },
    { id: "more", label: "More", icon: LayoutGrid },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-md justify-around border-t border-line bg-[#fffdfb]/95 px-2 py-2 backdrop-blur">
      {items.map((item) => {
        const Icon = item.icon;
        const on = tab === item.id;
        return (
          <button key={item.id} type="button" onClick={() => onNav(item.id)} className="flex w-16 flex-col items-center gap-1 py-1">
            <Icon size={20} strokeWidth={on ? 2.4 : 1.8} className={on ? "text-wine" : "text-[#b6a496]"} />
            <span className={`text-[11px] ${on ? "font-semibold text-wine" : "text-[#b6a496]"}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Pills({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
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
  const [stack, setStack] = useState<Screen[]>([]);
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [seconds, setSeconds] = useState(45);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [idType, setIdType] = useState<"NIN" | "BVN">("NIN");
  const [nin, setNin] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [acctTab, setAcctTab] = useState("Transactions");
  const [who, setWho] = useState("Recent");
  const [fund, setFund] = useState("Account");
  const [bill, setBill] = useState("Airtime");
  const [tx, setTx] = useState<Tx>(TXS[1]);
  const [online, setOnline] = useState(true);
  const [atm, setAtm] = useState(false);
  const [intl, setIntl] = useState(false);
  const [bio, setBio] = useState(true);
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
  const [stmt, setStmt] = useState("Monthly");
  const [adminTab, setAdminTab] = useState("Pending");
  const [ask, setAsk] = useState("");
  const [replies, setReplies] = useState<string[]>([]);
  const [docName, setDocName] = useState("");
  const [camOn, setCamOn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [payPin, setPayPin] = useState("");
  const [topupAmount, setTopupAmount] = useState("1000");
  const [nameStatus, setNameStatus] = useState<"idle" | "checking" | "live" | "manual">("idle");
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [busy, setBusy] = useState(false);
  const session = useCurrentUserState();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

  useEffect(() => {
    if (screen !== "otp") return;
    setSeconds(45);
    const id = window.setInterval(() => setSeconds((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [screen]);

  useEffect(() => {
    if (screen !== "face" && screen !== "kycSelfie") {
      setCamOn(false);
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setCamOn(true);
      })
      .catch(() => setCamOn(false));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [screen]);

  useEffect(() => {
    if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [screen, camOn]);

  const refreshWallet = async () => {
    const next = await getWallet();
    setWallet(next);
    return next;
  };

  useEffect(() => {
    if (!session.user) return;
    refreshWallet().catch(() => setError("Couldn't open your wallet."));
  }, [session.user?.id]);

  useEffect(() => {
    if (!session.user) return;
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
  }, [session.user?.id]);

  useEffect(() => {
    if (acctNo.length !== 10 || !pickedBank || !session.user) {
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
  }, [acctNo, pickedBank?.id, session.user?.id]);

  const applyEntry = (entry: LedgerEntry) => {
    setTx({
      id: entry.id,
      title: entry.title,
      meta: entry.meta,
      amount: entry.amountKobo / 100,
      who: entry.counterparty,
      bank: entry.bankName,
      ref: entry.reference,
    });
    idem.current = crypto.randomUUID();
    setPayPin("");
  };

  const displayName = name.trim().split(" ")[0] || wallet?.profile.fullName.split(" ")[0] || session.user?.displayName?.split(" ")[0] || "there";
  const fullName = name.trim() || wallet?.profile.fullName || session.user?.displayName || "Nakconel customer";
  const phonePretty = phone ? phone.replace(/(\d{3})(\d{3})(\d{0,4})/, "$1 $2 $3").trim() : "801 234 5678";
  const balanceLabel = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format((wallet?.balanceKobo ?? 0) / 100);
  const savedPeople = wallet?.beneficiaries ?? [];

  const shownTx = useMemo(() => {
    const rows: Tx[] = (wallet?.entries ?? []).map((entry) => ({
      id: entry.id,
      title: entry.title,
      meta: entry.meta,
      amount: entry.amountKobo / 100,
      who: entry.counterparty,
      bank: entry.bankName,
      ref: entry.reference,
    }));
    return rows.filter((row) => {
      const q = query.trim().toLowerCase();
      const hit = !q || row.title.toLowerCase().includes(q) || row.who.toLowerCase().includes(q);
      if (!hit) return false;
      if (filter === "Debit") return row.amount < 0;
      if (filter === "Credit") return row.amount > 0;
      return true;
    });
  }, [wallet, query, filter]);

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
    <div className={`mx-auto flex min-h-dvh w-full max-w-md flex-col shadow-[0_0_0_1px_rgba(90,40,30,0.04)] ${dark ? "bg-[#14080a] text-white" : "bg-cream text-ink"}`}>
      <main className={`flex flex-1 flex-col gap-4 px-5 pt-7 ${tab ? "pb-28" : "pb-6"}`}>{node}</main>
      {tab ? <Nav tab={tab} onNav={onNav} /> : null}
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
        className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-between overflow-hidden px-8 py-16 text-center"
        style={{
          background:
            "radial-gradient(90% 45% at 100% 100%, rgba(224,181,106,0.28), transparent 55%), radial-gradient(70% 40% at 0% 88%, rgba(224,181,106,0.16), transparent 50%), linear-gradient(180deg, #6a1a22 0%, #3c0609 58%, #2a0508 100%)",
        }}
      >
        <span />
        <span className="flex flex-col items-center">
          <Logo size={148} />
          <span className="mt-6 block font-display text-[28px] tracking-[0.28em] text-[#f0d7a4]">NAKCONEL</span>
          <span className="mt-2 block text-[11px] tracking-[0.5em] text-[#f0d7a4]">BANK</span>
        </span>
        <span className="text-[13px] text-[#f0d7a4]/90">Banking for today, building for tomorrow.</span>
      </button>
    );
  }

  if (screen === "welcome") {
    return frame(
      <div className="flex flex-1 flex-col">
        <div className="mt-10 flex flex-col items-center">
          <Logo size={86} />
          <div className="mt-4">
            <Wordmark />
          </div>
          <h1 className="mt-10 text-center text-[26px] font-semibold tracking-tight">Welcome to Nakconel Bank</h1>
          <p className="mt-2 text-[13px] text-muted">Secure. Simple. Global.</p>
        </div>
        <div className="mt-auto flex flex-col gap-3 pt-16">
          <Btn
            onClick={() => {
              setMode("signup");
              setPhone("");
              setOtp("");
              setPin("");
              go("phone");
            }}
          >
            Get Started
          </Btn>
          <Btn
            tone="ghost"
            onClick={() => {
              setMode("login");
              setPhone("");
              setOtp("");
              setPin("");
              go("phone");
            }}
          >
            Log in
          </Btn>
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
          <h1 className="text-center text-[22px] font-semibold">Enter your phone number</h1>
          <p className="mt-1 text-center text-[13px] text-muted">This becomes your Nakconel account number.</p>
        </div>
        <div className="mt-5 flex h-14 items-center gap-3 rounded-2xl border border-line bg-paper px-3">
          <span className="text-lg">🇳🇬</span>
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
              setOtp("");
              go(session.user ? "pin" : "access");
            }}
          >
            Continue
          </Btn>
        </div>
        <p className="mt-3 text-center text-[13px] text-muted">
          Don’t have an account?{" "}
          <button
            type="button"
            className="font-semibold text-wine"
            onClick={() => {
              setMode("signup");
              setError("");
            }}
          >
            Register
          </button>
        </p>
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

  if (screen === "otp") {
    return frame(
      <div className="flex flex-1 flex-col">
        <BackTitle title="" onBack={back} />
        <div className="-mt-8 flex flex-col items-center">
          <Logo size={48} />
          <h1 className="mt-4 text-center text-[22px] font-semibold">Enter the 6-digit code</h1>
          <p className="mt-1 text-center text-[13px] text-muted">We sent the code to +234 {phonePretty}</p>
        </div>
        <div className="mt-5 grid grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex h-12 items-center justify-center rounded-xl border border-line bg-paper text-[18px] font-semibold">
              {otp[i] ?? ""}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 text-center text-[13px] text-wine"
          onClick={() => setSeconds(45)}
          disabled={seconds > 0}
        >
          {seconds > 0 ? `Resend code in 00:${String(seconds).padStart(2, "0")}` : "Resend code"}
        </button>
        {error ? <p className="text-center text-[12px] text-wine">{error}</p> : null}
        <div className="mt-3">
          <Btn
            onClick={() => {
              if (otp.length < 6) {
                setError("Enter the 6-digit code.");
                return;
              }
              setPin("");
              go("pin");
            }}
          >
            Continue
          </Btn>
        </div>
        <Keypad
          onKey={(k) => {
            setError("");
            if (k === "del") setOtp((p) => p.slice(0, -1));
            else if (otp.length < 6) setOtp((p) => p + k);
          }}
        />
      </div>,
    );
  }

  if (screen === "access") {
    return frame(
      <div className="flex flex-1 flex-col gap-4">
        <BackTitle
          title={mode === "signup" ? "Create your account" : "Log in"}
          sub={mode === "signup" ? "Email and password are saved. We do not accept a made-up code." : "Use the email and password for this account."}
          onBack={back}
        />
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" />
        {error ? <p className="text-[12px] text-wine">{error}</p> : null}
        <div className="mt-auto">
          <Btn
            onClick={() => {
              if (!email.includes("@") || password.length < 8) {
                setError("Use a real email and a password of at least 8 characters.");
                return;
              }
              setBusy(true);
              const run = mode === "signup"
                ? authClient.signUp.email({ email, password, name: email.split("@")[0] })
                : authClient.signIn.email({ email, password });
              void run.then((result) => {
                setBusy(false);
                if (result.error) {
                  const message = result.error.message?.trim();
                  setError(
                    message && message !== "Internal Server Error"
                      ? message
                      : "The account was not saved. The server failed before it could store this email.",
                  );
                  return;
                }
                if (mode === "signup") go("pin");
                else resetTo("home");
              });
            }}
          >
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
          </Btn>
        </div>
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
                  if (creating) go("face");
                  else resetTo("home");
                })
                .catch(() => {
                  setBusy(false);
                  setPin("");
                  setError("Create your email account before setting a PIN.");
                });
            }
          }}
        />
      </div>,
    );
  }

  if (screen === "face") {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#12080a] text-white">
        <div className="px-5 pt-6">
          <button type="button" onClick={back} className="flex items-center gap-1 text-[13px] text-[#f0d7a4]">
            <ChevronLeft size={18} /> Back
          </button>
          <h1 className="mt-4 text-[26px] font-semibold">Face Verification</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <div className="relative h-[340px] w-[260px]">
            <div className="absolute inset-0 overflow-hidden bg-[#2a1216]" style={{ clipPath: "ellipse(46% 50% at 50% 50%)" }}>
              <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${camOn ? "" : "hidden"}`} style={{ transform: "scaleX(-1)" }} />
              {camOn ? null : (
                <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-[#f0d7a4]/80">
                  Allow the camera so your face sits in the frame.
                </div>
              )}
            </div>
            <span className="pointer-events-none absolute inset-0 rounded-[50%] ring-2 ring-[#f0d7a4]/80" />
          </div>
          <p className="mt-6 text-center text-[14px] text-[#f6ead4]">Keep your face within the frame.</p>
        </div>
        <div className="flex justify-center pb-10">
          <button
            type="button"
            onClick={() => go("personal")}
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80"
            aria-label="Capture"
          >
            <span className="h-12 w-12 rounded-full bg-white" />
          </button>
        </div>
      </div>
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
              go("nin");
            }}
          >
            Next
          </Btn>
        </div>
      </div>,
    );
  }

  if (screen === "nin") {
    return frame(
      <div className="flex flex-1 flex-col gap-4">
        <BackTitle title="National Identification" sub="Enter your NIN or BVN." onBack={back} />
        <div className="grid grid-cols-2 rounded-full border border-line bg-paper p-1">
          {(["NIN", "BVN"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setIdType(opt)}
              className={`h-10 rounded-full text-[14px] font-semibold ${idType === opt ? "bg-wine text-white" : "text-ink"}`}
            >
              {opt}
            </button>
          ))}
        </div>
        <Field label={`${idType} Number`} value={nin} onChange={(v) => setNin(v.replace(/\D/g, "").slice(0, 11))} placeholder={`Enter your ${idType} number`} />
        <Field label="Date of Birth" value={dob} onChange={setDob} type="date" />
        {error ? <p className="text-[12px] text-wine">{error}</p> : null}
        <div className="mt-auto">
          <Btn
            onClick={() => {
              if (nin.length !== 11) {
                setError(`${idType} must be 11 digits.`);
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
          [idType, nin],
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
        {error ? <p className="text-[12px] text-wine">{error}</p> : null}
        <div className="mt-auto pt-2">
          <Btn
            onClick={() => {
              if (address.trim().length < 3) {
                setError("Enter your address.");
                return;
              }
              resetTo("home");
              void saveProfile({
                data: { fullName: name.trim(), phone, nin, address: address.trim(), gender, dob },
              }).then((next) => setWallet(next));
            }}
          >
            Submit
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
          <p className="mt-3 text-[12px] text-[#f0d7a4]/75">Available Balance</p>
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
        <Card className="px-3">
          {ACCOUNTS.slice(1).map((acct) => (
            <Row key={acct.id} title={acct.name} meta="Not opened" amount={0} onClick={() => go("account")} />
          ))}
        </Card>
        <Btn onClick={() => go("account")}>View All Accounts</Btn>
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
            {TXS.slice(0, 4).map((row) => (
              <Row key={row.id} title={row.title} meta={row.meta} amount={row.amount} onClick={() => openTx(row)} />
            ))}
          </Card>
        ) : null}
        {acctTab === "Details" ? (
          <Card className="space-y-3 p-4 text-[14px]">
            <p className="flex justify-between"><span className="text-muted">Account name</span><span>{fullName}</span></p>
            <p className="flex justify-between"><span className="text-muted">Account number</span><span className="tabular-nums">{wallet?.accountNumber ?? "—"}</span></p>
            <p className="flex justify-between"><span className="text-muted">Bank</span><span>Nakconel</span></p>
            <p className="flex justify-between"><span className="text-muted">Currency</span><span>NGN</span></p>
          </Card>
        ) : null}
        {acctTab === "Settings" ? (
          <Card className="px-3">
            <Row title="Statements" meta="April 2025" onClick={() => go("statements")} />
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
      </>,
    );
  }

  if (screen === "send") {
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
      <div className="flex flex-1 flex-col gap-4">
        <BackTitle title="Bank Details" sub="Send to a Nigerian account." onBack={back} />
        <Field label="Bank" value="Zenith Bank" onChange={() => {}} />
        <Field label="Account Number" value="2088441190" onChange={() => {}} />
        <Field label="Account Name" value="Mary Johnson" onChange={() => {}} />
        <Field label="Amount" value={amount} onChange={(v) => setAmount(v.replace(/\D/g, "").slice(0, 9))} />
        <div className="mt-auto">
          <Btn
            onClick={() => {
              const n = Number(amount || 0);
              setTx({ id: "send", title: "Money Sent", meta: "Just now · Zenith Bank", amount: -n, who: "Mary Johnson", bank: "Zenith Bank", ref: "NAK123456789" });
              go("tx");
            }}
          >
            Continue
          </Btn>
        </div>
      </div>,
    );
  }

  if (screen === "receive") {
    return frame(
      <>
        <BackTitle title="Receive Money" sub="Share your account details to receive funds faster." onBack={back} />
        <Card className="p-4">
          <p className="text-[12px] text-muted">Account</p>
          <p className="mt-1 text-[22px] font-semibold tabular-nums tracking-wide">{wallet?.accountNumber ?? "—"}</p>
          <p className="text-[13px] text-muted">{fullName} · Nakconel</p>
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
        <Btn
          onClick={() => {
            navigator.clipboard?.writeText(`Nakconel · ${fullName} · ${wallet?.accountNumber ?? ""}`).catch(() => {});
          }}
        >
          Share Details
        </Btn>
      </>,
    );
  }

  if (screen === "add") {
    const methods = [
      { id: "Account", title: "Card", meta: "Paystack. Balance updates only after it succeeds." },
      { id: "Bank", title: "Bank Transfer", meta: "1-2 business days" },
      { id: "ATM", title: "ATM Withdrawal", meta: "At partner ATMs" },
      { id: "Agent", title: "Agent", meta: "Cash out at agents" },
    ];
    return frame(
      <>
        <BackTitle title="Add Money" sub="Choose a funding method." onBack={back} />
        <div className="flex flex-col gap-2">
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
        </div>
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
              if (fund !== "Account") {
                setError("A transfer or cash drop does not credit this wallet. Only a confirmed card payment does.");
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
            {busy ? "Please wait…" : "Continue"}
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
        <div className="relative overflow-hidden rounded-[22px] p-5 text-[#f8e7c8]" style={{ background: "linear-gradient(145deg, #7a2430, #3c0609)" }}>
          <div className="flex items-center justify-between">
            <Logo size={36} />
            <span className="font-display text-[12px] tracking-[0.2em] text-[#f0d7a4]">NAKCONEL</span>
          </div>
          <p className="mt-8 text-[18px] tracking-[0.18em]">••••  ••••  ••••  4521</p>
          <div className="mt-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] tracking-widest text-[#f0d7a4]/70">CARD HOLDER</p>
              <p className="text-[14px]">{fullName}</p>
            </div>
            <p className="font-display text-[20px] italic text-[#f0d7a4]">VISA</p>
          </div>
        </div>
        <h2 className="text-[15px] font-semibold">Card Controls</h2>
        <Card className="divide-y divide-line px-4">
          {[
            ["Online Payments", online, setOnline],
            ["ATM Withdrawals", atm, setAtm],
            ["International Use", intl, setIntl],
          ].map(([label, on, set]) => (
            <div key={label as string} className="flex items-center justify-between py-3">
              <span className="text-[14px]">{label as string}</span>
              <button
                type="button"
                onClick={() => (set as (v: boolean) => void)(!(on as boolean))}
                className={`h-7 w-12 rounded-full p-1 ${on ? "bg-wine" : "bg-[#e4d5c8]"}`}
                aria-label={label as string}
              >
                <span className={`block h-5 w-5 rounded-full bg-white transition ${on ? "translate-x-5" : ""}`} />
              </button>
            </div>
          ))}
        </Card>
        <Btn onClick={() => go("statements")}>View Card Details</Btn>
      </>,
    );
  }

  if (screen === "statements") {
    return frame(
      <>
        <BackTitle title="Statements" onBack={back} />
        <Pills value={stmt} options={["Monthly", "Custom"]} onChange={setStmt} />
        <p className="text-[14px] font-semibold">{stmt === "Monthly" ? "April 2025" : "1 Apr – 24 Apr 2025"}</p>
        <Card className="space-y-3 p-4 text-[14px]">
          <p className="flex justify-between"><span className="text-muted">Opening Balance</span><span>{ngn(0)}</span></p>
          <p className="flex justify-between"><span className="text-muted">Total Credit</span><span className="text-credit">{ngn((wallet?.entries ?? []).filter((e) => e.amountKobo > 0).reduce((s, e) => s + e.amountKobo, 0) / 100)}</span></p>
          <p className="flex justify-between"><span className="text-muted">Total Debit</span><span className="text-wine">{ngn((wallet?.entries ?? []).filter((e) => e.amountKobo < 0).reduce((s, e) => s + e.amountKobo, 0) / 100)}</span></p>
          <p className="flex justify-between font-semibold"><span>Closing Balance</span><span>{balanceLabel}</span></p>
        </Card>
        <Btn>Download Statement</Btn>
      </>,
    );
  }

  if (screen === "notes") {
    const items = [
      { tag: "Transactions", title: "Money Received", meta: "Apr 26, 2025 · 10:24 AM", amount: 85000 },
      { tag: "Transactions", title: "Bill Payment", meta: "Apr 25, 2025 · 6:12 PM", amount: -5500 },
      { tag: "Security", title: "Security Alert", meta: "New login · Lagos", amount: undefined },
      { tag: "Security", title: "Account Update", meta: "Your KYC is complete", amount: undefined },
    ].filter((n) => noteTab === "All" || n.tag === noteTab);
    return frame(
      <>
        <BackTitle title="Notifications" onBack={back} />
        <Pills value={noteTab} options={["All", "Transactions", "Security"]} onChange={setNoteTab} />
        <Card className="px-3">
          {items.map((n) => (
            <Row key={n.title} title={n.title} meta={n.meta} amount={n.amount} />
          ))}
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
            <span className="block text-[13px] text-muted">+234 {phonePretty}</span>
          </span>
        </Card>
        <Card className="px-3">
          <Row title="Personal Information" meta={gender} onClick={() => go("personal")} />
          <Row title="Account Limits" meta="Daily send ₦1,000,000" />
          <Row title="Document Management" onClick={() => go("kycDoc")} />
          <Row title="KYC Status" meta="Verified" onClick={() => go("kyc")} />
        </Card>
      </>,
    );
  }

  if (screen === "security") {
    return frame(
      <>
        <BackTitle title="Security" onBack={back} />
        <Card className="px-3">
          <Row title="Change PIN" meta="Last changed Apr 2025" onClick={() => { setMode("signup"); setPin(""); go("pin"); }} />
          <Row title="Two-Factor Authentication" meta="SMS code" />
          <Row title="Active Devices" meta="This phone · 1 device" />
          <Row title="Report a Problem" onClick={() => go("ticket")} />
          <div className="flex items-center justify-between py-3">
            <span className="text-[14px] font-medium">Biometric Login</span>
            <button type="button" onClick={() => setBio((v) => !v)} className={`h-7 w-12 rounded-full p-1 ${bio ? "bg-wine" : "bg-[#e4d5c8]"}`}>
              <span className={`block h-5 w-5 rounded-full bg-white ${bio ? "translate-x-5" : ""}`} />
            </button>
          </div>
          <Row title="Privacy Settings" />
        </Card>
      </>,
    );
  }

  if (screen === "help") {
    return frame(
      <div className="flex flex-1 flex-col gap-3">
        <BackTitle title="Help & Support" sub="How can we help you?" onBack={back} />
        <label className="flex h-12 items-center gap-2 rounded-2xl border border-line bg-paper px-3">
          <Search size={16} className="text-muted" />
          <input placeholder="Search help" className="w-full bg-transparent text-[14px] outline-none" />
        </label>
        <Card className="px-3">
          <Row title="FAQs" meta="Transfers, cards, KYC" icon={<FileText size={16} />} />
          <Row title="Contact Support" meta="hello@nakconel.test" icon={<Headphones size={16} />} onClick={() => go("ticket")} />
          <Row title="Live Chat" meta="Usually replies in minutes" icon={<Sparkles size={16} />} onClick={() => go("assistant")} />
          <Row title="Merchant Problem" icon={<Building2 size={16} />} onClick={() => go("ticket")} />
        </Card>
        <div className="mt-auto">
          <Btn onClick={() => go("ticket")}>Submit</Btn>
        </div>
      </div>,
    );
  }

  if (screen === "business") {
    return frame(
      <>
        <BackTitle title="ABC Enterprises" onBack={back} />
        <Card className="px-3">
          <Row title="Client Charges" meta="Invoice · paid" amount={850000} />
          <Row title="Office Supplies" meta="Expense" amount={-120000} />
        </Card>
        <Card className="space-y-2 p-4 text-[14px]">
          <p className="flex justify-between"><span className="text-muted">From</span><span>Nigeria (NGN)</span></p>
          <p className="flex justify-between"><span className="text-muted">To</span><span>United Kingdom (GBP)</span></p>
        </Card>
        <Btn onClick={() => go("world")}>Continue</Btn>
      </>,
    );
  }

  if (screen === "world") {
    const sendN = Number(amount || 0);
    const fee = Math.round(sendN * 0.015);
    const gbp = sendN > 0 ? (sendN / 2100).toFixed(2) : "0.00";
    return frame(
      <div className="flex flex-1 flex-col gap-4">
        <BackTitle title="International Transfer" onBack={back} />
        <Card className="space-y-3 p-4 text-[14px]">
          <p className="flex justify-between"><span className="text-muted">From</span><span>Nigeria (NGN)</span></p>
          <p className="flex justify-between"><span className="text-muted">To</span><span>United Kingdom (GBP)</span></p>
        </Card>
        <Field label="Amount" value={amount} onChange={(v) => setAmount(v.replace(/\D/g, "").slice(0, 9))} placeholder="Enter amount" />
        <Card className="space-y-2 p-4 text-[14px]">
          <p className="flex justify-between"><span className="text-muted">Recipient gets</span><span className="font-semibold">£{gbp}</span></p>
          <p className="flex justify-between"><span className="text-muted">Rate</span><span>₦2,100 / GBP</span></p>
          <p className="flex justify-between"><span className="text-muted">Fee</span><span>{ngn(fee)}</span></p>
        </Card>
        <Field label="Transaction PIN" type="password" value={payPin} onChange={(v) => setPayPin(v.replace(/\D/g, "").slice(0, 4))} placeholder="4 digits" />
        {error ? <p className="text-[12px] text-wine">{error}</p> : null}
        <div className="mt-auto">
          <Btn
            onClick={() => {
              const total = sendN + fee;
              if (total < 100) {
                setError("Enter an amount of at least ₦100.");
                return;
              }
              if (payPin.length !== 4) {
                setError("Enter your 4-digit PIN.");
                return;
              }
              setBusy(true);
              void payBill({
                data: {
                  amountNaira: total,
                  pin: payPin,
                  idempotencyKey: idem.current,
                  meta: "United Kingdom",
                  counterparty: "United Kingdom",
                  bankName: "GBP",
                  service: "International Transfer",
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
        </div>
      </div>,
    );
  }

  if (screen === "assistant") {
    return frame(
      <div className="flex flex-1 flex-col">
        <BackTitle title="AI Assistant" onBack={back} />
        <div className="flex flex-col items-center pt-4 text-center">
          <Logo size={56} />
          <h2 className="mt-3 text-[18px] font-semibold">Hi {displayName.split(" ")[0]},</h2>
          <p className="text-[13px] text-muted">How can I help you today?</p>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {["Check my balance", "Spending insights", "Budget suggestion"].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() =>
                setReplies((r) => [
                  ...r,
                  q === "Check my balance"
                    ? `Your available balance is ${balanceLabel}.`
                    : q === "Spending insights"
                      ? "You sent ₦41,500 this week. Bills were the largest debit."
                      : "A ₦50,000 monthly savings transfer would keep your main wallet comfortable.",
                ])
              }
              className="rounded-2xl border border-line bg-paper px-4 py-3 text-left text-[14px]"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {replies.map((r, i) => (
            <p key={i} className="rounded-2xl bg-[#f6ebe3] px-4 py-3 text-[14px]">{r}</p>
          ))}
        </div>
        <form
          className="mt-auto flex gap-2 pt-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!ask.trim()) return;
            setReplies((r) => [...r, `Noted. I can help with “${ask.trim()}” inside Nakconel.`]);
            setAsk("");
          }}
        >
          <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Ask anything..." className="h-12 flex-1 rounded-2xl border border-line bg-paper px-4 text-[14px] outline-none" />
          <button type="submit" className="h-12 rounded-2xl bg-wine px-4 text-white" aria-label="Send">
            <Send size={16} />
          </button>
        </form>
      </div>,
    );
  }

  if (screen === "kyc") {
    return frame(
      <div className="flex flex-1 flex-col gap-4">
        <BackTitle title="Identity Verification" sub="Complete your KYC to unlock full features." onBack={back} />
        {[
          ["1", "ID Document", "Upload NIN or passport"],
          ["2", "Selfie Verification", "Take a clear photo"],
          ["3", "Address Proof", "Optional utility bill"],
        ].map(([n, t, m]) => (
          <div key={n} className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-wine text-[13px] font-semibold text-white">{n}</span>
            <span>
              <span className="block text-[14px] font-semibold">{t}</span>
              <span className="block text-[12px] text-muted">{m}</span>
            </span>
          </div>
        ))}
        <div className="mt-auto">
          <Btn onClick={() => go("kycDoc")}>Continue</Btn>
        </div>
      </div>,
    );
  }

  if (screen === "kycDoc") {
    return frame(
      <div className="flex flex-1 flex-col gap-4">
        <BackTitle title="Upload Document" sub="Select document type." onBack={back} />
        <Pills value={idType} options={["NIN Card", "Passport"]} onChange={(v) => setIdType(v === "Passport" ? "BVN" : "NIN")} />
        <label className="flex flex-1 cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-wine/40 bg-paper px-6 py-10 text-center">
          <FileText className="text-wine" />
          <p className="mt-3 text-[14px] font-semibold">{docName || "Tap to upload or select"}</p>
          <p className="mt-1 text-[12px] text-muted">Supported formats: JPG, PNG, PDF</p>
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => setDocName(e.target.files?.[0]?.name ?? "")}
          />
        </label>
        <Btn onClick={() => go("kycSelfie")}>Next</Btn>
      </div>,
    );
  }

  if (screen === "kycSelfie") {
    return frame(
      <div className="flex flex-1 flex-col">
        <BackTitle title="Selfie Verification" sub="Take a clear selfie." onBack={back} />
        <div className="mt-4 flex flex-1 flex-col items-center">
          <div className="relative h-56 w-56 overflow-hidden rounded-full bg-[#f6ebe3] ring-4 ring-[#f0d7a4]">
            <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${camOn ? "" : "hidden"}`} style={{ transform: "scaleX(-1)" }} />
            {camOn ? null : (
              <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-muted">Position your face in the circle</div>
            )}
          </div>
          <p className="mt-4 text-[13px] text-muted">Position your face in the circle</p>
        </div>
        <Btn onClick={() => go("kycDone")}>Capture</Btn>
      </div>,
    );
  }

  if (screen === "kycDone") {
    return frame(
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e5f6ec] text-credit">
          <Check size={36} />
        </span>
        <h1 className="mt-5 text-[24px] font-semibold">Verification Complete</h1>
        <p className="mt-2 max-w-[260px] text-[13px] text-muted">Your ID and selfie are complete. You can now enjoy all features.</p>
        <div className="mt-8 w-full">
          <Btn onClick={() => resetTo("home")}>Go to Dashboard</Btn>
        </div>
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
          <p className="mt-3 text-[13px] font-semibold text-credit">Success</p>
          <p className="mt-2 text-[14px] text-muted">{tx.title}</p>
          <p className="mt-1 font-display text-[32px]">{ngn(Math.abs(tx.amount))}</p>
        </div>
        <Card className="space-y-3 p-4 text-[14px]">
          <p className="flex justify-between gap-4"><span className="text-muted">To</span><span className="text-right">{tx.who}</span></p>
          <p className="flex justify-between gap-4"><span className="text-muted">Bank</span><span>{tx.bank ?? "Nakconel"}</span></p>
          <p className="flex justify-between gap-4"><span className="text-muted">Date</span><span>Apr 27, 2025 · 10:24 AM</span></p>
          <p className="flex justify-between gap-4"><span className="text-muted">Reference</span><span className="tabular-nums">{tx.ref ?? "NAK123456789"}</span></p>
        </Card>
        <div className="mt-auto flex flex-col gap-3 pt-6">
          <Btn>Share Receipt</Btn>
          <Btn tone="line">Download</Btn>
        </div>
      </div>,
    );
  }

  if (screen === "ticket") {
    return frame(
      <div className="flex flex-1 flex-col gap-4">
        <BackTitle title="Support Ticket" sub="Create a new ticket." onBack={back} />
        <Field label="Subject category" value="General inquiry" onChange={() => {}} />
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-muted">Message</span>
          <textarea placeholder="Type your message..." className="h-32 w-full rounded-2xl border border-line bg-paper p-3 text-[14px] outline-none" />
        </label>
        <div className="mt-auto">
          <Btn onClick={() => back()}>Submit</Btn>
        </div>
      </div>,
    );
  }

  if (screen === "adminKyc") {
    const rows = [
      { name: "Daniel Bello", meta: "NIN · 12345678901", tab: "Pending" },
      { name: "Mary Johnson", meta: "BVN · 22109887766", tab: "Pending" },
      { name: "Tunde Balogun", meta: "NIN · 10998877665", tab: "Approved" },
    ].filter((r) => r.tab === adminTab || adminTab === "Rejected");
    return frame(
      <>
        <BackTitle title="KYC Review" onBack={back} />
        <Pills value={adminTab} options={["Pending", "Approved", "Rejected"]} onChange={setAdminTab} />
        <Card className="px-3">
          {(adminTab === "Rejected" ? [] : rows).map((r) => (
            <Row key={r.name} title={r.name} meta={r.meta} onClick={() => setAdminTab("Approved")} />
          ))}
          {adminTab === "Rejected" ? <p className="py-6 text-center text-[13px] text-muted">No rejected reviews</p> : null}
        </Card>
      </>,
    );
  }

  if (screen === "adminTx") {
    return frame(
      <>
        <BackTitle title="Transaction Monitoring" onBack={back} />
        <Pills value={filter} options={["Alerts", "All"]} onChange={setFilter} />
        <Card className="px-3">
          <Row title="Large Transaction" meta="₦5,000,000 · Apr 26, 2025" />
          <Row title="Multiple Failed Attempts" meta="PIN · Apr 26, 2025" />
          <Row title="Unusual Location" meta="Apr 26, 2025 · 02:12 AM" />
        </Card>
      </>,
    );
  }

  if (screen === "adminReports") {
    return frame(
      <>
        <BackTitle title="Reports" onBack={back} />
        <Pills value={filter === "All" ? "Financial" : filter} options={["Financial", "Compliance", "Users"]} onChange={setFilter} />
        <Card className="px-3">
          {["User Management", "Risk & Report", "Security Host", "Audit Logs", "Configurations"].map((item) => (
            <Row key={item} title={item} icon={<Shield size={16} />} />
          ))}
        </Card>
        <Btn>Download</Btn>
      </>,
    );
  }

  const more: { title: string; meta: string; to: Screen; icon: React.ReactNode }[] = [
    { title: "Profile", meta: fullName, to: "profile", icon: <UserRound size={16} /> },
    { title: "Statements", meta: "April 2025", to: "statements", icon: <FileText size={16} /> },
    { title: "Notifications", meta: "Transfers and security", to: "notes", icon: <Bell size={16} /> },
    { title: "Beneficiaries", meta: "Saved accounts", to: "people", icon: <UserRound size={16} /> },
    { title: "Payments & Bills", meta: "Airtime, data, power", to: "bills", icon: <Zap size={16} /> },
    { title: "Business", meta: "ABC Enterprises", to: "business", icon: <Building2 size={16} /> },
    { title: "International Transfer", meta: "UK, US, Africa, GCC", to: "world", icon: <Globe2 size={16} /> },
    { title: "AI Assistant", meta: "Ask about your money", to: "assistant", icon: <Sparkles size={16} /> },
    { title: "Security", meta: "PIN, devices, biometrics", to: "security", icon: <Shield size={16} /> },
    { title: "Help & Support", meta: "FAQs and tickets", to: "help", icon: <Headphones size={16} /> },
    { title: "KYC", meta: "Identity verification", to: "kyc", icon: <Check size={16} /> },
    { title: "Admin · KYC Review", meta: "Pending applications", to: "adminKyc", icon: <Shield size={16} /> },
    { title: "Admin · Monitoring", meta: "Alerts", to: "adminTx", icon: <Shield size={16} /> },
    { title: "Admin · Reports", meta: "Financial and compliance", to: "adminReports", icon: <FileText size={16} /> },
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
      <UserButton />
    </>,
  );
}
