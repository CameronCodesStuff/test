// Pulse App — Firebase Edition
// Uses React 18 UMD + Babel standalone + Firebase JS v12
const { useState, useEffect, useRef, useCallback } = React;

// ─── FIREBASE IMPORTS (ESM loaded via index.html module script) ─────────────────
// We pull the already-initialised SDK instances off window so this Babel/UMD
// script can use them without being an ES module itself.
let auth, db, rtdb;

// Firebase SDK helpers – loaded lazily once firebase-ready fires
let fbAuth, fbFirestore, fbDatabase;

async function loadFirebaseSDKs() {
  const [authMod, fsMod, dbMod] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js"),
    import("https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js"),
  ]);
  fbAuth     = authMod;
  fbFirestore = fsMod;
  fbDatabase  = dbMod;
  auth  = window.__firebaseAuth;
  db    = window.__firebaseDb;
  rtdb  = window.__firebaseRtdb;
}

// ─── COLOUR / INITIALS HELPERS ──────────────────────────────────────────────────
const COLORS = ["#6c6fff","#ec4899","#06b6d4","#22c55e","#f59e0b","#a78bfa","#f87171","#34d399"];
function colorFor(uid) { let h = 0; for (const c of (uid||"")) h = (h*31 + c.charCodeAt(0)) % COLORS.length; return COLORS[h]; }
function initials(name) { return (name||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)||"?"; }

// ─── FIRESTORE HELPERS ──────────────────────────────────────────────────────────
// Thin wrappers so the rest of the code reads cleanly
const col  = (...segs) => fbFirestore.collection(db, ...segs);
const doc  = (...segs) => fbFirestore.doc(db, ...segs);
const q    = (...args) => fbFirestore.query(...args);

async function getDoc(ref) {
  const snap = await fbFirestore.getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
async function getDocs(qry) {
  const snap = await fbFirestore.getDocs(qry);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function setDoc(ref, data, opts) { return fbFirestore.setDoc(ref, data, opts||{}); }
async function addDoc(ref, data)       { return fbFirestore.addDoc(ref, data); }
async function updateDoc(ref, data)    { return fbFirestore.updateDoc(ref, data); }
async function deleteDoc(ref)          { return fbFirestore.deleteDoc(ref); }
const serverTs = () => fbFirestore.serverTimestamp();
const tsToMs   = (ts) => ts?.toMillis ? ts.toMillis() : (ts ? Number(ts) : 0);

// ─── SVG ICONS ─────────────────────────────────────────────────────────────────
const Icon = {
  chat:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  friends:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  community: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  stories:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>,
  profile:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  camera:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  bell:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  search:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  edit:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  send:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  smile:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>,
  image:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  gif:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M10 8v4m0 0v4m0-4h-2.5M14 8v8m3-8h-3"/></svg>,
  mic:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  check:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  close:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  plus:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  settings:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  back:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  video:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  phone:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.6 1.31h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.07 6.07l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>,
  info:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  hash:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  flash:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  flip:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>,
  filter:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  sun:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  reply:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>,
  trash:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  userAdd:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>,
};

// ─── HELPERS ────────────────────────────────────────────────────────────────────
function fmtTime(ts) {
  if (!ts) return "";
  const d = new Date(typeof ts === "object" && ts.toMillis ? ts.toMillis() : ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000)   return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
  return d.toLocaleDateString();
}

function Spinner({ size = 32, color = "var(--accent)" }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:size, height:size, border:`3px solid ${color}33`, borderTop:`3px solid ${color}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
    </div>
  );
}

function Avatar({ profile, size = "md", showOnline = false }) {
  const sz = size === "sm" ? 36 : size === "lg" ? 72 : 46;
  if (!profile) return null;
  return (
    <div className="avatar-wrap" style={{ flexShrink:0 }}>
      <div className={`avatar ${size}`} style={{ width:sz, height:sz, fontSize:sz*0.35, background:(profile.color||"#6c6fff")+"22", color:profile.color||"#6c6fff" }}>
        {profile.initials||"?"}
      </div>
      {showOnline && profile.online && <div className="online-dot" />}
    </div>
  );
}

// ─── AUTH SCREEN ────────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode]               = useState("login");
  const [email, setEmail]             = useState("");
  const [pass, setPass]               = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [info, setInfo]               = useState("");

  const handleLogin = async () => {
    if (!email || !pass) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      await fbAuth.signInWithEmailAndPassword(auth, email, pass);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!email || !pass || !displayName) { setError("All fields are required."); return; }
    setLoading(true); setError("");
    try {
      const cred = await fbAuth.createUserWithEmailAndPassword(auth, email, pass);
      const uid  = cred.user.uid;
      const color = colorFor(uid);
      const uname = displayName.toLowerCase().replace(/\s+/g, ".") + uid.slice(0,4);
      await setDoc(doc("profiles", uid), {
        id: uid, display_name: displayName, username: uname,
        initials: initials(displayName), color, bio: "", online: true,
        last_seen: serverTs(), created_at: serverTs(),
      });
      setInfo("Account created! Welcome to Pulse.");
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!email) { setError("Enter your email first."); return; }
    setLoading(true); setError("");
    try {
      await fbAuth.sendPasswordResetEmail(auth, email);
      setInfo("Reset link sent — check your inbox.");
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="pulse-ring-wrap">
        <div className="pulse-core" />
        <div className="pulse-ring" /><div className="pulse-ring" />
        <div className="pulse-ring" /><div className="pulse-ring" />
      </div>
      <div className="auth-card-wrap">
        <span className="auth-ripple" /><span className="auth-ripple auth-ripple-2" /><span className="auth-ripple auth-ripple-3" />
        <div className="auth-card-ring">
          <div className="auth-card">
            <div className="auth-logo">
              <div className="auth-logo-mark"><img src="img/favicon.png" alt="Pulse" /></div>
              <div className="auth-logo-text">
                <div className="auth-logo-name">Pulse</div>
                <div className="auth-tagline">Connect at the speed of thought</div>
              </div>
            </div>

            {error && <div style={{ background:"#ef444422", border:"1px solid #ef4444", borderRadius:8, padding:"8px 12px", fontSize:13, color:"#ef4444", marginBottom:14 }}>{error}</div>}
            {info  && <div style={{ background:"#22c55e22", border:"1px solid #22c55e", borderRadius:8, padding:"8px 12px", fontSize:13, color:"#22c55e", marginBottom:14 }}>{info}</div>}

            {mode === "login" && <>
              <div className="form-field"><label className="form-label">Email</label><input className="form-input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></div>
              <div className="form-field"><label className="form-label">Password</label><input className="form-input" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></div>
              <div style={{ textAlign:"right", marginBottom:18 }}><span className="auth-link" style={{ fontSize:12 }} onClick={()=>{setMode("forgot");setError("");}}>Forgot password?</span></div>
              <button className="btn-full" onClick={handleLogin} disabled={loading}>{loading?"Signing in…":"Sign in to Pulse"}</button>
              <div className="auth-switch">Don't have an account?{" "}<span className="auth-link" onClick={()=>{setMode("signup");setError("");}}>Sign up</span></div>
            </>}

            {mode === "signup" && <>
              <div className="form-field"><label className="form-label">Display Name</label><input className="form-input" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your Name" /></div>
              <div className="form-field"><label className="form-label">Email</label><input className="form-input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></div>
              <div className="form-field"><label className="form-label">Password</label><input className="form-input" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Choose a strong password" /></div>
              <button className="btn-full" onClick={handleSignup} disabled={loading}>{loading?"Creating account…":"Create Account"}</button>
              <div className="auth-switch">Already on Pulse?{" "}<span className="auth-link" onClick={()=>{setMode("login");setError("");}}>Sign in</span></div>
            </>}

            {mode === "forgot" && <>
              <p style={{ color:"var(--text-2)", marginBottom:20, fontSize:13, lineHeight:1.6 }}>Enter your email and we'll send you a reset link.</p>
              <div className="form-field"><label className="form-label">Email</label><input className="form-input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></div>
              <button className="btn-full" onClick={handleForgot} disabled={loading}>{loading?"Sending…":"Send Reset Link"}</button>
              <div className="auth-switch"><span className="auth-link" onClick={()=>{setMode("login");setError("");}}>← Back to sign in</span></div>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CHAT VIEW ──────────────────────────────────────────────────────────────────
function ChatView({ conv, myProfile, onBack, isMobile, allProfiles }) {
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [showEmoji,   setShowEmoji]   = useState(false);
  const [replyTo,     setReplyTo]     = useState(null);
  const [showMsgMenu, setShowMsgMenu] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const bottomRef = useRef(null);
  const EMOJIS = ["😀","😂","❤️","🔥","👍","🎉","😍","🤯","💯","✨","🙌","😭","🤔","💪","🎨","🚀","✅","👀","😤","🥳"];

  const getProfile = useCallback(id => {
    if (id === myProfile?.id) return myProfile;
    return allProfiles.find(p => p.id === id) || { display_name:"Unknown", initials:"?", color:"#888" };
  }, [myProfile, allProfiles]);

  // Load + subscribe to messages
  useEffect(() => {
    if (!conv?.id) return;
    setLoading(true);
    const msgsRef = col("conversations", conv.id, "messages");
    const msgsQ   = q(msgsRef, fbFirestore.orderBy("created_at", "asc"), fbFirestore.limit(100));
    const unsub   = fbFirestore.onSnapshot(msgsQ, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setLoading(false);
    });
    return unsub;
  }, [conv?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const sendMsg = async () => {
    if (!input.trim() || !myProfile) return;
    const text = input.trim();
    setInput(""); setReplyTo(null); setShowEmoji(false);
    const msgsRef = col("conversations", conv.id, "messages");
    await addDoc(msgsRef, {
      conversation_id: conv.id,
      sender_id: myProfile.id,
      sender: { id:myProfile.id, display_name:myProfile.display_name, initials:myProfile.initials, color:myProfile.color },
      text,
      reply_to_id: replyTo || null,
      reactions: [],
      created_at: serverTs(),
    });
    await updateDoc(doc("conversations", conv.id), { last_message_at: serverTs() });
  };

  const addReaction = async (msgId, emoji) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = [...(msg.reactions||[])];
    const ex = reactions.find(r => r.emoji === emoji);
    if (ex) ex.count++; else reactions.push({ emoji, count:1 });
    await updateDoc(doc("conversations", conv.id, "messages", msgId), { reactions });
    setShowMsgMenu(null);
  };

  const deleteMsg = async (msgId) => {
    await deleteDoc(doc("conversations", conv.id, "messages", msgId));
    setShowMsgMenu(null);
  };

  const otherMember = conv.members?.find(m => m !== myProfile?.id);
  const otherProfile = otherMember ? getProfile(otherMember) : null;
  const convName = conv.type === "dm" ? (otherProfile?.display_name || conv.name || "Chat") : (conv.name || "Group");

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div className="chat-header">
        {isMobile && <button className="icon-btn" onClick={onBack}><Icon.back /></button>}
        {conv.type === "dm" && otherProfile ? (
          <div className="avatar-wrap" style={{ flexShrink:0 }}>
            <div className="avatar sm" style={{ width:38, height:38, fontSize:13, background:(otherProfile.color||"#6c6fff")+"22", color:otherProfile.color||"#6c6fff", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>{otherProfile.initials}</div>
            {otherProfile.online && <div className="online-dot" />}
          </div>
        ) : (
          <div style={{ width:38, height:38, borderRadius:"50%", background:"var(--accent-soft)", color:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14 }}>G</div>
        )}
        <div className="chat-header-info">
          <div className="chat-header-name">{convName}</div>
          {conv.type === "dm" && otherProfile ? (
            <div className={`chat-header-status ${otherProfile.online?"":"offline"}`}><span className="status-dot" />{otherProfile.online?"Online":"Offline"}</div>
          ) : (
            <div className="chat-header-status offline">{(conv.members?.length||2)} members</div>
          )}
        </div>
        <div className="header-actions">
          <button className="icon-btn"><Icon.phone /></button>
          <button className="icon-btn"><Icon.video /></button>
          <button className="icon-btn"><Icon.info /></button>
        </div>
      </div>

      <div className="messages-area" onClick={()=>{ setShowEmoji(false); setShowMsgMenu(null); }}>
        {loading ? <Spinner /> : <>
          <div className="msg-date-sep">Conversation</div>
          {messages.map((msg, idx) => {
            const isSent     = msg.sender_id === myProfile?.id;
            const prevMsg    = messages[idx-1];
            const nextMsg    = messages[idx+1];
            const isGroupStart = !prevMsg || prevMsg.sender_id !== msg.sender_id;
            const isGroupEnd   = !nextMsg || nextMsg.sender_id !== msg.sender_id;
            const sender = msg.sender || getProfile(msg.sender_id);
            return (
              <div key={msg.id} className={`msg-row ${isSent?"sent":""} ${isGroupStart?"group-start":""}`}>
                {!isSent && (
                  <div className={`msg-avatar ${!isGroupEnd?"invisible":""}`} style={{ background:(sender.color||"#888")+"22", color:sender.color||"#888" }}>{sender.initials||"?"}</div>
                )}
                <div className="msg-content">
                  {!isSent && isGroupStart && conv.type==="group" && <div className="msg-name">{sender.display_name}</div>}
                  {msg.reply_to_id && (
                    <div style={{ padding:"4px 10px", background:"var(--bg-hover)", borderLeft:"3px solid var(--accent)", borderRadius:"4px 10px 10px 4px", fontSize:12, color:"var(--text-3)", marginBottom:4 }}>↩ Replying to a message</div>
                  )}
                  <div className={`bubble ${isSent?"sent":"recv"}`} style={{ cursor:"context-menu" }} onContextMenu={e=>{e.preventDefault();setShowMsgMenu(msg.id);}} onDoubleClick={()=>setShowMsgMenu(msg.id)}>
                    {msg.text}
                  </div>
                  {showMsgMenu === msg.id && (
                    <div style={{ position:"relative", zIndex:50 }}>
                      <div style={{ position:"absolute", [isSent?"right":"left"]:0, top:4, background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:6, display:"flex", gap:4, boxShadow:"var(--shadow-lg)", zIndex:100 }}>
                        {["❤️","🔥","😂","👍","😮","💯"].map(e=>(
                          <span key={e} style={{ fontSize:18, cursor:"pointer", padding:"2px 4px", borderRadius:6 }} onClick={()=>addReaction(msg.id,e)}>{e}</span>
                        ))}
                        <button className="icon-btn" style={{ width:30, height:30 }} onClick={()=>{setReplyTo(msg.id);setShowMsgMenu(null);}}><Icon.reply /></button>
                        {isSent && <button className="icon-btn" style={{ width:30, height:30, color:"var(--red)" }} onClick={()=>deleteMsg(msg.id)}><Icon.trash /></button>}
                      </div>
                    </div>
                  )}
                  {msg.reactions?.length > 0 && (
                    <div className="reactions-bar">
                      {msg.reactions.map(r=>(
                        <div key={r.emoji} className="reaction-chip" onClick={()=>addReaction(msg.id,r.emoji)}>{r.emoji}<span className="reaction-count">{r.count}</span></div>
                      ))}
                    </div>
                  )}
                  {isGroupEnd && (
                    <div className="msg-meta">
                      <span className="msg-time">{fmtTime(msg.created_at)}</span>
                      {isSent && <span className="read-tick"><Icon.check /></span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </>}
      </div>

      {showEmoji && (
        <div className="emoji-picker">
          {EMOJIS.map(e=><div key={e} className="emoji-option" onClick={()=>setInput(i=>i+e)}>{e}</div>)}
        </div>
      )}
      {replyTo && (
        <div className="reply-preview">
          <Icon.reply style={{ width:14, height:14, color:"var(--accent)" }} />
          <span className="reply-preview-text">Replying to a message</span>
          <span className="reply-close" onClick={()=>setReplyTo(null)}><Icon.close /></span>
        </div>
      )}
      <div className="input-area">
        <div className="input-row">
          <textarea className="msg-input" placeholder="Message..." value={input} onChange={e=>setInput(e.target.value)} rows={1} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}} />
          <div className="input-actions">
            <button className="icon-btn" onClick={()=>setShowEmoji(v=>!v)}><Icon.smile /></button>
            <button className="icon-btn"><Icon.image /></button>
            <button className="icon-btn"><Icon.gif /></button>
            {input.trim() ? <button className="send-btn" onClick={sendMsg}><Icon.send /></button> : <button className="icon-btn" style={{ color:"var(--text-3)" }}><Icon.mic /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NEW CONVERSATION MODAL ──────────────────────────────────────────────────────
function NewConvModal({ myProfile, allProfiles, onClose, onCreated }) {
  const [search,    setSearch]    = useState("");
  const [selected,  setSelected]  = useState([]);
  const [groupName, setGroupName] = useState("");
  const [loading,   setLoading]   = useState(false);

  const filtered = allProfiles.filter(p =>
    p.id !== myProfile?.id &&
    (p.display_name.toLowerCase().includes(search.toLowerCase()) || p.username?.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = p => setSelected(prev => prev.find(s=>s.id===p.id) ? prev.filter(s=>s.id!==p.id) : [...prev, p]);

  const create = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    const type = selected.length === 1 ? "dm" : "group";
    const memberIds = [myProfile.id, ...selected.map(p=>p.id)];

    // For DM: look for existing conversation shared by both users
    if (type === "dm") {
      const otherId = selected[0].id;
      const myConvsSnap = await getDocs(q(
        col("conversations"),
        fbFirestore.where("members","array-contains", myProfile.id)
      ));
      const existing = myConvsSnap.find(c => c.type === "dm" && c.members?.includes(otherId));
      if (existing) { onCreated(existing.id); setLoading(false); return; }
    }

    const name = type === "group" ? (groupName || selected.map(p=>p.display_name).join(", ")) : null;
    const convRef = await addDoc(col("conversations"), {
      type, name, members: memberIds,
      created_by: myProfile.id, created_at: serverTs(), last_message_at: serverTs(),
    });
    onCreated(convRef.id);
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"var(--bg-elevated)", borderRadius:16, padding:24, width:"90%", maxWidth:420, maxHeight:"80vh", display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:700, fontSize:16 }}>New Conversation</div>
          <button className="icon-btn" onClick={onClose}><Icon.close /></button>
        </div>
        <div className="search-box"><Icon.search /><input placeholder="Search users..." value={search} onChange={e=>setSearch(e.target.value)} autoFocus /></div>
        {selected.length > 1 && <input className="form-input" placeholder="Group name (optional)" value={groupName} onChange={e=>setGroupName(e.target.value)} />}
        {selected.length > 0 && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {selected.map(p=>(
              <div key={p.id} style={{ display:"flex", alignItems:"center", gap:6, background:"var(--accent-soft)", borderRadius:20, padding:"4px 10px", fontSize:13 }}>
                <span style={{ color:p.color }}>{p.display_name}</span>
                <span style={{ cursor:"pointer", opacity:0.6 }} onClick={()=>toggle(p)}>×</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column", gap:4 }}>
          {filtered.map(p=>(
            <div key={p.id} onClick={()=>toggle(p)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:10, cursor:"pointer", background:selected.find(s=>s.id===p.id)?"var(--accent-soft)":"transparent", transition:"background var(--dur)" }}>
              <div className="avatar sm" style={{ width:36, height:36, fontSize:13, background:(p.color||"#888")+"22", color:p.color }}>{p.initials}</div>
              <div><div style={{ fontWeight:600, fontSize:14 }}>{p.display_name}</div><div style={{ fontSize:12, color:"var(--text-3)" }}>@{p.username}</div></div>
              {selected.find(s=>s.id===p.id) && <div style={{ marginLeft:"auto", color:"var(--accent)" }}>✓</div>}
            </div>
          ))}
          {filtered.length===0 && <div style={{ color:"var(--text-3)", textAlign:"center", padding:20, fontSize:13 }}>No users found</div>}
        </div>
        <button className="btn-full" onClick={create} disabled={selected.length===0||loading}>
          {loading?"Creating…":selected.length===1?"Open DM":`Create Group (${selected.length})`}
        </button>
      </div>
    </div>
  );
}

// ─── CHATS PANEL ────────────────────────────────────────────────────────────────
function ChatsPanel({ myProfile, activeConvId, onSelect, allProfiles }) {
  const [convs,   setConvs]   = useState([]);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!myProfile) return;
    const convsQ = q(
      col("conversations"),
      fbFirestore.where("members", "array-contains", myProfile.id)
    );
    const unsub = fbFirestore.onSnapshot(convsQ, snap => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.last_message_at?.toMillis?.() ?? (a.last_message_at ? new Date(a.last_message_at).getTime() : 0);
          const tb = b.last_message_at?.toMillis?.() ?? (b.last_message_at ? new Date(b.last_message_at).getTime() : 0);
          return tb - ta;
        });
      setConvs(sorted);
      setLoading(false);
    });
    return unsub;
  }, [myProfile?.id]);

  const getConvDisplay = conv => {
    if (conv.type === "group") return { name: conv.name||"Group", initials:"G", color:"#6c6fff" };
    const otherId = conv.members?.find(id => id !== myProfile?.id);
    const other = allProfiles.find(p=>p.id===otherId);
    return other ? { name:other.display_name, initials:other.initials, color:other.color, online:other.online } : { name:"Chat", initials:"?", color:"#888" };
  };

  const filtered = convs.filter(c => getConvDisplay(c).name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">Chats</span>
        <div className="panel-action" onClick={()=>setShowNew(true)}><Icon.edit /></div>
        <div className="panel-action" onClick={()=>setShowNew(true)}><Icon.plus /></div>
      </div>
      <div className="search-wrap"><div className="search-box"><Icon.search /><input placeholder="Search conversations..." value={search} onChange={e=>setSearch(e.target.value)} /></div></div>
      <div className="conv-list">
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <div style={{ padding:24, textAlign:"center", color:"var(--text-3)", fontSize:13 }}>
            No conversations yet.<br /><span style={{ color:"var(--accent)", cursor:"pointer" }} onClick={()=>setShowNew(true)}>Start one →</span>
          </div>
        ) : filtered.map(conv => {
          const d = getConvDisplay(conv);
          return (
            <div key={conv.id} className={`conv-item ${activeConvId===conv.id?"active":""}`} onClick={()=>onSelect(conv)}>
              {conv.type === "dm" ? (
                <div className="avatar-wrap">
                  <div className="avatar" style={{ background:(d.color||"#888")+"22", color:d.color }}>{d.initials}</div>
                  {d.online && <div className="online-dot" />}
                </div>
              ) : (
                <div style={{ width:44, height:44, borderRadius:"50%", background:"var(--accent-soft)", color:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, flexShrink:0 }}>G</div>
              )}
              <div className="conv-info">
                <div className="conv-name">{d.name}</div>
                <div className="conv-preview">{fmtTime(conv.last_message_at)}</div>
              </div>
              <div className="conv-meta"><span className="conv-time">{fmtTime(conv.last_message_at)}</span></div>
            </div>
          );
        })}
      </div>
      {showNew && (
        <NewConvModal
          myProfile={myProfile}
          allProfiles={allProfiles}
          onClose={()=>setShowNew(false)}
          onCreated={async convId => {
            setShowNew(false);
            const convDoc = await getDoc(doc("conversations", convId));
            if (convDoc) onSelect(convDoc);
          }}
        />
      )}
    </>
  );
}

// ─── FRIENDS PANEL ──────────────────────────────────────────────────────────────
function FriendsPanel({ myProfile, allProfiles, onStartChat }) {
  const [tab,         setTab]         = useState("all");
  const [search,      setSearch]      = useState("");
  const [friendships, setFriendships] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [addSearch,   setAddSearch]   = useState("");
  const [showAdd,     setShowAdd]     = useState(false);

  const loadFriendships = useCallback(async () => {
    if (!myProfile) return;
    const [asReq, asAddr] = await Promise.all([
      getDocs(q(col("friendships"), fbFirestore.where("requester_id","==",myProfile.id))),
      getDocs(q(col("friendships"), fbFirestore.where("addressee_id","==",myProfile.id))),
    ]);
    setFriendships([...asReq, ...asAddr]);
    setLoading(false);
  }, [myProfile?.id]);

  useEffect(() => { loadFriendships(); }, [loadFriendships]);

  const accepted = friendships.filter(f=>f.status==="accepted");
  const pending  = friendships.filter(f=>f.status==="pending" && f.addressee_id===myProfile?.id);
  const sent     = friendships.filter(f=>f.status==="pending" && f.requester_id===myProfile?.id);

  const getFriend = f => {
    const otherId = f.requester_id===myProfile?.id ? f.addressee_id : f.requester_id;
    return allProfiles.find(p=>p.id===otherId);
  };

  const sendRequest = async userId => {
    await addDoc(col("friendships"), { requester_id:myProfile.id, addressee_id:userId, status:"pending", created_at:serverTs() });
    loadFriendships();
    setShowAdd(false);
  };

  const respond = async (id, status) => {
    await updateDoc(doc("friendships", id), { status });
    loadFriendships();
  };

  const allFriends = accepted.map(getFriend).filter(Boolean).filter(p=>p.display_name.toLowerCase().includes(search.toLowerCase()));

  const addSearchResults = allProfiles.filter(p =>
    p.id !== myProfile?.id &&
    !accepted.find(f=>getFriend(f)?.id===p.id) &&
    !sent.find(f=>f.addressee_id===p.id) &&
    (p.display_name.toLowerCase().includes(addSearch.toLowerCase()) || p.username?.toLowerCase().includes(addSearch.toLowerCase()))
  );

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">Friends</span>
        <div className="panel-action" onClick={()=>setShowAdd(!showAdd)}><Icon.userAdd /></div>
      </div>

      {showAdd && (
        <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)" }}>
          <div className="search-box" style={{ marginBottom:8 }}><Icon.search /><input placeholder="Find people..." value={addSearch} onChange={e=>setAddSearch(e.target.value)} autoFocus /></div>
          {addSearch && addSearchResults.slice(0,5).map(p=>(
            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 4px" }}>
              <div className="avatar sm" style={{ width:34, height:34, fontSize:12, background:(p.color||"#888")+"22", color:p.color }}>{p.initials}</div>
              <div style={{ flex:1 }}><div style={{ fontWeight:600, fontSize:13 }}>{p.display_name}</div><div style={{ fontSize:11, color:"var(--text-3)" }}>@{p.username}</div></div>
              <button className="btn-sm btn-primary" onClick={()=>sendRequest(p.id)}>Add</button>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="req-banner" onClick={()=>setTab("requests")}>
          <div style={{ width:36, height:36, borderRadius:10, background:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:16 }}>👋</div>
          <div><div style={{ fontWeight:600, fontSize:13 }}>{pending.length} Friend Request{pending.length>1?"s":""}</div><div style={{ fontSize:12, color:"var(--text-2)" }}>Tap to review</div></div>
          <div style={{ marginLeft:"auto" }}><div className="unread-badge">{pending.length}</div></div>
        </div>
      )}

      <div className="tab-bar">
        {["all","online","requests"].map(t=>(
          <div key={t} className={`tab-item ${tab===t?"active":""}`} onClick={()=>setTab(t)}>
            {t==="all"?"All Friends":t==="online"?`Online (${allFriends.filter(p=>p?.online).length})`:`Requests (${pending.length})`}
          </div>
        ))}
      </div>
      <div className="search-wrap"><div className="search-box"><Icon.search /><input placeholder="Search friends..." value={search} onChange={e=>setSearch(e.target.value)} /></div></div>

      <div className="friends-grid">
        {loading ? <Spinner /> : null}
        {tab==="requests" && pending.map(f=>{
          const requester = allProfiles.find(p=>p.id===f.requester_id);
          if (!requester) return null;
          return (
            <div key={f.id} className="friend-item">
              <div className="avatar sm" style={{ background:(requester.color||"#888")+"22", color:requester.color }}>{requester.initials}</div>
              <div className="friend-info"><div className="friend-name">{requester.display_name}</div><div className="friend-status">Sent you a request</div></div>
              <div className="friend-actions">
                <button className="btn-sm btn-primary" onClick={()=>respond(f.id,"accepted")}>Accept</button>
                <button className="btn-sm btn-danger"  onClick={()=>respond(f.id,"declined")}>Decline</button>
              </div>
            </div>
          );
        })}
        {(tab==="all"?allFriends:allFriends.filter(p=>p?.online)).map(user=>{
          if (!user) return null;
          return (
            <div key={user.id} className="friend-item">
              <div className="avatar-wrap"><div className="avatar sm" style={{ background:(user.color||"#888")+"22", color:user.color }}>{user.initials}</div>{user.online&&<div className="online-dot" />}</div>
              <div className="friend-info"><div className="friend-name">{user.display_name}</div><div className={`friend-status ${user.online?"online":""}`}>{user.online?"● Online":"Offline"}</div></div>
              <div className="friend-actions"><button className="btn-sm btn-ghost" onClick={()=>onStartChat&&onStartChat(user)}>Message</button></div>
            </div>
          );
        })}
        {tab==="all" && allFriends.length===0 && !loading && (
          <div style={{ padding:24, textAlign:"center", color:"var(--text-3)", fontSize:13 }}>No friends yet.<br /><span style={{ color:"var(--accent)", cursor:"pointer" }} onClick={()=>setShowAdd(true)}>Find people →</span></div>
        )}
      </div>
    </>
  );
}

// ─── COMMUNITY VIEW ──────────────────────────────────────────────────────────────
function CommunityView({ community, myProfile }) {
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [channels,        setChannels]        = useState([]);
  const [messages,        setMessages]        = useState([]);
  const [input,           setInput]           = useState("");
  const [loadingCh,       setLoadingCh]       = useState(true);
  const [loadingMsgs,     setLoadingMsgs]     = useState(false);
  const [members,         setMembers]         = useState([]);
  const [newChanName,     setNewChanName]     = useState("");
  const [showNewChan,     setShowNewChan]     = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    setLoadingCh(true);
    const chQ = q(col("communities", community.id, "channels"), fbFirestore.orderBy("created_at","asc"));
    const unsub = fbFirestore.onSnapshot(chQ, snap => {
      const chs = snap.docs.map(d=>({ id:d.id, ...d.data() }));
      setChannels(chs);
      if (chs.length>0 && !activeChannelId) setActiveChannelId(chs[0].id);
      setLoadingCh(false);
    });
    // load members
    getDocs(q(col("community_members"), fbFirestore.where("community_id","==",community.id))).then(async mems => {
      const profiles = await Promise.all(mems.map(m=>getDoc(doc("profiles",m.user_id))));
      setMembers(profiles.filter(Boolean));
    });
    return unsub;
  }, [community.id]);

  useEffect(() => {
    if (!activeChannelId) return;
    setLoadingMsgs(true);
    const msgsQ = q(col("communities", community.id, "channels", activeChannelId, "messages"), fbFirestore.orderBy("created_at","asc"), fbFirestore.limit(100));
    const unsub = fbFirestore.onSnapshot(msgsQ, snap => {
      setMessages(snap.docs.map(d=>({ id:d.id, ...d.data() })));
      setLoadingMsgs(false);
    });
    return unsub;
  }, [activeChannelId, community.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const sendMsg = async () => {
    if (!input.trim()||!myProfile||!activeChannelId) return;
    const text = input.trim(); setInput("");
    await addDoc(col("communities", community.id, "channels", activeChannelId, "messages"), {
      sender_id: myProfile.id,
      sender: { id:myProfile.id, display_name:myProfile.display_name, initials:myProfile.initials, color:myProfile.color },
      text, created_at: serverTs(),
    });
  };

  const createChannel = async () => {
    if (!newChanName.trim()) return;
    const name = newChanName.trim().toLowerCase().replace(/\s+/g,"-");
    await addDoc(col("communities", community.id, "channels"), { name, community_id:community.id, created_at:serverTs() });
    setNewChanName(""); setShowNewChan(false);
  };

  const activeChannel = channels.find(c=>c.id===activeChannelId);
  const onlineMembers  = members.filter(m=>m.online);
  const offlineMembers = members.filter(m=>!m.online);

  return (
    <div className="community-wrap fade-in">
      <div className="channel-sidebar">
        <div className="community-header">
          <div className="community-name">{community.name}</div>
          <div className="community-members">⬤ {onlineMembers.length} online · {members.length} members</div>
        </div>
        <div className="channel-section-label">Channels</div>
        {loadingCh ? <Spinner size={20} /> : channels.map(ch=>(
          <div key={ch.id} className={`channel-item ${ch.id===activeChannelId?"active":""}`} onClick={()=>setActiveChannelId(ch.id)}>
            <span className="channel-hash">#</span><span className="channel-name">{ch.name}</span>
          </div>
        ))}
        {showNewChan ? (
          <div style={{ padding:"8px 12px", display:"flex", gap:6 }}>
            <input className="form-input" style={{ fontSize:13, padding:"6px 8px", height:"auto" }} placeholder="channel-name" value={newChanName} onChange={e=>setNewChanName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&createChannel()} autoFocus />
            <button className="icon-btn" onClick={createChannel}><Icon.check /></button>
          </div>
        ) : (
          <div className="channel-item" onClick={()=>setShowNewChan(true)} style={{ color:"var(--text-3)", fontSize:12 }}><span>+</span><span className="channel-name">Add channel</span></div>
        )}
      </div>

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div className="chat-header">
          <span style={{ fontSize:18, opacity:0.5 }}>#</span>
          <div className="chat-header-info">
            <div className="chat-header-name">{activeChannel?.name||"Select a channel"}</div>
            <div className="chat-header-status offline">{community.name}</div>
          </div>
          <div className="header-actions">
            <button className="icon-btn"><Icon.search /></button>
            <button className="icon-btn"><Icon.info /></button>
          </div>
        </div>
        <div className="messages-area">
          {loadingMsgs ? <Spinner /> : <>
            <div className="msg-date-sep">#{activeChannel?.name}</div>
            {messages.map((msg,idx)=>{
              const isSent = msg.sender_id===myProfile?.id;
              const prevMsg = messages[idx-1];
              const isGroupStart = !prevMsg||prevMsg.sender_id!==msg.sender_id;
              const sender = msg.sender||{};
              return (
                <div key={msg.id} className={`msg-row ${isSent?"sent":""} ${isGroupStart?"group-start":""}`}>
                  {!isSent && <div className="msg-avatar" style={{ background:(sender.color||"#888")+"22", color:sender.color||"#888" }}>{sender.initials||"?"}</div>}
                  <div className="msg-content">
                    {!isSent&&isGroupStart&&<div className="msg-name" style={{ color:sender.color }}>{sender.display_name}</div>}
                    <div className={`bubble ${isSent?"sent":"recv"}`}>{msg.text}</div>
                    <div className="msg-meta"><span className="msg-time">{fmtTime(msg.created_at)}</span></div>
                  </div>
                </div>
              );
            })}
          </>}
          <div ref={bottomRef} />
        </div>
        <div className="input-area">
          <div className="input-row">
            <textarea className="msg-input" placeholder={activeChannel?`Message #${activeChannel.name}`:"Select a channel"} value={input} onChange={e=>setInput(e.target.value)} rows={1} disabled={!activeChannelId} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}} />
            <div className="input-actions">
              <button className="icon-btn"><Icon.smile /></button>
              {input.trim()&&<button className="send-btn" onClick={sendMsg}><Icon.send /></button>}
            </div>
          </div>
        </div>
      </div>

      <div className="members-sidebar">
        <div className="channel-section-label" style={{ padding:"16px 14px 8px" }}>Members — {members.length}</div>
        <div className="members-list">
          {onlineMembers.length>0&&<>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--green)", textTransform:"uppercase", letterSpacing:1, padding:"0 10px 6px" }}>Online</div>
            {onlineMembers.map(m=>(
              <div key={m.id} className="member-item">
                <div className="avatar-wrap"><div className="avatar sm" style={{ width:30, height:30, fontSize:11, background:(m.color||"#888")+"22", color:m.color }}>{m.initials}</div><div className="online-dot" style={{ width:9, height:9 }} /></div>
                <div className="member-name">{m.display_name?.split(" ")[0]}</div>
              </div>
            ))}
          </>}
          {offlineMembers.length>0&&<>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:1, padding:"10px 10px 6px" }}>Offline</div>
            {offlineMembers.map(m=>(
              <div key={m.id} className="member-item" style={{ opacity:0.5 }}>
                <div className="avatar sm" style={{ width:30, height:30, fontSize:11, background:(m.color||"#888")+"22", color:m.color }}>{m.initials}</div>
                <div className="member-name">{m.display_name?.split(" ")[0]}</div>
              </div>
            ))}
          </>}
        </div>
      </div>
    </div>
  );
}

// ─── COMMUNITIES PANEL ──────────────────────────────────────────────────────────
function CommunitiesPanel({ myProfile, activeCommunity, onSelect, railMode, onToggleRail }) {
  const [communities, setCommunities] = useState([]);
  const [search,      setSearch]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [newName,     setNewName]     = useState("");
  const [newDesc,     setNewDesc]     = useState("");
  const [creating,    setCreating]    = useState(false);
  const [collapsed,   setCollapsed]   = useState({});

  const loadCommunities = useCallback(async () => {
    const comms = await getDocs(q(col("communities"), fbFirestore.orderBy("created_at","asc")));
    // also fetch channels for each
    const withChannels = await Promise.all(comms.map(async c => {
      const chs = await getDocs(q(col("communities", c.id, "channels")));
      return { ...c, channels: chs };
    }));
    setCommunities(withChannels);
    setLoading(false);
  }, []);

  useEffect(() => { loadCommunities(); }, [loadCommunities]);

  const joinCommunity = async c => {
    if (!myProfile) return;
    await setDoc(doc("community_members", `${c.id}_${myProfile.id}`), { community_id:c.id, user_id:myProfile.id, joined_at:serverTs() }, { merge:true });
    onSelect(c);
  };

  const createCommunity = async () => {
    if (!newName.trim()||!myProfile) return;
    setCreating(true);
    const commRef = await addDoc(col("communities"), { name:newName.trim(), description:newDesc.trim(), created_by:myProfile.id, member_count:1, created_at:serverTs() });
    await setDoc(doc("community_members", `${commRef.id}_${myProfile.id}`), { community_id:commRef.id, user_id:myProfile.id, role:"owner", joined_at:serverTs() });
    await addDoc(col("communities", commRef.id, "channels"), { name:"general", community_id:commRef.id, created_at:serverTs() });
    await addDoc(col("communities", commRef.id, "channels"), { name:"random",  community_id:commRef.id, created_at:serverTs() });
    await loadCommunities();
    const newComm = await getDoc(doc("communities", commRef.id));
    if (newComm) onSelect({ ...newComm, channels:[] });
    setNewName(""); setNewDesc(""); setShowCreate(false); setCreating(false);
  };

  const filtered = communities.filter(c=>c.name.toLowerCase().includes(search.toLowerCase()));

  if (railMode) {
    return (
      <div className="community-rail">
        <div className="rail-expand-btn" onClick={onToggleRail} title="Expand community list"><span style={{ display:"flex", transform:"rotate(180deg)" }}><Icon.back /></span></div>
        <div className="community-rail-list">
          {communities.map(c=>(
            <div key={c.id} className={`rail-item ${activeCommunity?.id===c.id?"active":""}`} onClick={()=>joinCommunity(c)} title={c.name}>{c.name[0]}</div>
          ))}
          <div className="rail-item rail-add" title="Add community" onClick={onToggleRail}><Icon.plus /></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="panel-header">
        <span className="panel-title">Communities</span>
        {activeCommunity&&<div className="panel-action" onClick={onToggleRail} title="Collapse"><Icon.back /></div>}
        <div className="panel-action" onClick={()=>setShowCreate(true)}><Icon.plus /></div>
      </div>
      <div className="search-wrap"><div className="search-box"><Icon.search /><input placeholder="Search communities..." value={search} onChange={e=>setSearch(e.target.value)} /></div></div>

      {showCreate && (
        <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:8 }}>
          <input className="form-input" placeholder="Community name" value={newName} onChange={e=>setNewName(e.target.value)} autoFocus />
          <input className="form-input" placeholder="Description (optional)" value={newDesc} onChange={e=>setNewDesc(e.target.value)} />
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn-sm btn-primary" style={{ flex:1 }} onClick={createCommunity} disabled={creating}>{creating?"Creating…":"Create"}</button>
            <button className="btn-sm btn-ghost" onClick={()=>setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="conv-list" style={{ padding:"6px 8px" }}>
        {loading ? <Spinner /> : filtered.map(c => {
          const isOpen   = !collapsed[c.id];
          const isActive = activeCommunity?.id===c.id;
          return (
            <div key={c.id} style={{ marginBottom:4 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:"var(--r-lg)", cursor:"pointer", background:isActive?"var(--accent-soft)":"transparent", transition:"background var(--dur) var(--ease)" }}
                onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background="var(--bg-glass-md)";}}
                onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background="transparent";}}
                onClick={()=>joinCommunity(c)}>
                <div style={{ width:36, height:36, borderRadius:11, flexShrink:0, background:"var(--accent-soft)", color:"var(--accent)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:15, border:"1px solid var(--border)" }}>{c.name[0]}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13.5, color:"var(--text-1)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize:11, color:"var(--text-3)", marginTop:1 }}>{(c.member_count||1).toLocaleString()} members</div>
                </div>
                <div onClick={e=>{e.stopPropagation();setCollapsed(prev=>({...prev,[c.id]:!prev[c.id]}));}} style={{ width:22, height:22, borderRadius:6, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-3)", background:"var(--bg-glass)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width:11, height:11, transition:"transform var(--dur)", transform:isOpen?"rotate(0deg)":"rotate(-90deg)" }}><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
              {isOpen && c.channels?.length>0 && (
                <div style={{ marginLeft:14, paddingLeft:10, borderLeft:"1px solid var(--border)", marginTop:2, marginBottom:4 }}>
                  {c.channels.map(ch=>(
                    <div key={ch.id} onClick={()=>joinCommunity(c)} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 10px", borderRadius:"var(--r-sm)", cursor:"pointer", fontSize:13, fontWeight:500, color:"var(--text-2)" }}
                      onMouseEnter={e=>{e.currentTarget.style.background="var(--bg-glass-md)";e.currentTarget.style.color="var(--text-1)";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--text-2)";}}>
                      <span style={{ fontSize:13, opacity:0.45 }}>#</span><span>{ch.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="section-label" style={{ padding:"10px 8px 8px" }}>Discover</div>
        <div style={{ background:"var(--bg-glass)", border:"1px solid var(--border)", borderRadius:"var(--r-lg)", padding:14, textAlign:"center" }}>
          <div style={{ fontSize:26, marginBottom:6 }}>🌍</div>
          <div style={{ fontWeight:600, marginBottom:3, fontSize:13 }}>Discover Communities</div>
          <div style={{ fontSize:11.5, color:"var(--text-3)", marginBottom:12, lineHeight:1.5 }}>Find communities that match your interests</div>
          <button className="btn-sm btn-primary" style={{ width:"100%", padding:"8px 0" }} onClick={()=>setShowCreate(true)}>Create a Community</button>
        </div>
      </div>
    </>
  );
}

// ─── STORIES SECTION ─────────────────────────────────────────────────────────────
function StoriesSection({ myProfile }) {
  const [stories,      setStories]      = useState([]);
  const [viewingStory, setViewingStory] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [showCreate,   setShowCreate]   = useState(false);
  const [caption,      setCaption]      = useState("");
  const [viewedIds,    setViewedIds]    = useState(new Set());

  useEffect(() => {
    const now = new Date();
    const storiesQ = q(col("stories"), fbFirestore.where("expires_at",">",(fbFirestore.Timestamp||{fromDate:d=>d}).fromDate?.(now)||now.toISOString()), fbFirestore.orderBy("expires_at","desc"));
    // fallback: just load all and filter client-side
    getDocs(col("stories")).then(async all => {
      const active = all.filter(s => {
        const exp = s.expires_at?.toMillis ? s.expires_at.toMillis() : (s.expires_at ? new Date(s.expires_at).getTime() : 0);
        return exp > Date.now();
      });
      const withProfiles = await Promise.all(active.map(async s => {
        const p = await getDoc(doc("profiles", s.user_id));
        return { ...s, profiles: p };
      }));
      setStories(withProfiles);
      setLoading(false);
    });
  }, []);

  const openStory = async story => {
    setViewingStory(story);
    if (myProfile && !viewedIds.has(story.id)) {
      await setDoc(doc("story_views", `${story.id}_${myProfile.id}`), { story_id:story.id, viewer_id:myProfile.id, viewed_at:serverTs() });
      setViewedIds(prev=>new Set([...prev,story.id]));
    }
    setTimeout(()=>setViewingStory(null), 5000);
  };

  const createStory = async () => {
    if (!caption.trim()||!myProfile) return;
    const expires = new Date(Date.now()+86400000).toISOString();
    const ref = await addDoc(col("stories"), { user_id:myProfile.id, caption:caption.trim(), color:myProfile.color, expires_at:expires, created_at:serverTs() });
    setStories(prev=>[{ id:ref.id, user_id:myProfile.id, caption:caption.trim(), color:myProfile.color, expires_at:expires, profiles:myProfile }, ...prev]);
    setCaption(""); setShowCreate(false);
  };

  const myStories    = stories.filter(s=>s.user_id===myProfile?.id);
  const friendStories = stories.filter(s=>s.user_id!==myProfile?.id);

  return (
    <div className="stories-grid fade-in">
      {viewingStory && (
        <div className="story-viewer">
          <div className="story-header">
            <div className="story-ring" style={{ background:viewingStory.color||"#6c6fff" }}>
              <div className="story-ring-inner">
                <div className="avatar sm" style={{ width:36, height:36, background:(viewingStory.color||"#6c6fff")+"33", color:viewingStory.color }}>{viewingStory.profiles?.initials||"?"}</div>
              </div>
            </div>
            <div><div className="story-header-name">{viewingStory.profiles?.display_name}</div><div className="story-header-time">{fmtTime(viewingStory.created_at)}</div></div>
            <div className="story-close" onClick={()=>setViewingStory(null)}><Icon.close /></div>
          </div>
          <div style={{ flex:1, width:"100%", maxWidth:480, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:"100%", height:"100%", background:`linear-gradient(135deg, ${viewingStory.color||"#6c6fff"}44, ${viewingStory.color||"#6c6fff"}11)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:20, padding:40 }}>
              <div style={{ fontSize:80 }}>✨</div>
              <div style={{ color:"#fff", fontSize:18, textAlign:"center", fontFamily:"var(--font-display)", fontWeight:600 }}>{viewingStory.caption}</div>
            </div>
          </div>
        </div>
      )}
      <div className="panel-header">
        <span className="panel-title">Stories</span>
        <div className="panel-action" onClick={()=>setShowCreate(true)}><Icon.camera /></div>
      </div>
      {showCreate && (
        <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", display:"flex", flexDirection:"column", gap:10 }}>
          <textarea className="form-input" placeholder="What's on your mind? ✨" value={caption} onChange={e=>setCaption(e.target.value)} rows={3} style={{ resize:"none" }} />
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn-sm btn-primary" style={{ flex:1 }} onClick={createStory}>Post Story</button>
            <button className="btn-sm btn-ghost" onClick={()=>setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}
      <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)" }}>
        <div style={{ fontWeight:600, marginBottom:12 }}>Your Story</div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ position:"relative" }}>
            <div className="avatar" style={{ background:(myProfile?.color||"#6c6fff")+"22", color:myProfile?.color||"#6c6fff", width:56, height:56, fontSize:20 }}>{myProfile?.initials||"?"}</div>
            <div style={{ position:"absolute", bottom:-2, right:-2, width:20, height:20, background:"var(--accent)", borderRadius:50, border:"2px solid var(--bg-surface)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }} onClick={()=>setShowCreate(true)}>
              <span style={{ color:"#fff", fontSize:14, lineHeight:1 }}>+</span>
            </div>
          </div>
          <div>
            <div style={{ fontWeight:600, fontSize:14 }}>{myStories.length>0?`${myStories.length} active stor${myStories.length>1?"ies":"y"}`:"Add to your story"}</div>
            <div style={{ fontSize:12, color:"var(--text-3)" }}>Visible for 24 hours</div>
          </div>
        </div>
      </div>
      <div style={{ flex:1, overflow:"auto" }}>
        {loading ? <Spinner /> : friendStories.length===0 ? (
          <div style={{ padding:24, textAlign:"center", color:"var(--text-3)", fontSize:13 }}>No stories from friends yet.</div>
        ) : <>
          <div className="section-label">Friends</div>
          {friendStories.map(story=>(
            <div key={story.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 20px", cursor:"pointer" }} onClick={()=>openStory(story)} onMouseEnter={e=>e.currentTarget.style.background="var(--bg-hover)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div className={`story-ring ${viewedIds.has(story.id)?"story-ring-seen":""}`}>
                <div className="story-ring-inner">
                  <div className="avatar sm" style={{ width:46, height:46, fontSize:16, background:(story.color||"#6c6fff")+"33", color:story.color }}>{story.profiles?.initials||"?"}</div>
                </div>
              </div>
              <div><div style={{ fontWeight:600, fontSize:14 }}>{story.profiles?.display_name}</div><div style={{ fontSize:12, color:"var(--text-3)" }}>{fmtTime(story.created_at)}</div></div>
              {!viewedIds.has(story.id)&&<div style={{ marginLeft:"auto", width:8, height:8, background:story.color||"#6c6fff", borderRadius:50 }} />}
            </div>
          ))}
        </>}
      </div>
    </div>
  );
}

// ─── PROFILE VIEW ────────────────────────────────────────────────────────────────
function ProfileView({ myProfile, onLogout, onRefreshProfile }) {
  const [editing,     setEditing]     = useState(false);
  const [displayName, setDisplayName] = useState(myProfile?.display_name||"");
  const [bio,         setBio]         = useState(myProfile?.bio||"");
  const [saving,      setSaving]      = useState(false);

  const save = async () => {
    setSaving(true);
    await updateDoc(doc("profiles", myProfile.id), { display_name:displayName, bio });
    setSaving(false); setEditing(false);
    onRefreshProfile?.();
  };

  const p = myProfile;
  if (!p) return <Spinner />;

  return (
    <div className="profile-page fade-in">
      <div className="profile-banner" />
      <div className="profile-avatar-wrap">
        <div className="avatar lg" style={{ background:(p.color||"#6c6fff")+"22", color:p.color||"#6c6fff", width:80, height:80, fontSize:28 }}>{p.initials}</div>
      </div>
      <div className="profile-body">
        {editing ? (
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
            <input className="form-input" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Display Name" />
            <textarea className="form-input" value={bio} onChange={e=>setBio(e.target.value)} placeholder="Bio" rows={3} style={{ resize:"none" }} />
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn-sm btn-primary" style={{ flex:1 }} onClick={save} disabled={saving}>{saving?"Saving…":"Save"}</button>
              <button className="btn-sm btn-ghost" onClick={()=>setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : <>
          <div className="profile-name">{p.display_name}</div>
          <div className="profile-username">@{p.username}</div>
          <div className="profile-bio">{p.bio||"No bio yet."}</div>
          <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
            <span style={{ background:"var(--accent-soft)", color:"var(--accent)", padding:"4px 10px", borderRadius:20, fontSize:12, fontWeight:500 }}>● Online</span>
          </div>
          <div className="profile-actions">
            <button className="btn-md secondary" onClick={()=>setEditing(true)}><Icon.edit /> Edit Profile</button>
          </div>
        </>}
        <div style={{ marginTop:28 }}>
          <div style={{ fontWeight:700, marginBottom:14, fontFamily:"var(--font-display)" }}>Account</div>
          {[{label:"Notifications",icon:"🔔"},{label:"Privacy & Safety",icon:"🔒"},{label:"Appearance",icon:"🎨"}].map(item=>(
            <div key={item.label} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid var(--border)", cursor:"pointer" }}>
              <span style={{ fontSize:18 }}>{item.icon}</span>
              <span style={{ fontWeight:500 }}>{item.label}</span>
              <span style={{ marginLeft:"auto", color:"var(--text-3)" }}>›</span>
            </div>
          ))}
          <div style={{ marginTop:24, textAlign:"center" }}>
            <button className="btn-sm btn-danger" style={{ padding:"10px 24px" }} onClick={onLogout}>Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CAMERA VIEW ─────────────────────────────────────────────────────────────────
function CameraView() {
  const [captured, setCaptured] = useState(false);
  return (
    <div className="camera-page">
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg, #0a0015, #0a1a2a, #001a10)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:120, opacity:0.1, filter:"blur(2px)" }}>📷</div>
      </div>
      {!captured ? (
        <>
          <div className="camera-top-actions">
            <button className="camera-action-btn"><Icon.flash /></button>
            <button className="camera-action-btn"><Icon.filter /></button>
          </div>
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%, -50%)", width:"80%", height:"60%", border:"2px solid rgba(255,255,255,0.15)", borderRadius:24 }} />
          <div className="camera-preview-overlay">
            <div style={{ color:"rgba(255,255,255,0.5)", fontSize:13, marginBottom:24, textAlign:"center" }}>Camera preview · Demo mode</div>
            <div className="camera-capture-row">
              <button className="camera-side-btn"><span style={{ fontSize:20 }}>🖼</span></button>
              <button className="capture-btn" onClick={()=>setCaptured(true)}><div className="capture-btn-inner" /></button>
              <button className="camera-action-btn"><Icon.flip /></button>
            </div>
          </div>
        </>
      ) : (
        <div style={{ position:"absolute", inset:0, background:"#000", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:24 }}>
          <div style={{ width:"80%", maxWidth:320, height:400, background:"linear-gradient(135deg, #1a0030, #003040)", borderRadius:24, display:"flex", alignItems:"center", justifyContent:"center", fontSize:80 }}>✨</div>
          <div style={{ display:"flex", gap:16 }}>
            <button style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", padding:"12px 24px", borderRadius:24, cursor:"pointer", fontWeight:600 }} onClick={()=>setCaptured(false)}>Retake</button>
            <button style={{ background:"var(--accent)", border:"none", color:"#fff", padding:"12px 24px", borderRadius:24, cursor:"pointer", fontWeight:600 }}>Send to... →</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NOTIFICATIONS PANEL ─────────────────────────────────────────────────────────
function NotifPanel({ myProfile, onClose }) {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    if (!myProfile) return;
    getDocs(q(col("notifications"), fbFirestore.where("user_id","==",myProfile.id), fbFirestore.limit(20)))
      .then(ns => setNotifs([...ns].sort((a,b) => {
        const ta = a.created_at?.toMillis?.() ?? 0;
        const tb = b.created_at?.toMillis?.() ?? 0;
        return tb - ta;
      })));
  }, [myProfile?.id]);

  const markAllRead = async () => {
    if (!myProfile) return;
    await Promise.all(notifs.filter(n=>!n.read).map(n=>updateDoc(doc("notifications",n.id),{read:true})));
    setNotifs(prev=>prev.map(n=>({...n,read:true})));
  };

  return (
    <div className="notif-panel slide-up">
      <div className="notif-header">
        Notifications
        <span style={{ fontSize:12, color:"var(--accent)", cursor:"pointer", fontWeight:500 }} onClick={markAllRead}>Mark all read</span>
      </div>
      {notifs.length===0 ? (
        <div style={{ padding:24, textAlign:"center", color:"var(--text-3)", fontSize:13 }}>You're all caught up! 🎉</div>
      ) : notifs.map(n=>(
        <div key={n.id} className="notif-item" onClick={onClose}>
          <div className="notif-icon" style={{ background:(n.color||"#6c6fff")+"22" }}><span style={{ fontSize:18 }}>{n.icon||"🔔"}</span></div>
          <div className="notif-text">
            <div className="notif-title">{n.title}</div>
            <div className="notif-desc">{n.description}</div>
            <div className="notif-time">{fmtTime(n.created_at)}</div>
          </div>
          {!n.read&&<div className="notif-unread-dot" />}
        </div>
      ))}
    </div>
  );
}

// ─── APP ROOT ────────────────────────────────────────────────────────────────────
function App() {
  const [fbReady,            setFbReady]            = useState(false);
  const [user,               setUser]               = useState(null);
  const [myProfile,          setMyProfile]          = useState(null);
  const [allProfiles,        setAllProfiles]        = useState([]);
  const [profileLoading,     setProfileLoading]     = useState(true);
  const [activeSection,      setActiveSection]      = useState("chats");
  const [activeConv,         setActiveConv]         = useState(null);
  const [activeCommunity,    setActiveCommunity]    = useState(null);
  const [communitiesExpanded,setCommunitiesExpanded]= useState(false);
  const [showNotifs,         setShowNotifs]         = useState(false);
  const [darkMode,           setDarkMode]           = useState(true);
  const [isMobile,           setIsMobile]           = useState(window.innerWidth<768);
  const [mobileShowMain,     setMobileShowMain]     = useState(false);
  const [unreadNotifs,       setUnreadNotifs]       = useState(0);

  // Wait for Firebase to be initialised by the module script in index.html
  useEffect(() => {
    if (window.__firebaseReady) {
      loadFirebaseSDKs().then(()=>setFbReady(true));
    } else {
      const handler = () => loadFirebaseSDKs().then(()=>setFbReady(true));
      window.addEventListener("firebase-ready", handler);
      return ()=>window.removeEventListener("firebase-ready", handler);
    }
  }, []);

  // Auth state
  useEffect(() => {
    if (!fbReady) return;
    const unsub = fbAuth.onAuthStateChanged(auth, u => setUser(u||null));
    return unsub;
  }, [fbReady]);

  // Load profile
  const loadProfile = useCallback(async () => {
    if (!user) { setProfileLoading(false); return; }
    const p = await getDoc(doc("profiles", user.uid));
    if (p) setMyProfile(p);
    setProfileLoading(false);
    // All other profiles (for search/DMs)
    const all = await getDocs(q(col("profiles")));
    setAllProfiles(all.filter(pr=>pr.id!==user.uid));
    // Mark online
    await updateDoc(doc("profiles", user.uid), { online:true, last_seen:serverTs() });
  }, [user?.uid]);

  useEffect(() => { if (fbReady && user) loadProfile(); else if (fbReady && !user) setProfileLoading(false); }, [fbReady, user?.uid]);

  // Mark offline on unload
  useEffect(() => {
    if (!myProfile) return;
    const go = () => { updateDoc(doc("profiles",myProfile.id),{online:false}).catch(()=>{}); };
    window.addEventListener("beforeunload", go);
    return ()=>{ window.removeEventListener("beforeunload", go); go(); };
  }, [myProfile?.id]);

  // Unread notifications
  useEffect(() => {
    if (!myProfile||!fbReady) return;
    getDocs(q(col("notifications"), fbFirestore.where("user_id","==",myProfile.id)))
      .then(ns=>setUnreadNotifs(ns.filter(n=>!n.read).length));
  }, [myProfile?.id, fbReady]);

  // Mobile resize
  useEffect(() => {
    const h = ()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize", h);
    return ()=>window.removeEventListener("resize", h);
  }, []);

  // Presence heartbeat
  useEffect(() => {
    if (!myProfile||!fbReady) return;
    const iv = setInterval(()=>updateDoc(doc("profiles",myProfile.id),{online:true,last_seen:serverTs()}).catch(()=>{}), 30000);
    return ()=>clearInterval(iv);
  }, [myProfile?.id, fbReady]);

  const handleLogout = async () => {
    if (myProfile) await updateDoc(doc("profiles",myProfile.id),{online:false}).catch(()=>{});
    await fbAuth.signOut(auth);
    setMyProfile(null); setUser(null);
  };

  const handleSelectConv = conv => {
    setActiveConv(conv); setActiveSection("chats");
    if (isMobile) setMobileShowMain(true);
  };

  const handleSelectCommunity = c => {
    setActiveCommunity(c);
    if (isMobile) setMobileShowMain(true);
  };

  const handleNavSelect = section => {
    setActiveSection(section);
    if (isMobile) setMobileShowMain(false);
    if (section!=="chats") setActiveConv(null);
    if (section!=="communities") { setActiveCommunity(null); setCommunitiesExpanded(false); }
  };

  const handleBackMobile = () => {
    setMobileShowMain(false); setActiveConv(null); setActiveCommunity(null); setCommunitiesExpanded(false);
  };

  if (!fbReady) return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="app-bg" /><Spinner size={48} />
    </div>
  );

  if (!user) return (
    <div className={darkMode?"":"light"}>
      <div className="app-bg" /><AuthScreen />
    </div>
  );

  if (profileLoading) return (
    <div className={darkMode?"":"light"} style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="app-bg" />
      <div style={{ zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
        <Spinner size={48} /><div style={{ color:"var(--text-2)", fontSize:14 }}>Loading Pulse…</div>
      </div>
    </div>
  );

  const navItems = [
    { id:"chats",       label:"Chats",     Icon:Icon.chat,      badge:0 },
    { id:"friends",     label:"Friends",   Icon:Icon.friends,   badge:0 },
    { id:"communities", label:"Hubs",      Icon:Icon.community, badge:0 },
    { id:"stories",     label:"Stories",   Icon:Icon.stories,   badge:0 },
    { id:"camera",      label:"Camera",    Icon:Icon.camera,    badge:0 },
  ];

  const renderMain = () => {
    if (activeSection==="chats") {
      if (activeConv) return <ChatView key={activeConv.id} conv={activeConv} myProfile={myProfile} onBack={handleBackMobile} isMobile={isMobile} allProfiles={allProfiles} />;
      return <div className="empty-state fade-in"><Icon.chat /><h3>Select a conversation</h3><p>Choose from your chats on the left to start messaging</p></div>;
    }
    if (activeSection==="communities") {
      if (activeCommunity) return <CommunityView community={activeCommunity} myProfile={myProfile} />;
      return <div className="empty-state fade-in"><Icon.community /><h3>Select a community</h3><p>Pick a community and channel from the left to dive in</p></div>;
    }
    if (activeSection==="stories") return <StoriesSection myProfile={myProfile} />;
    if (activeSection==="profile") return <ProfileView myProfile={myProfile} onLogout={handleLogout} onRefreshProfile={loadProfile} />;
    if (activeSection==="camera")  return <CameraView />;
    return <div className="empty-state"><p>Coming soon</p></div>;
  };

  const renderPanel = () => {
    if (activeSection==="chats") return <ChatsPanel myProfile={myProfile} activeConvId={activeConv?.id} onSelect={handleSelectConv} allProfiles={allProfiles} />;
    if (activeSection==="friends") return (
      <FriendsPanel myProfile={myProfile} allProfiles={allProfiles} onStartChat={async user => {
        const myConvsSnap = await getDocs(q(col("conversations"), fbFirestore.where("members","array-contains",myProfile.id)));
        const found = myConvsSnap.find(c=>c.type==="dm" && c.members?.includes(user.id));
        if (found) { handleSelectConv(found); handleNavSelect("chats"); }
        else {
          const ref = await addDoc(col("conversations"),{ type:"dm", members:[myProfile.id,user.id], created_by:myProfile.id, created_at:serverTs(), last_message_at:serverTs() });
          const newConv = await getDoc(doc("conversations",ref.id));
          if (newConv) { handleSelectConv(newConv); handleNavSelect("chats"); }
        }
      }} />
    );
    if (activeSection==="communities") return <CommunitiesPanel myProfile={myProfile} activeCommunity={activeCommunity} onSelect={handleSelectCommunity} railMode={!!activeCommunity&&!communitiesExpanded} onToggleRail={()=>setCommunitiesExpanded(v=>!v)} />;
    return null;
  };

  const panelSections = ["chats","friends","communities"];
  const showPanel  = panelSections.includes(activeSection);
  const noPanel    = ["stories","profile","camera"].includes(activeSection);
  const panelIsRail= activeSection==="communities"&&!!activeCommunity&&!communitiesExpanded;

  return (
    <div className={darkMode?"":"light"}>
      <div className="app-bg" />
      <div className="app">
        <nav className="sidebar-nav">
          <div className="sidebar-logo" title="Pulse"><img src="img/favicon.png" alt="Pulse" /></div>
          {navItems.map(item=>(
            <button key={item.id} className={`nav-item ${activeSection===item.id?"active":""}`} onClick={()=>handleNavSelect(item.id)} title={item.label}>
              <item.Icon /><span className="nav-label">{item.label}</span>
              {item.badge>0&&<span className="nav-badge">{item.badge}</span>}
            </button>
          ))}
          <button className={`nav-item ${activeSection==="profile"?"active":""}`} onClick={()=>handleNavSelect("profile")} title="Profile"><Icon.profile /><span className="nav-label">Profile</span></button>
          <div className="nav-spacer" />
          <div style={{ position:"relative" }}>
            <button className={`nav-item ${showNotifs?"active":""}`} onClick={()=>setShowNotifs(v=>!v)} title="Notifications">
              <Icon.bell />{unreadNotifs>0&&<span className="nav-badge">{unreadNotifs}</span>}
            </button>
            {showNotifs&&<div style={{ position:"absolute", bottom:60, left:80 }}><NotifPanel myProfile={myProfile} onClose={()=>setShowNotifs(false)} /></div>}
          </div>
          <button className="theme-toggle" onClick={()=>setDarkMode(v=>!v)} title="Toggle theme">{darkMode?<Icon.sun />:<Icon.moon />}</button>
        </nav>

        {!isMobile&&showPanel&&<div className={`panel ${panelIsRail?"panel-rail":""}`}>{renderPanel()}</div>}
        {isMobile&&showPanel&&!mobileShowMain&&<div className={`panel ${panelIsRail?"panel-rail":""}`}>{renderPanel()}</div>}
        {noPanel&&!isMobile&&<div className="main fade-in">{renderMain()}</div>}
        {!isMobile&&showPanel&&<div className="main">{renderMain()}</div>}
        {isMobile&&mobileShowMain&&<div className="main fade-in">{renderMain()}</div>}

        <nav className="mobile-nav">
          {navItems.map(item=>(
            <button key={item.id} className={`mobile-nav-item ${activeSection===item.id?"active":""}`} onClick={()=>handleNavSelect(item.id)}>
              <div style={{ position:"relative" }}><item.Icon />{item.badge>0&&<span className="mobile-nav-badge">{item.badge}</span>}</div>
              <span>{item.label}</span>
            </button>
          ))}
          <button className={`mobile-nav-item ${activeSection==="profile"?"active":""}`} onClick={()=>handleNavSelect("profile")}><Icon.profile /><span>Profile</span></button>
        </nav>
      </div>
    </div>
  );
}

// Mount — wait for Firebase SDK to be ready before rendering
function waitForFirebase(cb) {
  if (window.__firebaseReady) cb();
  else window.addEventListener("firebase-ready", cb, { once:true });
}
waitForFirebase(() => {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(React.createElement(App));
});
