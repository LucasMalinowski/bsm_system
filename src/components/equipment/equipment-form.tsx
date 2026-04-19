"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createEquipmentSchema, type CreateEquipmentInput } from "@/lib/validations/equipment.schemas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "under_maintenance", label: "Em Manutenção" },
  { value: "calibration", label: "Calibração" },
  { value: "retired", label: "Descartado" },
];

export function EquipmentForm({ defaultValues }: { defaultValues?: Partial<CreateEquipmentInput> }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateEquipmentInput>({
    resolver: zodResolver(createEquipmentSchema),
    defaultValues: { status: "active", ...defaultValues },
  });

  const onSubmit = async (data: CreateEquipmentInput) => {
    setServerError(null);
    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      setServerError(err.error ?? "Erro ao salvar equipamento");
      return;
    }

    const { data: equipment } = await res.json();
    router.push(`/equipment/${equipment.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Código Interno *"
          placeholder="EQ-001"
          error={errors.internal_code?.message}
          {...register("internal_code")}
        />
        <Input
          label="Nome *"
          placeholder="Balança Analítica"
          error={errors.name?.message}
          {...register("name")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Marca"
          placeholder="Mettler Toledo"
          error={errors.brand?.message}
          {...register("brand")}
        />
        <Input
          label="Modelo"
          placeholder="XPE 205"
          error={errors.model?.message}
          {...register("model")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nº de Série"
          error={errors.serial_number?.message}
          {...register("serial_number")}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <Select
            defaultValue="active"
            onValueChange={(v) => setValue("status", v as CreateEquipmentInput["status"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Input
        label="Localização"
        placeholder="Lab A - Bancada 3"
        error={errors.location?.message}
        {...register("location")}
      />

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Data de Aquisição"
          type="date"
          error={errors.acquisition_date?.message}
          {...register("acquisition_date")}
        />
        <Input
          label="Última Calibração"
          type="date"
          error={errors.last_calibration?.message}
          {...register("last_calibration")}
        />
        <Input
          label="Próxima Calibração"
          type="date"
          error={errors.next_calibration?.message}
          {...register("next_calibration")}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Observações</label>
        <textarea
          className="min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          placeholder="Informações adicionais..."
          {...register("notes")}
        />
      </div>

      {serverError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          Salvar Equipamento
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
