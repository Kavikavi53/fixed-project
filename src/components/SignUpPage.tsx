import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bus, Lock, Eye, EyeOff, Mail, Phone, MapPin,
  GraduationCap, ArrowLeft, Upload, FileText, X,
  User, Check, AlertCircle, ArrowRight, Sparkles,
  Calendar, CreditCard, Users,
  ShieldCheck
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onBack: () => void;
}

const STEP_LABELS = ["Account", "Personal Info", "Permission"];
const STEP_LABELS_TA = ["கணக்கு", "தனிப்பட்ட தகவல்", "அனுமதி"];

function FieldRow({ icon: Icon, label, children, accentColor = "#60a5fa" }: {
  icon: any; label: string; children: React.ReactNode; accentColor?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase pl-1"
        style={{ color: "rgba(147,197,253,0.42)" }}>
        <Icon className="w-3 h-3" style={{ color: accentColor, opacity: 0.7 }} />
        {label}
      </label>
      {children}
    </div>
  );
}

function StyledInput({ value, onChange, type = "text", placeholder, onFocus, onBlur, focused, rightEl, ...rest }: any) {
  return (
    <motion.div animate={{ scale: focused ? 1.012 : 1 }} transition={{ duration: 0.13 }} className="relative">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full px-4 rounded-2xl outline-none transition-all duration-200"
        style={{
          height: "50px",
          fontSize: "14px",
          fontWeight: 500,
          color: "#e2e8f0",
          background: "rgba(7,13,30,0.65)",
          border: focused ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(59,130,246,0.15)",
          boxShadow: focused ? "0 0 0 3px rgba(59,130,246,0.1)" : "none",
          paddingRight: rightEl ? "44px" : "16px",
          caretColor: "#60a5fa",
        }}
        {...rest}
      />
      {rightEl && <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightEl}</div>}
    </motion.div>
  );
}

export default function SignUpPage({ onBack }: Props) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [letterFile, setLetterFile] = useState<File | null>(null);
  const [letterPreviewUrl, setLetterPreviewUrl] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "",
    full_name: "", gender: "", address: "", dob: "", nic: "",
    school_id: "", batch: "2026", stream: "Mathematics",
    student_phone: "", parent_name: "", parent_phone: "",
  });

  const set = (key: string, value: string) => {
    setForm(p => ({ ...p, [key]: value }));
    setError("");
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { level: "empty", score: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 2) return { level: "low", score, label: "Weak — add uppercase, numbers, symbols", color: "#ef4444" };
    if (score <= 3) return { level: "medium", score, label: "Medium — almost there!", color: "#f97316" };
    return { level: "strong", score, label: "Strong ✓", color: "#22c55e" };
  };

  const pwStrength = getPasswordStrength(form.password);

  const validateStep1 = () => {
    if (!form.email || !form.password || !form.confirmPassword) { setError("All fields are required"); return false; }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError("Enter a valid email address"); return false; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return false; }
    if (pwStrength.level === "low") { setError("Password too weak — add uppercase, numbers or symbols"); return false; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return false; }
    return true;
  };

  const validateStep2 = () => {
    const req = [
      [form.full_name.trim(), "Full name is required"],
      [form.gender, "Gender is required"],
      [form.student_phone.trim(), "Student phone is required"],
      [form.nic.trim(), "NIC is required"],
      [form.dob.trim(), "Date of birth is required"],
      [form.address.trim(), "Address is required"],
      [form.school_id.trim(), "School ID is required"],
      [form.parent_name.trim(), "Parent name is required"],
      [form.parent_phone.trim(), "Parent phone is required"],
    ] as [string | boolean, string][];
    for (const [val, msg] of req) { if (!val) { setError(msg); return false; } }
    return true;
  };

  const isLetterRequired = form.batch === "2028" || form.batch === "2029";

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    if (step < 3) { handleNext(); return; }
    if (isLetterRequired && !letterFile) { setError("Parent permission letter is required for 2028/2029 batch"); return; }

    setSubmitting(true);
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: {
          data: {
            full_name: form.full_name, gender: form.gender || null,
            address: form.address || null, dob: form.dob || null,
            nic: form.nic || null, school_id: form.school_id || null,
            batch: form.batch, stream: form.stream,
            student_phone: form.student_phone,
            parent_name: form.parent_name || null,
            parent_phone: form.parent_phone || null,
          }
        }
      });
      if (authError) { setError(authError.message); setSubmitting(false); return; }
      if (!authData.user) { setError("Account creation failed. Try again."); setSubmitting(false); return; }

      if (letterFile) {
        const fileExt = letterFile.name.split(".").pop();
        const fileName = `${authData.user.id}_permission_letter.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("permission-letters").upload(fileName, letterFile, { upsert: true });
        if (!uploadError && uploadData) {
          await new Promise(r => setTimeout(r, 1500));
          await supabase.from("students").update({ permission_letter_url: uploadData.path }).eq("user_id", authData.user.id);
        }
      }

      // signup success — auto login (signOut பண்ணாம, session இருக்கும்)
      // Index.tsx onAuthStateChange → dashboard auto redirect
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    }
    setSubmitting(false);
  };

  // Auto-redirect success screen — 2s countdown then dashboard via onAuthStateChange
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 relative overflow-hidden" style={{ background: "#060d1f" }}>
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(34,197,94,0.14) 0%, transparent 65%)",
        }} />
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative z-10 w-full max-w-[340px] text-center">
          <div className="rounded-3xl overflow-hidden" style={{
            background: "rgba(13,22,48,0.8)", border: "1px solid rgba(34,197,94,0.2)",
            backdropFilter: "blur(24px)", boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
          }}>
            <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.6), transparent)" }} />
            <div className="p-8 space-y-5">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.3)" }}>
                <GraduationCap className="w-10 h-10 text-green-400" />
              </motion.div>
              <div>
                <h2 className="text-xl font-black mb-1" style={{
                  background: "linear-gradient(135deg, #fff, #86efac, #22c55e)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>Registration Successful!</h2>
                <p className="text-[12px] leading-relaxed" style={{ color: "rgba(147,197,253,0.55)" }}>
                  உங்கள் account ready! Dashboard-க்கு போகிறோம்...
                </p>
              </div>
              {/* Spinner — dashboard load ஆகும் வரை */}
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 rounded-full animate-spin"
                  style={{ borderColor: "rgba(34,197,94,0.3)", borderTopColor: "#22c55e" }} />
                <span className="text-[11px]" style={{ color: "rgba(147,197,253,0.5)" }}>
                  Loading dashboard...
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: "#060d1f" }}>
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 70% 50% at 50% 20%, rgba(29,78,216,0.16) 0%, transparent 65%)",
        }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(147,197,253,1) 1px, transparent 1px), linear-gradient(90deg, rgba(147,197,253,1) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }} />
        <div className="absolute inset-x-0 bottom-0 h-24" style={{ background: "linear-gradient(to top, #060d1f, transparent)" }} />
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2">
        <button onClick={step === 1 ? onBack : () => { setStep(step - 1); setError(""); }}
          className="flex items-center gap-1.5 transition-colors"
          style={{ color: "rgba(147,197,253,0.5)" }}>
          <ArrowLeft className="w-4 h-4" />
          <span className="text-[11px] font-semibold">{step === 1 ? "Back" : "Previous"}</span>
        </button>

        {/* Step pills */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-1">
              <div className="rounded-full transition-all duration-300 flex items-center justify-center"
                style={{
                  width: s === step ? 28 : 20,
                  height: 20,
                  background: s < step ? "rgba(34,197,94,0.25)" : s === step ? "rgba(59,130,246,0.3)" : "rgba(147,197,253,0.08)",
                  border: s < step ? "1px solid rgba(34,197,94,0.4)" : s === step ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(147,197,253,0.12)",
                }}>
                {s < step
                  ? <Check className="w-3 h-3 text-green-400" />
                  : <span className="text-[9px] font-bold" style={{ color: s === step ? "#93c5fd" : "rgba(147,197,253,0.3)" }}>{s}</span>}
              </div>
              {s < 3 && <div className="w-4 h-px" style={{ background: s < step ? "rgba(34,197,94,0.4)" : "rgba(147,197,253,0.1)" }} />}
            </div>
          ))}
        </div>

        {/* Bus icon */}
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>
          <Bus className="w-4 h-4 text-white" />
        </div>
      </motion.div>

      {/* Step label */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
        className="relative z-10 px-5 pb-3">
        <h1 className="text-[20px] font-black tracking-tight" style={{
          background: "linear-gradient(135deg, #ffffff, #93c5fd, #60a5fa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em",
        }}>
          {step === 1 ? "Create Account" : step === 2 ? "Personal Details" : "Permission Letter"}
        </h1>
        <p className="text-[11px] font-medium mt-0.5" style={{ color: "rgba(147,197,253,0.45)" }}>
          Step {step} of 3 — {STEP_LABELS[step - 1]}
        </p>
      </motion.div>

      {/* Scrollable form area */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-32">
        <AnimatePresence mode="wait">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22 }}
              className="space-y-3">

              <FieldRow icon={Mail} label="Email Address">
                <StyledInput type="email" placeholder="your@email.com" value={form.email}
                  onChange={(e: any) => set("email", e.target.value)}
                  focused={focused === "email"}
                  onFocus={() => setFocused("email")} onBlur={() => setFocused(null)} />
              </FieldRow>

              <FieldRow icon={Lock} label="Password">
                <StyledInput type={showPassword ? "text" : "password"} placeholder="Min 6 characters"
                  value={form.password} onChange={(e: any) => set("password", e.target.value)}
                  focused={focused === "pass"} onFocus={() => setFocused("pass")} onBlur={() => setFocused(null)}
                  rightEl={
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      style={{ color: "rgba(147,197,253,0.35)" }}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  } />

                {/* Password strength bar */}
                {form.password.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-1.5 px-1">
                    <div className="flex gap-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-all duration-400"
                          style={{
                            background: pwStrength.score >= i * 2
                              ? pwStrength.color
                              : "rgba(147,197,253,0.1)",
                          }} />
                      ))}
                    </div>
                    <p className="text-[10px] font-semibold" style={{ color: pwStrength.color }}>{pwStrength.label}</p>
                  </motion.div>
                )}
              </FieldRow>

              <FieldRow icon={Lock} label="Confirm Password">
                <StyledInput type={showConfirm ? "text" : "password"} placeholder="Re-enter password"
                  value={form.confirmPassword} onChange={(e: any) => set("confirmPassword", e.target.value)}
                  focused={focused === "conf"} onFocus={() => setFocused("conf")} onBlur={() => setFocused(null)}
                  rightEl={
                    <button type="button" onClick={() => setShowConfirm(s => !s)}
                      style={{ color: "rgba(147,197,253,0.35)" }}>
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  } />
                {form.confirmPassword && form.password && (
                  <p className="text-[10px] font-semibold px-1" style={{
                    color: form.password === form.confirmPassword ? "#22c55e" : "#ef4444"
                  }}>
                    {form.password === form.confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                  </p>
                )}
              </FieldRow>
            </motion.div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
              className="space-y-3">

              <FieldRow icon={User} label="Full Name">
                <StyledInput placeholder="Enter full name" value={form.full_name}
                  onChange={(e: any) => set("full_name", e.target.value)}
                  focused={focused === "name"} onFocus={() => setFocused("name")} onBlur={() => setFocused(null)} />
              </FieldRow>

              {/* Gender */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase pl-1"
                  style={{ color: "rgba(147,197,253,0.42)" }}>
                  <Users className="w-3 h-3 text-blue-400 opacity-70" />
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ val: "male", icon: "👦", label: "Male / ஆண்" }, { val: "female", icon: "👧", label: "Female / பெண்" }].map(g => (
                    <button key={g.val} type="button" onClick={() => set("gender", g.val)}
                      className="h-12 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                      style={{
                        background: form.gender === g.val ? "rgba(59,130,246,0.2)" : "rgba(7,13,30,0.65)",
                        border: form.gender === g.val ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(59,130,246,0.12)",
                        color: form.gender === g.val ? "#93c5fd" : "rgba(147,197,253,0.4)",
                        boxShadow: form.gender === g.val ? "0 0 0 3px rgba(59,130,246,0.08)" : "none",
                      }}>
                      <span>{g.icon}</span>{g.label}
                    </button>
                  ))}
                </div>
              </div>

              <FieldRow icon={Phone} label="Student Phone">
                <StyledInput type="tel" placeholder="+94 77x xxx xxxx" value={form.student_phone}
                  onChange={(e: any) => set("student_phone", e.target.value)}
                  focused={focused === "sph"} onFocus={() => setFocused("sph")} onBlur={() => setFocused(null)} />
              </FieldRow>

              <div className="grid grid-cols-2 gap-3">
                <FieldRow icon={CreditCard} label="NIC">
                  <StyledInput placeholder="NIC number" value={form.nic}
                    onChange={(e: any) => set("nic", e.target.value)}
                    focused={focused === "nic"} onFocus={() => setFocused("nic")} onBlur={() => setFocused(null)} />
                </FieldRow>
                <FieldRow icon={GraduationCap} label="School ID">
                  <StyledInput placeholder="School ID" value={form.school_id}
                    onChange={(e: any) => set("school_id", e.target.value)}
                    focused={focused === "sid"} onFocus={() => setFocused("sid")} onBlur={() => setFocused(null)} />
                </FieldRow>
              </div>

              <FieldRow icon={Calendar} label="Date of Birth">
                <StyledInput type="date" value={form.dob}
                  onChange={(e: any) => set("dob", e.target.value)}
                  focused={focused === "dob"} onFocus={() => setFocused("dob")} onBlur={() => setFocused(null)} />
              </FieldRow>

              <FieldRow icon={MapPin} label="Address">
                <StyledInput placeholder="Home address" value={form.address}
                  onChange={(e: any) => set("address", e.target.value)}
                  focused={focused === "addr"} onFocus={() => setFocused("addr")} onBlur={() => setFocused(null)} />
              </FieldRow>

              {/* Batch + Stream */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest uppercase pl-1" style={{ color: "rgba(147,197,253,0.42)" }}>Batch</label>
                  <Select value={form.batch} onValueChange={v => set("batch", v)}>
                    <SelectTrigger className="h-[50px] rounded-2xl text-sm text-white"
                      style={{ background: "rgba(7,13,30,0.65)", border: "1px solid rgba(59,130,246,0.12)" }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["2026","2027","2028","2029"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold tracking-widest uppercase pl-1" style={{ color: "rgba(147,197,253,0.42)" }}>Stream</label>
                  <Select value={form.stream} onValueChange={v => set("stream", v)}>
                    <SelectTrigger className="h-[50px] rounded-2xl text-sm text-white"
                      style={{ background: "rgba(7,13,30,0.65)", border: "1px solid rgba(59,130,246,0.12)" }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Mathematics","Bio Science","Commerce","Arts"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <FieldRow icon={User} label="Parent Name">
                <StyledInput placeholder="Parent / Guardian name" value={form.parent_name}
                  onChange={(e: any) => set("parent_name", e.target.value)}
                  focused={focused === "pnam"} onFocus={() => setFocused("pnam")} onBlur={() => setFocused(null)} />
              </FieldRow>
              <FieldRow icon={Phone} label="Parent Phone">
                <StyledInput type="tel" placeholder="+94 77x xxx xxxx" value={form.parent_phone}
                  onChange={(e: any) => set("parent_phone", e.target.value)}
                  focused={focused === "pph"} onFocus={() => setFocused("pph")} onBlur={() => setFocused(null)} />
              </FieldRow>
            </motion.div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
              className="space-y-4">

              {/* ── Model Letter Template View ── */}
              <div className="rounded-3xl overflow-hidden" style={{
                background: "rgba(13,22,48,0.78)",
                border: "1px solid rgba(59,130,246,0.18)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              }}>
                <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)" }} />
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <p className="text-xs font-bold text-white">Model Letter Template</p>
                    <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.25)" }}>
                      SAMPLE
                    </span>
                  </div>

                  {/* Letter sample image */}
                  <div className="rounded-2xl overflow-hidden" style={{
                    border: "1px solid rgba(59,130,246,0.2)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                  }}>
                    <img
                      src="/permission_letter_sample.jpg"
                      alt="Permission Letter Sample"
                      className="w-full object-contain"
                      style={{ background: "#fff", display: "block" }}
                    />
                  </div>

                  <p className="text-[9px] text-center" style={{ color: "rgba(147,197,253,0.4)" }}>
                    ↑ மேலே உள்ள format-ல் கையால் எழுதி, photo எடுத்து upload பண்ணுங்க
                  </p>
                </div>
              </div>

              {/* ── Upload Section ── */}
              <div className="rounded-3xl overflow-hidden" style={{
                background: "rgba(13,22,48,0.78)",
                border: isLetterRequired ? "1px solid rgba(59,130,246,0.25)" : "1px solid rgba(59,130,246,0.1)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              }}>
                <div className="h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)" }} />
                <div className="p-5 text-center space-y-3">
                  <div>
                    <p className="text-sm font-bold text-white">
                      உங்கள் Permission Letter Upload
                      {isLetterRequired
                        ? <span className="ml-1 text-red-400 text-xs">* Required</span>
                        : <span className="ml-1 text-blue-300/50 text-xs">(Optional)</span>}
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: "rgba(147,197,253,0.45)" }}>
                      {isLetterRequired
                        ? "2028/2029 batch-க்கு கட்டாயம் upload பண்ணணும்"
                        : "2026/2027 batch-க்கு optional — skip பண்ணலாம்"}
                    </p>
                  </div>

                  {/* Allowed formats badge */}
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {["PDF", "JPG", "PNG", "DOC"].map(fmt => (
                      <span key={fmt} className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: "rgba(34,197,94,0.1)", color: "#86efac", border: "1px solid rgba(34,197,94,0.2)" }}>
                        ✓ {fmt}
                      </span>
                    ))}
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.2)" }}>
                      ✗ MP4/GIF/Random
                    </span>
                  </div>

                  {/* File chosen — preview */}
                  {letterFile ? (
                    <div className="space-y-2">
                      {/* Image preview */}
                      {letterPreviewUrl && (letterFile.type.startsWith("image/")) && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="relative rounded-2xl overflow-hidden"
                          style={{ border: "1px solid rgba(34,197,94,0.3)", maxHeight: "200px" }}>
                          <img src={letterPreviewUrl} alt="Letter preview"
                            className="w-full object-contain"
                            style={{ maxHeight: "200px", background: "#fff" }} />
                          <div className="absolute top-2 right-2">
                            <span className="text-[9px] px-2 py-1 rounded-full font-bold"
                              style={{ background: "rgba(34,197,94,0.85)", color: "#fff" }}>
                              Preview
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {/* PDF icon preview */}
                      {letterFile.type === "application/pdf" && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-3 p-3 rounded-2xl"
                          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(239,68,68,0.15)" }}>
                            <FileText className="w-5 h-5 text-red-400" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-[11px] font-bold text-white truncate">{letterFile.name}</p>
                            <p className="text-[9px]" style={{ color: "rgba(147,197,253,0.5)" }}>
                              PDF Document • {(letterFile.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {/* File info + remove */}
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                        style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="flex-1 truncate text-[11px] font-medium text-white text-left">{letterFile.name}</span>
                        <button type="button" onClick={() => { setLetterFile(null); setLetterPreviewUrl(null); }}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;

                          // ── Fake file check ──
                          const allowed = ["application/pdf","image/jpeg","image/png","application/msword",
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
                          const allowedExt = [".pdf",".jpg",".jpeg",".png",".doc",".docx"];
                          const ext = "." + f.name.split(".").pop()?.toLowerCase();

                          if (!allowed.includes(f.type) || !allowedExt.includes(ext)) {
                            setError("❌ தவறான file வகை! PDF, JPG, PNG அல்லது DOC மட்டும் upload பண்ணுங்க.");
                            e.target.value = "";
                            return;
                          }
                          // Max 5MB
                          if (f.size > 5 * 1024 * 1024) {
                            setError("❌ File size 5MB-ஐ விட அதிகமாக இருக்கக்கூடாது.");
                            e.target.value = "";
                            return;
                          }

                          setLetterFile(f);
                          setError("");

                          // Generate preview URL for images
                          if (f.type.startsWith("image/")) {
                            const url = URL.createObjectURL(f);
                            setLetterPreviewUrl(url);
                          } else {
                            setLetterPreviewUrl(null);
                          }
                        }} />
                      <motion.div whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm"
                        style={{
                          background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                          boxShadow: "0 6px 20px rgba(59,130,246,0.3)",
                          color: "white",
                        }}>
                        <Upload className="w-4 h-4" />
                        Choose File
                      </motion.div>
                    </label>
                  )}
                </div>
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2.5 px-1">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400 opacity-50" />
                <p className="text-[10px] leading-relaxed" style={{ color: "rgba(147,197,253,0.4)" }}>
                  இந்த கடிதம் admin-ஆல் review செய்யப்படும். Account approve ஆவதற்கு முன்பு verify பண்ணப்படும்.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-20 px-5 pb-6 pt-3" style={{
        background: "linear-gradient(to top, #060d1f 70%, transparent)",
      }}>
        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl mb-3"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
              <p className="text-[11px] text-red-400 font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={submitting}
          className="relative w-full rounded-2xl font-bold text-sm text-white overflow-hidden"
          style={{
            height: "52px",
            background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
            boxShadow: "0 8px 24px rgba(59,130,246,0.35)",
            opacity: submitting ? 0.7 : 1,
          }}>
          <motion.div animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
            className="absolute inset-y-0 w-1/3 pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)", transform: "skewX(-12deg)" }} />
          <span className="relative flex items-center justify-center gap-2">
            {submitting
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account...</>
              : step < 3
                ? <>Next Step <ArrowRight className="w-4 h-4" /></>
                : <>Create Account <Sparkles className="w-4 h-4" /></>}
          </span>
        </motion.button>
      </div>
    </div>
  );
}
