import { useState } from "react";
import { Shield, ShieldOff, KeyRound, Eye, EyeOff, CheckCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useVaultStore } from "../../store/vault-store";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Spinner } from "../ui/Spinner";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type Panel = "main" | "enable" | "disable" | "change";

// ── Schemas ──────────────────────────────────────────────────────────────────

const enableSchema = z
  .object({
    password: z.string().min(4, "主密碼至少 4 個字元"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "兩次輸入不一致", path: ["confirm"] });

const disableSchema = z.object({
  password: z.string().min(1, "請輸入目前的主密碼"),
});

const changeSchema = z
  .object({
    current: z.string().min(1, "請輸入目前的主密碼"),
    next: z.string().min(4, "新密碼至少 4 個字元"),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "兩次輸入不一致", path: ["confirm"] });

// ── Strength bar ──────────────────────────────────────────────────────────────

function getStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function StrengthBar({ value }: { value: string }) {
  const s = getStrength(value);
  if (!value) return null;
  return (
    <div className="flex gap-1.5 -mt-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-1.5 flex-1 rounded-full transition-all duration-300"
          style={{
            background: i < s
              ? s <= 1 ? "#FF8FAB" : s <= 2 ? "#CE93D8" : "#81C784"
              : "#E1BEE7",
          }}
        />
      ))}
    </div>
  );
}

// ── Sub-panels ────────────────────────────────────────────────────────────────

function EnablePanel({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const enablePassword = useVaultStore((s) => s.enablePassword);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(enableSchema),
  });

  const onSubmit = async (data: { password: string; confirm: string }) => {
    setLoading(true);
    setError(null);
    try {
      await enablePassword(data.password);
      onDone();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const pwValue = watch("password", "");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="text-sm text-slate-light">設定主密碼後，每次開啟 PassNest 都需要輸入密碼才能解鎖。</p>
      <Input
        {...register("password")}
        label="新主密碼"
        type={showPw ? "text" : "password"}
        placeholder="至少 4 個字元"
        error={errors.password?.message}
        suffix={
          <button type="button" onClick={() => setShowPw(!showPw)} className="text-slate-light hover:text-pink transition-colors">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />
      <StrengthBar value={pwValue} />
      <Input
        {...register("confirm")}
        label="確認主密碼"
        type={showConfirm ? "text" : "password"}
        placeholder="再次輸入"
        error={errors.confirm?.message}
        suffix={
          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-slate-light hover:text-pink transition-colors">
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 mt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onBack}>取消</Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? <Spinner className="w-4 h-4" /> : <Shield size={14} />}
          {loading ? "設定中..." : "啟用主密碼"}
        </Button>
      </div>
    </form>
  );
}

function DisablePanel({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const disablePassword = useVaultStore((s) => s.disablePassword);
  const unlock = useVaultStore((s) => s.unlock);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(disableSchema),
  });

  const onSubmit = async (data: { password: string }) => {
    setLoading(true);
    setError(null);
    try {
      // Verify current password first
      await unlock(data.password);
      // If unlock succeeded (no throw), disable password
      await disablePassword();
      onDone();
    } catch (e) {
      const msg = String(e);
      setError(msg.includes("密碼錯誤") ? "密碼錯誤，請重試" : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="bg-pink-light/20 rounded-2xl p-3 text-xs text-slate-light">
        關閉後，PassNest 啟動時將不再要求密碼。請輸入目前的主密碼確認。
      </div>
      <Input
        {...register("password")}
        label="目前的主密碼"
        type={showPw ? "text" : "password"}
        placeholder="輸入以確認"
        error={errors.password?.message}
        suffix={
          <button type="button" onClick={() => setShowPw(!showPw)} className="text-slate-light hover:text-pink transition-colors">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 mt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onBack}>取消</Button>
        <Button type="submit" variant="danger" disabled={loading} className="flex-1">
          {loading ? <Spinner className="w-4 h-4" /> : <ShieldOff size={14} />}
          {loading ? "關閉中..." : "關閉主密碼"}
        </Button>
      </div>
    </form>
  );
}

function ChangePanel({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const changePassword = useVaultStore((s) => s.changePassword);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(changeSchema),
  });

  const onSubmit = async (data: { current: string; next: string; confirm: string }) => {
    setLoading(true);
    setError(null);
    try {
      await changePassword(data.current, data.next);
      onDone();
    } catch (e) {
      const msg = String(e);
      setError(msg.includes("invalid tag") || msg.includes("authentication") ? "目前密碼錯誤" : msg);
    } finally {
      setLoading(false);
    }
  };

  const nextValue = watch("next", "");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        {...register("current")}
        label="目前的主密碼"
        type={show.current ? "text" : "password"}
        placeholder="輸入目前密碼"
        error={errors.current?.message}
        suffix={
          <button type="button" onClick={() => setShow(s => ({ ...s, current: !s.current }))} className="text-slate-light hover:text-pink transition-colors">
            {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />
      <Input
        {...register("next")}
        label="新主密碼"
        type={show.next ? "text" : "password"}
        placeholder="至少 4 個字元"
        error={errors.next?.message}
        suffix={
          <button type="button" onClick={() => setShow(s => ({ ...s, next: !s.next }))} className="text-slate-light hover:text-pink transition-colors">
            {show.next ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />
      <StrengthBar value={nextValue} />
      <Input
        {...register("confirm")}
        label="確認新密碼"
        type={show.confirm ? "text" : "password"}
        placeholder="再次輸入"
        error={errors.confirm?.message}
        suffix={
          <button type="button" onClick={() => setShow(s => ({ ...s, confirm: !s.confirm }))} className="text-slate-light hover:text-pink transition-colors">
            {show.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2 mt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onBack}>取消</Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? <Spinner className="w-4 h-4" /> : <KeyRound size={14} />}
          {loading ? "更新中..." : "更新密碼"}
        </Button>
      </div>
    </form>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

function MainPanel({ setPanel }: { setPanel: (p: Panel) => void }) {
  const passwordProtected = useVaultStore((s) => s.passwordProtected);

  return (
    <div className="flex flex-col gap-5">
      {/* Password protection row */}
      <div className="flex items-center justify-between py-3 border-b border-purple-light/20">
        <div>
          <p className="text-sm font-medium text-slate">主密碼保護</p>
          <p className="text-xs text-slate-light mt-0.5">
            {passwordProtected ? "開啟 — 每次啟動需輸入密碼" : "關閉 — 自動解鎖"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {passwordProtected ? (
            <span className="flex items-center gap-1 text-xs text-mint font-medium">
              <CheckCircle size={13} /> 已啟用
            </span>
          ) : (
            <span className="text-xs text-slate-light">未啟用</span>
          )}
          <button
            onClick={() => setPanel(passwordProtected ? "disable" : "enable")}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              passwordProtected ? "bg-mint" : "bg-purple-light"
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                passwordProtected ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Change password (only when enabled) */}
      {passwordProtected && (
        <button
          onClick={() => setPanel("change")}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-slate hover:bg-purple-light/20 transition-colors w-full text-left"
        >
          <KeyRound size={15} className="text-purple" />
          更改主密碼
        </button>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [panel, setPanel] = useState<Panel>("main");
  const [done, setDone] = useState(false);

  const handleClose = () => {
    setPanel("main");
    setDone(false);
    onClose();
  };

  const handleDone = () => {
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setPanel("main");
    }, 1500);
  };

  return (
    <Modal open={open} onClose={handleClose} title="設定" className="max-w-md">
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-mint">
          <CheckCircle size={40} />
          <p className="text-sm font-medium text-slate">設定已儲存</p>
        </div>
      ) : panel === "main" ? (
        <MainPanel setPanel={setPanel} />
      ) : panel === "enable" ? (
        <EnablePanel onBack={() => setPanel("main")} onDone={handleDone} />
      ) : panel === "disable" ? (
        <DisablePanel onBack={() => setPanel("main")} onDone={handleDone} />
      ) : (
        <ChangePanel onBack={() => setPanel("main")} onDone={handleDone} />
      )}
    </Modal>
  );
}
