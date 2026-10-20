/**
 * Tourist registration.
 *
 * Consent is an explicit, unticked checkbox, not a pre-ticked box or a
 * buried link: DPDP Act 2023 requires free, specific, informed consent, and
 * the backend stores the flag and purpose on the Tourist record.
 */
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { UserPlus, TriangleAlert, ShieldCheck } from "lucide-react";
import { useAuth } from "../lib/auth";
import { set, KEYS } from "../lib/storage";
import { Button, Field, Input, Banner } from "../components/ui";
import { AuthLayout } from "./Login";

export default function Signup() {
  const { user, signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    nationality: "",
    emergency_contact: "",
  });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (user) return <Navigate to="/" replace />;

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!consent) {
      setErr("Please consent to location monitoring to continue.");
      return;
    }
    if (form.password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await signup({
        email: form.email.trim(),
        password: form.password,
        display_name: form.display_name.trim() || null,
        nationality: form.nationality.trim() || null,
        emergency_contact: form.emergency_contact.trim() || null,
        consent_given: true,
      });
      if (form.emergency_contact.trim()) {
        set(KEYS.phone, form.emergency_contact.trim());
      }
      nav("/", { replace: true });
    } catch (e) {
      setErr(e.message || "Could not create your account.");
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Takes under a minute. Travel protected."
    >
      <form onSubmit={submit} className="space-y-4">
        {err && (
          <Banner tone="rose" icon={TriangleAlert}>
            {err}
          </Banner>
        )}

        <Field label="Email">
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={upd("email")}
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field label="Password" hint="At least 6 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={upd("password")}
            placeholder="••••••••"
            required
          />
        </Field>

        <Field label="Your name">
          <Input
            value={form.display_name}
            onChange={upd("display_name")}
            placeholder="Asha Menon"
            autoComplete="name"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nationality">
            <Input
              value={form.nationality}
              onChange={upd("nationality")}
              placeholder="Indian"
            />
          </Field>
          <Field label="Emergency phone">
            <Input
              type="tel"
              inputMode="tel"
              value={form.emergency_contact}
              onChange={upd("emergency_contact")}
              placeholder="+91 98765 43210"
            />
          </Field>
        </div>

        {/* DPDP consent */}
        <div className="rounded-xl bg-blue-50 p-3.5 ring-1 ring-blue-200">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck size={15} className="text-blue-600" />
            <p className="text-[13px] font-bold text-blue-900">
              Location consent
            </p>
          </div>
          <p className="mb-3 text-[12px] leading-relaxed text-blue-900/80">
            I consent to my location being collected and processed for the
            purpose of <b>safety monitoring</b> while I travel. I understand
            raw location history is deleted after the retention period, and
            that I can stop sharing at any time from the app.
          </p>
          <label className="flex min-h-[44px] items-start gap-2.5">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-blue-300 accent-blue-600"
            />
            <span className="text-[13px] font-medium text-blue-900">
              I agree to location monitoring for safety
            </span>
          </label>
        </div>

        <Button type="submit" icon={UserPlus} full busy={busy} disabled={!consent}>
          Create account
        </Button>
      </form>

      <p className="mt-5 pb-6 text-center text-[13px] text-slate-500">
        Already registered?{" "}
        <Link to="/login" className="font-semibold text-blue-600">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
