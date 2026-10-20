/**
 * "Add to Home Screen" nudge.
 *
 * Chrome/Edge fire `beforeinstallprompt`, which lets us trigger the native
 * install sheet. iOS Safari does not, so there we show the manual steps
 * instead. Dismissal is remembered so it is asked at most once.
 */
import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";
import { getSync, set } from "../lib/storage";

const DISMISS_KEY = "ts_install_dismissed";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isStandalone() || getSync(DISMISS_KEY)) return;

    function onPrompt(e) {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS never fires the event; surface the manual instructions instead.
    if (isIos()) setShow(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    set(DISMISS_KEY, "1");
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="border-t border-blue-200 bg-blue-50 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <Download size={16} className="mt-0.5 shrink-0 text-blue-600" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-blue-900">
            Install for faster access
          </p>
          {deferred ? (
            <button
              onClick={install}
              className="mt-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-semibold text-white active:bg-blue-700"
            >
              Add to Home Screen
            </button>
          ) : (
            <p className="mt-0.5 flex items-center gap-1 text-[12px] text-blue-800">
              Tap <Share size={13} className="inline" /> then “Add to Home Screen”.
            </p>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="shrink-0 rounded-lg p-1.5 text-blue-500 active:bg-blue-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
