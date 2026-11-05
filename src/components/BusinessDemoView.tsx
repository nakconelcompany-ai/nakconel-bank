'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
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
} from '@/domains/business/demo';

type Props = { onBack: () => void };
type Section = 'overview' | 'invoices' | 'links' | 'expenses' | 'team';
type Role = 'Admin' | 'Finance' | 'Viewer';

const fieldClass = 'input';
const fieldStyle = { marginTop: 10 };
const currency = (amount: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
}).format(amount);

export default function BusinessDemoView({ onBack }: Props) {
  const [business, setBusiness] = useState<DemoBusiness>(createDemoBusiness);
  const [section, setSection] = useState<Section>('overview');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkAmount, setLinkAmount] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Supplies');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [role, setRole] = useState<Role>('Viewer');
  const [error, setError] = useState('');
  const totals = getDemoBusinessSummary(business);
  const tabs: { id: Section; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'links', label: 'Payment links' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'team', label: 'Team' },
  ];

  function apply(update: (current: DemoBusiness) => DemoBusiness) {
    try {
      setBusiness(update(business));
      setError('');
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update demo data.');
      return false;
    }
  }

  function id() {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function submit(event: FormEvent<HTMLFormElement>, update: (current: DemoBusiness) => DemoBusiness) {
    event.preventDefault();
    return apply(update);
  }

  function card(content: ReactNode, key?: string) {
    return <section key={key} className="glass demo-record-card" style={{ padding: 15, marginBottom: 11 }}>{content}</section>;
  }

  return (
    <div className="demo-screen" style={{ paddingBottom: 28 }}>
      <div className="demo-heading">
        <div>
          <p className="demo-eyebrow">NAKCONEL BUSINESS</p>
          <h1 className="page-title" style={{ marginBottom: 3 }}>Business workspace</h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>{business.name}</p>
        </div>
        <button type="button" className="btn-ghost" onClick={onBack}>← Back</button>
      </div>
      <div role="status" className="demo-banner">
        <strong>DEMO ENVIRONMENT</strong>
        <p>Sample records only. Nothing is saved, charged, or settled. Changes reset when you leave.</p>
      </div>
      <div className="demo-tabs" role="tablist" aria-label="Business workspace sections">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={section === tab.id} className={`${section === tab.id ? 'btn-gold' : 'btn-ghost'} demo-tab`} onClick={() => { setSection(tab.id); setError(''); }}>
            {tab.label}
          </button>
        ))}
      </div>
      {error ? <p role="alert" style={{ color: '#ef7a7a', fontSize: 13, marginBottom: 12 }}>{error}</p> : null}

      {section === 'overview' ? (
        <>
          <div className="demo-metrics">
            {[
              ['Collected (demo)', totals.collectedNaira],
              ['Outstanding', totals.outstandingNaira],
              ['Expenses', totals.expensesNaira],
              ['Net activity (demo)', totals.netDemoNaira],
            ].map(([label, amount]) => (
              <section className="demo-metric" key={String(label)}>
                <p className="demo-metric-label">{label}</p>
                <p className="demo-metric-value">{currency(Number(amount))}</p>
              </section>
            ))}
          </div>
          <section className="glass demo-overview-note">
            <p className="demo-card-title">Workspace snapshot</p>
            <p>{totals.invoiceCount} invoices <span>·</span> {totals.activeLinkCount} active links <span>·</span> {business.team.length} team members</p>
          </section>
        </>
      ) : null}

      {section === 'invoices' ? (
        <>
          {card(<><h2 className="demo-card-title">Create invoice</h2><form onSubmit={(event) => {
            if (submit(event, (current) => addDemoInvoice(current, { id: id(), client, description, amountNaira: Number(invoiceAmount), createdAt: new Date().toISOString() }))) {
              setClient(''); setDescription(''); setInvoiceAmount('');
            }
          }}>
            <input required aria-label="Client" className={fieldClass} placeholder="Client name" value={client} onChange={(event) => setClient(event.target.value)} style={fieldStyle} />
            <input required aria-label="Description" className={fieldClass} placeholder="What are you billing for?" value={description} onChange={(event) => setDescription(event.target.value)} style={fieldStyle} />
            <input required aria-label="Amount (NGN)" type="number" min="1" step="1" className={fieldClass} placeholder="Amount (NGN)" value={invoiceAmount} onChange={(event) => setInvoiceAmount(event.target.value)} style={fieldStyle} />
            <button type="submit" className="btn-gold" style={{ marginTop: 12, padding: 12, fontSize: 13 }}>Save draft</button>
          </form></>)}
          {business.invoices.map((invoice) => card(<><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><p style={{ fontWeight: 600 }}>{invoice.client}</p><p style={{ color: 'rgba(247,236,212,0.55)', fontSize: 12, marginTop: 4 }}>{invoice.description} · {invoice.status}</p></div><strong style={{ color: '#f0d78c', whiteSpace: 'nowrap' }}>{currency(invoice.amountNaira)}</strong></div>
            {invoice.status === 'Draft' ? <button type="button" className="btn-ghost" onClick={() => apply((current) => markDemoInvoiceSent(current, invoice.id))} style={{ marginTop: 12 }}>Mark sent (demo)</button> : null}
            {invoice.status === 'Sent' ? <button type="button" className="btn-ghost" onClick={() => apply((current) => simulateDemoInvoicePayment(current, invoice.id))} style={{ marginTop: 12 }}>Simulate paid</button> : null}
          </>, invoice.id))}
        </>
      ) : null}

      {section === 'links' ? (
        <>
          {card(<><h2 className="demo-card-title">Create payment link</h2><form onSubmit={(event) => {
            if (submit(event, (current) => addDemoPaymentLink(current, { id: id(), title: linkTitle, amountNaira: Number(linkAmount), createdAt: new Date().toISOString() }))) {
              setLinkTitle(''); setLinkAmount('');
            }
          }}>
            <input required aria-label="Link description" className={fieldClass} placeholder="Link description" value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} style={fieldStyle} />
            <input required aria-label="Amount (NGN)" type="number" min="1" step="1" className={fieldClass} placeholder="Amount (NGN)" value={linkAmount} onChange={(event) => setLinkAmount(event.target.value)} style={fieldStyle} />
            <button type="submit" className="btn-gold" style={{ marginTop: 12, padding: 12, fontSize: 13 }}>Create demo link</button>
          </form></>)}
          {business.paymentLinks.map((link) => card(<><p style={{ fontWeight: 600 }}>{link.title}</p><p style={{ color: 'rgba(247,236,212,0.55)', fontSize: 12, marginTop: 4 }}>nakconel.demo/{link.id} · {link.status}</p><strong style={{ color: '#f0d78c', display: 'block', marginTop: 8 }}>{currency(link.amountNaira)}</strong>{link.status === 'Active' ? <button type="button" className="btn-ghost" onClick={() => apply((current) => simulateDemoLinkPayment(current, link.id))} style={{ marginTop: 12 }}>Simulate payment</button> : null}</>, link.id))}
        </>
      ) : null}

      {section === 'expenses' ? (
        <>
          {card(<><h2 className="demo-card-title">Record expense</h2><form onSubmit={(event) => {
            if (submit(event, (current) => addDemoExpense(current, { id: id(), merchant: expenseName, category: expenseCategory, amountNaira: Number(expenseAmount), createdAt: new Date().toISOString() }))) {
              setExpenseName(''); setExpenseAmount('');
            }
          }}>
            <input required aria-label="Merchant or description" className={fieldClass} placeholder="Merchant or description" value={expenseName} onChange={(event) => setExpenseName(event.target.value)} style={fieldStyle} />
            <input required aria-label="Category" className={fieldClass} placeholder="Category" value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)} style={fieldStyle} />
            <input required aria-label="Amount (NGN)" type="number" min="1" step="1" className={fieldClass} placeholder="Amount (NGN)" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} style={fieldStyle} />
            <button type="submit" className="btn-gold" style={{ marginTop: 12, padding: 12, fontSize: 13 }}>Add demo expense</button>
          </form></>)}
          {business.expenses.map((expense) => card(<div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><p style={{ fontWeight: 600 }}>{expense.merchant}</p><p style={{ color: 'rgba(247,236,212,0.55)', fontSize: 12, marginTop: 4 }}>{expense.category} · demo record</p></div><strong style={{ color: '#f0d78c', whiteSpace: 'nowrap' }}>−{currency(expense.amountNaira)}</strong></div>, expense.id))}
        </>
      ) : null}

      {section === 'team' ? (
        <>
          {card(<><h2 className="demo-card-title">Add a demo teammate</h2><form onSubmit={(event) => {
            if (submit(event, (current) => addDemoTeamMember(current, { id: id(), name: memberName, email: memberEmail, role }))) {
              setMemberName(''); setMemberEmail('');
            }
          }}>
            <input required aria-label="Name" className={fieldClass} placeholder="Name" value={memberName} onChange={(event) => setMemberName(event.target.value)} style={fieldStyle} />
            <input required aria-label="Email" type="email" className={fieldClass} placeholder="Email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} style={fieldStyle} />
            <select aria-label="Role" className={fieldClass} value={role} onChange={(event) => {
              const value = event.target.value;
              if (value === 'Admin' || value === 'Finance' || value === 'Viewer') setRole(value);
            }} style={fieldStyle}><option value="Viewer">Viewer</option><option value="Finance">Finance</option><option value="Admin">Admin</option></select>
            <button type="submit" className="btn-gold" style={{ marginTop: 12, padding: 12, fontSize: 13 }}>Add demo teammate</button>
          </form></>)}
          {business.team.map((member) => card(<><p style={{ fontWeight: 600 }}>{member.name}</p><p style={{ color: 'rgba(247,236,212,0.55)', fontSize: 12, marginTop: 4 }}>{member.email} · {member.role} · demo</p></>, member.id))}
        </>
      ) : null}
    </div>
  );
}
