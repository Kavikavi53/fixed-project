import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, User, Lock, Eye, EyeOff, Mail, Phone, MapPin, GraduationCap, ArrowLeft, Upload, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onBack: () => void;
}

export default function SignUpPage({ onBack }: Props) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [letterFile, setLetterFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    address: "",
    dob: "",
    nic: "",
    school_id: "",
    batch: "2026",
    stream: "Mathematics",
    student_phone: "",
    parent_name: "",
    parent_phone: "",
  });

  const set = (key: string, value: string) => {
    setForm(p => ({ ...p, [key]: value }));
    setError("");
  };

  const getPasswordStrength = (pwd: string): { level: "low" | "medium" | "strong"; score: number } => {
    if (!pwd) return { level: "low", score: 0 };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 2) return { level: "low", score };
    if (score <= 3) return { level: "medium", score };
    return { level: "strong", score };
  };

  const passwordStrength = getPasswordStrength(form.password);

  const validateStep1 = () => {
    if (!form.email || !form.password || !form.confirmPassword) {
      setError("All fields are required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError("Please enter a valid email");
      return false;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (passwordStrength.level === "low") {
      setError("Password is too weak. Please use a stronger password.");
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!form.full_name.trim()) { setError("Full name is required"); return false; }
    if (!form.student_phone.trim()) { setError("Student phone is required"); return false; }
    if (!form.nic.trim()) { setError("NIC is required"); return false; }
    if (!form.dob.trim()) { setError("Date of Birth is required"); return false; }
    if (!form.address.trim()) { setError("Address is required"); return false; }
    if (!form.school_id.trim()) { setError("School ID is required"); return false; }
    if (!form.parent_name.trim()) { setError("Parent name is required"); return false; }
    if (!form.parent_phone.trim()) { setError("Parent phone is required"); return false; }
    return true;
  };

  const isLetterRequired = form.batch === "2028" || form.batch === "2029";

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) { handleNext(); return; }
    if (isLetterRequired && !letterFile) {
      setError("Parent permission letter is required for 2028/2029 batch");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Sign up with all form data in metadata — trigger will create student record
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.full_name,
            address: form.address || null,
            dob: form.dob || null,
            nic: form.nic || null,
            school_id: form.school_id || null,
            batch: form.batch,
            stream: form.stream,
            student_phone: form.student_phone,
            parent_name: form.parent_name || null,
            parent_phone: form.parent_phone || null,
          }
        }
      });

      if (authError) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }

      if (!authData.user) {
        setError("Account creation failed. Try again.");
        setSubmitting(false);
        return;
      }

      // 2. Upload permission letter to Supabase storage
      const fileExt = letterFile.name.split(".").pop();
      const fileName = `${authData.user.id}_permission_letter.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("permission-letters")
        .upload(fileName, letterFile, { upsert: true });

      if (uploadError) {
        console.error("Letter upload error:", uploadError);
      } else {
        // 3. Save letter URL to student record
        const { data: { publicUrl } } = supabase.storage
          .from("permission-letters")
          .getPublicUrl(fileName);

        // Wait briefly for trigger to create student record
        await new Promise(r => setTimeout(r, 1500));

        await supabase
          .from("students")
          .update({ permission_letter_url: uploadData.path })
          .eq("user_id", authData.user.id);
      }

      // 4. Sign out — trigger already created student record
      await supabase.auth.signOut();
      setSuccess(true);
      setSubmitting(false);

    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="glass-card rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <GraduationCap className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Registration Successful!</h2>
            <p className="text-sm text-muted-foreground">Your student account has been created. You can now sign in.</p>
            <Button onClick={onBack} className="w-full gradient-primary text-primary-foreground">Go to Sign In</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 space-y-5">
          <div className="flex items-center gap-3">
            <button onClick={step === 1 ? onBack : () => setStep(step - 1)} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Student Registration</h1>
              <p className="text-xs text-muted-foreground">Step {step} of 3 — {step === 1 ? "Account" : step === 2 ? "Personal Info" : "Permission Letter"}</p>
            </div>
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Bus className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>

          <div className="flex gap-2">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-secondary"}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-secondary"}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 3 ? "bg-primary" : "bg-secondary"}`} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" placeholder="Email address *" value={form.email} onChange={e => set("email", e.target.value)} className="pl-10 h-11 bg-secondary" />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type={showPassword ? "text" : "password"} placeholder="Password *" value={form.password} onChange={e => set("password", e.target.value)} className="pl-10 pr-10 h-11 bg-secondary" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.password.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        <div className={`h-1.5 flex-1 rounded-full transition-all ${passwordStrength.level === "low" ? "bg-destructive" : passwordStrength.level === "medium" ? "bg-orange-500" : "bg-green-600"}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-all ${passwordStrength.level === "medium" ? "bg-orange-500" : passwordStrength.level === "strong" ? "bg-green-600" : "bg-secondary"}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-all ${passwordStrength.level === "strong" ? "bg-green-600" : "bg-secondary"}`} />
                      </div>
                      <p className={`text-xs font-semibold ${passwordStrength.level === "low" ? "text-destructive" : passwordStrength.level === "medium" ? "text-orange-600" : "text-green-600"}`}>
                        {passwordStrength.level === "low" ? "⚠ Low — uppercase, numbers, symbols சேர்க்கவும்" : passwordStrength.level === "medium" ? "◑ Medium — இன்னும் strong பண்ணலாம்" : "✓ Strong"}
                      </p>
                    </div>
                  )}
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="password" placeholder="Confirm password *" value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} className="pl-10 h-11 bg-secondary" />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Full Name *" value={form.full_name} onChange={e => set("full_name", e.target.value)} className="pl-10 h-11 bg-secondary" />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Student Phone *" value={form.student_phone} onChange={e => set("student_phone", e.target.value)} className="pl-10 h-11 bg-secondary" />
                  </div>
                  <Input placeholder="NIC *" value={form.nic} onChange={e => set("nic", e.target.value)} className="h-11 bg-secondary" />
                  <Input placeholder="School ID *" value={form.school_id} onChange={e => set("school_id", e.target.value)} className="h-11 bg-secondary" />
                  <Input type="date" placeholder="Date of Birth *" value={form.dob} onChange={e => set("dob", e.target.value)} className="h-11 bg-secondary" />
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Address *" value={form.address} onChange={e => set("address", e.target.value)} className="pl-10 h-11 bg-secondary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={form.batch} onValueChange={v => set("batch", v)}>
                      <SelectTrigger className="h-11 bg-secondary"><SelectValue placeholder="Batch" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2026">2026</SelectItem>
                        <SelectItem value="2027">2027</SelectItem>
                        <SelectItem value="2028">2028</SelectItem>
                        <SelectItem value="2029">2029</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={form.stream} onValueChange={v => set("stream", v)}>
                      <SelectTrigger className="h-11 bg-secondary"><SelectValue placeholder="Stream" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="Bio Science">Bio Science</SelectItem>
                        <SelectItem value="Commerce">Commerce</SelectItem>
                        <SelectItem value="Arts">Arts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input placeholder="Parent Name *" value={form.parent_name} onChange={e => set("parent_name", e.target.value)} className="h-11 bg-secondary" />
                  <Input placeholder="Parent Phone *" value={form.parent_phone} onChange={e => set("parent_phone", e.target.value)} className="h-11 bg-secondary" />
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className={`rounded-xl border-2 border-dashed p-5 text-center space-y-3 ${isLetterRequired ? "border-primary/50" : "border-border"}`}>
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <FileText className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Parent Permission Letter {isLetterRequired ? <span className="text-destructive">*</span> : <span className="text-muted-foreground text-xs">(Optional)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {isLetterRequired
                          ? "2028/2029 batch-க்கு letter கட்டாயம். PDF, JPG, PNG upload பண்ணுங்க."
                          : "2026/2027 batch-க்கு letter optional. Skip பண்ணலாம்."}
                      </p>
                    </div>

                    {letterFile ? (
                      <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="flex-1 truncate text-foreground text-left">{letterFile.name}</span>
                        <button type="button" onClick={() => setLetterFile(null)} className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) { setLetterFile(file); setError(""); }
                          }}
                        />
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors">
                          <Upload className="w-4 h-4" />
                          Choose File
                        </div>
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    * This letter will be reviewed by the admin before your account is fully approved.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-sm text-destructive">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <Button type="submit" disabled={submitting} className="w-full h-11 gradient-primary text-primary-foreground font-semibold">
              {submitting ? "Creating account..." : step < 3 ? "Next →" : "Create Account"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            A/L Students Only — Akkarayan Maha Vidiyalayam
          </p>
        </div>
      </motion.div>
    </div>
  );
}