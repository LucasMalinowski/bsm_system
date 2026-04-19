"use client";

import { useState, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCompanySchema, type CreateCompanyInput } from "@/lib/validations/company.schemas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "")   // remove special chars
    .trim()
    .replace(/\s+/g, "-")            // spaces → hyphens
    .replace(/-+/g, "-");            // collapse multiple hyphens
}

export function CreateCompanyDialog({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // track whether the user has manually edited the slug
  const slugEditedManually = useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      primary_color: "#0363a9",
      secondary_color: "#008adb",
      accent_color: "#e0f0fb",
    },
  });

  const slugValue = watch("slug") ?? "";

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("name", name);
    if (!slugEditedManually.current) {
      setValue("slug", toSlug(name), { shouldValidate: true });
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    slugEditedManually.current = true;
    // enforce slug format while typing
    const cleaned = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    setValue("slug", cleaned, { shouldValidate: true });
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      reset();
      slugEditedManually.current = false;
    }
  };

  const onSubmit = async (data: CreateCompanyInput) => {
    setServerError(null);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      setServerError(err.error ?? "Erro ao criar empresa");
      return;
    }

    handleOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Empresa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nome da Empresa *"
            error={errors.name?.message}
            {...register("name")}
            onChange={handleNameChange}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Slug (URL) *</label>
            <div className="flex items-center rounded-lg border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-[var(--brand-primary)]">
              <span className="select-none pl-3 text-sm text-gray-400">bsm/</span>
              <input
                value={slugValue}
                onChange={handleSlugChange}
                placeholder="minha-empresa"
                className="h-10 flex-1 bg-transparent pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>
            {errors.slug ? (
              <p className="text-xs text-red-600">{errors.slug.message}</p>
            ) : (
              <p className="text-xs text-gray-400">Gerado automaticamente · editável</p>
            )}
          </div>
          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium text-gray-700">Administrador da Empresa</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nome *"
                error={errors.admin_name?.message}
                {...register("admin_name")}
              />
              <Input
                label="E-mail *"
                type="email"
                error={errors.admin_email?.message}
                {...register("admin_email")}
              />
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium text-gray-700">Cores</p>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Primária" type="color" {...register("primary_color")} />
              <Input label="Secundária" type="color" {...register("secondary_color")} />
              <Input label="Destaque" type="color" {...register("accent_color")} />
            </div>
          </div>

          {serverError && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" isLoading={isSubmitting}>Criar Empresa</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
