import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import { useVaultStore } from "../../store/vault-store";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import type { PasswordEntry } from "../../types/vault";

const schema = z.object({
  label: z.string().min(1, "請輸入名稱"),
  url: z.string(),
  username: z.string(),
  password: z.string().min(1, "請輸入密碼"),
  notes: z.string(),
});

type FormData = z.infer<typeof schema>;

function generatePassword(length = 20): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => chars[b % chars.length])
    .join("");
}

interface PasswordFormProps {
  editEntry?: PasswordEntry;
  onClose: () => void;
}

export function PasswordForm({ editEntry, onClose }: PasswordFormProps) {
  const addEntry = useVaultStore((s) => s.addEntry);
  const updateEntry = useVaultStore((s) => s.updateEntry);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: editEntry?.label ?? "",
      url: editEntry?.url ?? "",
      username: editEntry?.username ?? "",
      password: editEntry?.password ?? "",
      notes: editEntry?.notes ?? "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (editEntry) {
      await updateEntry(editEntry.id, { ...data, type: "password" });
    } else {
      await addEntry({ ...data, type: "password", isFavorite: false });
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input {...register("label")} label="名稱 *" placeholder="例：GitHub" error={errors.label?.message} />
      <Input {...register("url")} label="網址" placeholder="https://github.com" />
      <Input {...register("username")} label="帳號" placeholder="user@email.com" />
      <Input
        {...register("password")}
        label="密碼 *"
        type={showPw ? "text" : "password"}
        placeholder="輸入密碼"
        error={errors.password?.message}
        suffix={
          <div className="flex gap-1">
            <button type="button" onClick={() => setValue("password", generatePassword())} className="text-slate-light hover:text-mint transition-colors" title="產生密碼">
              <RefreshCw size={14} />
            </button>
            <button type="button" onClick={() => setShowPw(!showPw)} className="text-slate-light hover:text-pink transition-colors">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        }
      />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate">備註</label>
        <textarea
          {...register("notes")}
          rows={2}
          placeholder="其他備注..."
          className="w-full px-4 py-2.5 rounded-2xl border-2 border-purple-light focus:border-pink focus:outline-none text-sm text-slate resize-none transition-colors"
        />
      </div>
      <div className="flex gap-2 justify-end mt-1">
        <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
        <Button type="submit" disabled={isSubmitting}>
          {editEntry ? "儲存" : "新增"}
        </Button>
      </div>
    </form>
  );
}
