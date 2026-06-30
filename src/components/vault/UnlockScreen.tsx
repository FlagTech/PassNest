import { useState } from "react";
import { KeyRound, Eye, EyeOff, Sparkles } from "lucide-react";
import { useVaultStore } from "../../store/vault-store";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Spinner } from "../ui/Spinner";

export function UnlockScreen() {
  const unlock = useVaultStore((s) => s.unlock);
  const status = useVaultStore((s) => s.status);
  const errorMessage = useVaultStore((s) => s.errorMessage);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const isLoading = status === "loading";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    await unlock(password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-pink-light to-purple-light mb-4 shadow-soft">
            <Sparkles size={30} className="text-pink-dark" />
          </div>
          <h1 className="text-2xl font-bold text-slate mb-1">PassNest</h1>
          <p className="text-sm text-slate-light">輸入主密碼來解鎖保險箱</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-soft border border-purple-light/30">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="主密碼"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="輸入你的主密碼"
              autoFocus
              error={errorMessage ?? undefined}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-slate-light hover:text-pink transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-light justify-center py-1">
                <Spinner className="w-4 h-4" />
                <span>正在解密中，請稍候...</span>
              </div>
            )}

            <Button type="submit" disabled={isLoading || !password} size="lg">
              {isLoading ? <Spinner className="w-4 h-4" /> : <KeyRound size={16} />}
              {isLoading ? "解鎖中..." : "解鎖"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
