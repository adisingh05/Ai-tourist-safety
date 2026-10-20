/** Account, tracking preferences, privacy (DPDP) and sign-out. */
import { useState } from "react";
import {
  User,
  Gauge,
  ShieldCheck,
  LogOut,
  Phone,
  Trash2,
  Server,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useTracking, DEFAULT_SETTINGS } from "../lib/tracking";
import { API_BASE } from "../lib/api";
import { getSync, set, KEYS } from "../lib/storage";
import * as queue from "../lib/queue";
import { Card, Button, Field, Input, Banner, Chip } from "../components/ui";

const INTERVALS = [
  [10, "10s", "Highest accuracy, heaviest battery"],
  [20, "20s", "Recommended"],
  [60, "1 min", "Battery saver"],
  [180, "3 min", "Minimal"],
];

export default function Settings() {
  const { user, logout } = useAuth();
  const { settings, updateSettings, queued, tracking, stop } = useTracking();
  const [phone, setPhone] = useState(() => getSync(KEYS.phone, ""));
  const [saved, setSaved] = useState(null);

  function savePhone() {
    set(KEYS.phone, phone.trim());
    setSaved("Emergency number saved on this device.");
    setTimeout(() => setSaved(null), 4000);
  }

  function clearQueue() {
    queue.clear();
    setSaved("Saved locations cleared from this device.");
    setTimeout(() => setSaved(null), 4000);
  }

  function signOut() {
    if (tracking) stop();
    logout();
  }

  return (
    <div className="space-y-3.5 p-4">
      {saved && (
        <Banner tone="emerald" icon={CheckCircle2}>
          {saved}
        </Banner>
      )}

      {/* Account */}
      <Card className="p-4">
        <SectionTitle icon={User}>Account</SectionTitle>
        <div className="mt-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-slate-900">
              {user?.email || "Signed in"}
            </p>
            <p className="text-[11px] text-slate-500">
              Role: {user?.role || "tourist"}
            </p>
          </div>
          <Chip className="bg-emerald-100 text-emerald-700">Active</Chip>
        </div>
      </Card>

      {/* Emergency contact */}
      <Card className="space-y-3 p-4">
        <SectionTitle icon={Phone}>Emergency number</SectionTitle>
        <Field
          label="Phone for AI assistance calls"
          hint="Stored on this device and sent only when you request a call."
        >
          <Input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9876543210"
          />
        </Field>
        <Button variant="subtle" full onClick={savePhone}>
          Save number
        </Button>
      </Card>

      {/* Tracking */}
      <Card className="space-y-4 p-4">
        <SectionTitle icon={Gauge}>Tracking</SectionTitle>

        <div>
          <p className="mb-2 text-[13px] font-medium text-slate-700">
            How often to send your location
          </p>
          <div className="grid grid-cols-2 gap-2">
            {INTERVALS.map(([secs, label, hint]) => {
              const active = settings.intervalSec === secs;
              return (
                <button
                  key={secs}
                  onClick={() => updateSettings({ intervalSec: secs })}
                  className={`min-h-[56px] rounded-xl px-3 py-2 text-left ring-1 transition-colors
                    ${active
                      ? "bg-blue-50 ring-2 ring-blue-500"
                      : "bg-white ring-slate-200 active:bg-slate-50"}`}
                >
                  <span className="block text-[14px] font-bold text-slate-900">
                    {label}
                  </span>
                  <span className="block text-[10px] leading-tight text-slate-500">
                    {hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Toggle
          label="High-accuracy GPS"
          hint="More precise, uses more battery."
          checked={settings.highAccuracy}
          onChange={(v) => updateSettings({ highAccuracy: v })}
        />
        <Toggle
          label="Keep screen awake while sharing"
          hint="Browsers pause tracking when the screen sleeps."
          checked={settings.keepScreenOn}
          onChange={(v) => updateSettings({ keepScreenOn: v })}
        />

        <button
          onClick={() => updateSettings(DEFAULT_SETTINGS)}
          className="text-[12px] font-semibold text-blue-600"
        >
          Reset to recommended
        </button>
      </Card>

      {/* Privacy / DPDP */}
      <Card className="space-y-3 p-4">
        <SectionTitle icon={ShieldCheck}>Privacy</SectionTitle>
        <p className="text-[12px] leading-relaxed text-slate-600">
          Your location is sensitive personal data under the DPDP Act 2023. It
          is collected only for safety monitoring, which you consented to at
          sign-up, and raw location history is automatically deleted after the
          retention period set by the operator.
        </p>
        <p className="text-[12px] leading-relaxed text-slate-600">
          Officers see your safety status and position — never your browsing,
          contacts or anything else on this device.
        </p>

        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3">
          <div>
            <p className="text-[13px] font-medium text-slate-800">
              Locations saved offline
            </p>
            <p className="text-[11px] text-slate-500">
              {queued} waiting to send
            </p>
          </div>
          <Button
            variant="subtle"
            icon={Trash2}
            onClick={clearQueue}
            disabled={queued === 0}
            className="min-h-[40px] px-3 text-[13px]"
          >
            Clear
          </Button>
        </div>
      </Card>

      {/* Connection */}
      <Card className="p-4">
        <SectionTitle icon={Server}>Connection</SectionTitle>
        <p className="mt-2 break-all text-[12px] text-slate-600">
          {API_BASE || "Same origin as this app"}
        </p>
      </Card>

      <Button variant="subtle" icon={LogOut} full onClick={signOut}>
        Sign out
      </Button>

      <p className="pb-2 text-center text-[11px] text-slate-400">
        Tourist Safety Companion · v0.1.0
      </p>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={15} className="text-slate-500" />
      <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-600">
        {children}
      </h2>
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full min-h-[48px] items-center justify-between gap-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-slate-800">{label}</span>
        <span className="block text-[11px] text-slate-500">{hint}</span>
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors
          ${checked ? "bg-blue-600" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all
            ${checked ? "left-6" : "left-1"}`}
        />
      </span>
    </button>
  );
}
