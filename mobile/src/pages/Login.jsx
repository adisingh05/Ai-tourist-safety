import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Shield, LogIn, TriangleAlert } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Button, Field, Input, Banner } from "../components/ui";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await login(email.trim(), password);
      // The police dashboard is a separate web app; this one is tourist-only.
      if (res.role === "police") {
        setErr(
          "This is the tourist app. Officers should use the web dashboard."
        );
        setBusy(false);
        return;
      }
      nav("/", { replace: true });
    } catch (e) {
      setErr(e.message || "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to resume safety monitoring."
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </Field>
        <Button type="submit" icon={LogIn} full busy={busy}>
          Sign in
        </Button>
      </form>

      <p className="mt-5 text-center text-[13px] text-slate-500">
        New here?{" "}
        <Link to="/signup" className="font-semibold text-blue-600">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-900">
      <div className="pt-safe" />
      <div className="px-6 pb-8 pt-10 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
          <Shield size={28} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-[13px] text-slate-400">{subtitle}</p>
      </div>
      <div className="pb-safe flex-1 rounded-t-3xl bg-slate-50 px-5 pt-6">
        {children}
      </div>
    </div>
  );
}
