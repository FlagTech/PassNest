import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useVaultStore } from "../../store/vault-store";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import type { ApiKeyEntry } from "../../types/vault";

const schema = z.object({
  label: z.string().min(1, "請輸入名稱"),
  serviceName: z.string().min(1, "請輸入服務名稱"),
  keyValue: z.string().min(1, "請輸入 API 金鑰"),
  expiresAt: z.string(),
  notes: z.string(),
});

type FormData = z.infer<typeof schema>;

interface ApiKeyFormProps {
  editEntry?: ApiKeyEntry;
  onClose: () => void;
}

export function ApiKeyForm({ editEntry, onClose }: ApiKeyFormProps) {
  const addEntry = useVaultStore((s) => s.addEntry);
  const updateEntry = useVaultStore((s) => s.updateEntry);
  const [showKey, setShowKey] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: editEntry?.label ?? "",
      serviceName: editEntry?.serviceName ?? "",
      keyValue: editEntry?.keyValue ?? "",
      expiresAt: editEntry?.expiresAt?.slice(0, 10) ?? "",
      notes: editEntry?.notes ?? "",
    },
  });

  const onSubmit = async (data: FormData) => {
    const entry = {
      ...data,
      type: "apikey" as const,
      expiresAt: data.expiresAt || null,
      isFavorite: false,
    };
    if (editEntry) {
      await updateEntry(editEntry.id, entry);
    } else {
      await addEntry(entry);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input {...register("label")} label="名稱 *" placeholder="例：OpenAI" error={errors.label?.message} />
      <Input {...register("serviceName")} label="服務名稱 *" placeholder="例：OpenAI API" error={errors.serviceName?.message} />
      <Input
        {...register("keyValue")}
        label="API 金鑰 *"
        type={showKey ? "text" : "password"}
        placeholder="sk-..."
        error={errors.keyValue?.message}
        suffix={
          <button type="button" onClick={() => setShowKey(!showKey)} className="text-slate-light hover:text-pink transition-colors">
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        }
      />
      <Input
        {...register("expiresAt")}
        label="到期日（選填）"
        type="date"
        className="cursor-pointer"
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
