'use client';
import { useState } from 'react';

export default function AdminLoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr]           = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { setErr(json.error ?? 'Login failed'); return; }
      window.location.assign('/admin');
    } catch {
      setErr('Could not connect. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#3e0c11,#651719)', fontFamily:'system-ui,sans-serif', padding:20 }}>
      <div style={{ width:'100%', maxWidth:400, background:'#fffdf8', borderRadius:20, padding:'36px 28px', border:'1px solid #e9dfd0', boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontFamily:'Georgia,serif', fontSize:22, letterSpacing:'.14em', color:'#651719', fontWeight:700 }}>NAKCONEL</div>
          <div style={{ fontFamily:'Georgia,serif', fontSize:9, letterSpacing:'.36em', color:'#82736b', marginTop:2 }}>BANK</div>
          <div style={{ marginTop:12, fontSize:13, fontWeight:700, color:'#271817' }}>Admin Portal</div>
          <div style={{ fontSize:11, color:'#82736b', marginTop:2 }}>Staff & admin access only</div>
        </div>

        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'#73655c', marginBottom:6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ display:'block', width:'100%', padding:'13px 14px', borderRadius:11, border:'1.5px solid #ded2c1', background:'#fffefa', color:'#271817', fontSize:15, fontFamily:'inherit', outline:'none' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', color:'#73655c', marginBottom:6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus
              style={{ display:'block', width:'100%', padding:'13px 14px', borderRadius:11, border:'1.5px solid #ded2c1', background:'#fffefa', color:'#271817', fontSize:15, fontFamily:'inherit', outline:'none' }} />
          </div>
          {err && <p style={{ color:'#b94542', fontSize:13, margin:0 }}>{err}</p>}
          <button type="submit" disabled={loading}
            style={{ padding:'15px', borderRadius:12, background:'linear-gradient(135deg,#792124,#651719)', color:'#fff9eb', border:'none', fontWeight:700, fontSize:15, cursor:'pointer', opacity: loading ? .6 : 1, fontFamily:'inherit' }}>
            {loading ? 'Signing in…' : 'Sign in to Admin'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:12, color:'#82736b' }}>
          <a href="/" style={{ color:'#651719', textDecoration:'none' }}>← Back to Nakconel Bank</a>
        </p>
      </div>
    </div>
  );
}
