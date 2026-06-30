import { useState } from "react";
import { Bot, Copy, RefreshCw, ShieldOff, CheckCircle, FolderOpen, Server } from "lucide-react";
import { useAIStore } from "../../store/ai-store";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface AIModeProps {
  open: boolean;
  onClose: () => void;
}

export function AIMode({ open, onClose }: AIModeProps) {
  const { token, enabled, createdAt, tokenFilePath, generateToken, revokeToken } = useAIStore();
  const [copied, setCopied] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const handleGenerate = async () => {
    const t = await generateToken();
    setNewToken(t);
    setCopied(false);
  };

  const handleCopy = async () => {
    const t = newToken ?? token;
    if (!t) return;
    await navigator.clipboard.writeText(t);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPath = async () => {
    if (!tokenFilePath) return;
    await navigator.clipboard.writeText(tokenFilePath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleRevoke = async () => {
    await revokeToken();
    setNewToken(null);
    setCopied(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="AI 模式設定" className="max-w-lg">
      <div className="flex flex-col gap-5">
        {/* Description */}
        <div className="bg-purple-light/20 rounded-2xl p-4 text-sm text-slate">
          <p className="font-semibold mb-1">AI 代理人存取限制</p>
          <ul className="flex flex-col gap-1 text-slate-light text-xs">
            <li>✅ AI 可以看到：條目名稱、網址、帳號</li>
            <li>✅ AI 可以操作：複製密碼到剪貼板（3 分鐘後自動清空）</li>
            <li>❌ AI 無法取得：實際密碼或 API 金鑰的明文值</li>
            <li>❌ AI 無法操作：新增、修改、刪除任何條目</li>
          </ul>
        </div>

        {/* Token Status */}
        {!enabled ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Bot size={24} className="text-slate-light" />
            </div>
            <p className="text-sm text-slate-light mb-4">AI 模式尚未啟用</p>
            <Button onClick={handleGenerate}>
              <Bot size={14} />
              產生 AI Token
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle size={16} className="text-mint shrink-0" />
              <span className="text-slate font-medium">AI 模式已啟用</span>
              {createdAt && (
                <span className="text-xs text-slate-light ml-auto">
                  建立於 {new Date(createdAt).toLocaleString("zh-TW")}
                </span>
              )}
            </div>

            {/* Token display — only shown right after generation */}
            {newToken ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-light">
                  請複製此 Token 並貼給 AI。Token 只顯示一次，請妥善保存。
                </p>
                <div className="flex items-center gap-2 bg-cream rounded-2xl px-3 py-2 border-2 border-pink-light">
                  <code className="flex-1 text-xs font-mono text-slate break-all">{newToken}</code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 p-1.5 rounded-xl text-slate-light hover:text-pink transition-colors"
                    title="複製"
                  >
                    {copied ? <CheckCircle size={15} className="text-mint" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-cream rounded-2xl px-4 py-3 text-xs text-slate-light">
                Token 已存在（出於安全考量，不再顯示）。如需重新取得，請重新產生。
              </div>
            )}

            {/* Token file path — shown when server successfully wrote the file */}
            {tokenFilePath ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-slate-light">Token 已寫入檔案（AI 可直接讀取此路徑）：</p>
                <div className="flex items-center gap-2 bg-cream rounded-2xl px-3 py-2 border border-purple-light/40">
                  <FolderOpen size={13} className="text-purple shrink-0" />
                  <code className="flex-1 text-xs font-mono text-slate break-all">{tokenFilePath}</code>
                  <button
                    onClick={handleCopyPath}
                    className="shrink-0 p-1.5 rounded-xl text-slate-light hover:text-purple transition-colors"
                    title="複製路徑"
                  >
                    {copiedPath ? <CheckCircle size={13} className="text-mint" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            ) : newToken && (
              <div className="flex items-start gap-2 bg-amber-50 rounded-2xl px-3 py-2.5 border border-amber-200">
                <Server size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  AI Server 未執行，Token 未寫入檔案。執行 <code className="font-mono">npm run server</code> 後重新產生即可自動寫入。
                </p>
              </div>
            )}

            {/* How to use — Chrome extension bridge */}
            <div className="bg-slate/5 rounded-2xl p-3 text-xs font-mono text-slate-light space-y-1">
              <p className="text-slate font-semibold not-italic mb-2 font-sans text-sm">Codex Chrome 外掛</p>
              <p className="text-slate-light/60 not-italic font-sans text-xs mb-1">在 PassNest 分頁的 console 中執行：</p>
              <p>{"window.passNestAI.auth('<TOKEN>')"}</p>
              <p>{"window.passNestAI.listEntries()"}</p>
              <p>{"window.passNestAI.copyCredential('<ID>', 'password')"}</p>
            </div>

            {/* How to use — HTTP API */}
            <div className="bg-slate/5 rounded-2xl p-3 text-xs font-mono text-slate-light space-y-1">
              <p className="text-slate font-semibold not-italic mb-1 font-sans text-sm">HTTP API（需先執行 npm run server）</p>
              <p className="text-purple-dark">{"# 確認狀態"}</p>
              <p>{"curl http://localhost:7070/status"}</p>
              <p className="text-purple-dark mt-1">{"# 列出條目"}</p>
              <p>{"curl \"http://localhost:7070/entries?token=<TOKEN>\""}</p>
              <p className="text-purple-dark mt-1">{"# 複製密碼到剪貼板"}</p>
              <p>{"curl -X POST http://localhost:7070/copy \\"}</p>
              <p>{'  -H "Content-Type: application/json" \\'}</p>
              <p>{'  -d \'{"token":"<TOKEN>","entryId":"<ID>","field":"password"}\''}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleGenerate} className="flex-1">
                <RefreshCw size={13} />
                重新產生
              </Button>
              <Button variant="danger" size="sm" onClick={handleRevoke} className="flex-1">
                <ShieldOff size={13} />
                撤銷 Token
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-light text-center">
          Vault 鎖定後 Token 自動失效，需重新解鎖後才能繼續使用。
        </p>
      </div>
    </Modal>
  );
}
