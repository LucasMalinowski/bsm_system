"use client";

import { useState, useEffect } from "react";

interface Category { id: string; name: string; description?: string | null }

export function DocumentCategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/document-categories");
      if (res.ok) {
        const { data } = await res.json();
        setCategories(data ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/document-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      if (res.ok) {
        setName(""); setDescription("");
        await load();
      } else {
        const { error: msg } = await res.json().catch(() => ({ error: "Erro ao criar" }));
        setError(msg ?? "Erro ao criar categoria");
      }
    } catch { setError("Erro ao criar categoria"); }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/document-categories/${id}`, { method: "DELETE" });
      await load();
    } catch { /* ignore */ }
    setDeletingId(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <h2 className="text-[15px] font-bold text-gray-900 mb-5">Categorias de Documentos</h2>

      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da categoria"
          className="flex-1 h-9 rounded-lg border border-gray-300 px-3 text-[13px] outline-none focus:border-[#0363a9] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] transition-all"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          className="flex-1 h-9 rounded-lg border border-gray-300 px-3 text-[13px] outline-none focus:border-[#0363a9] focus:shadow-[0_0_0_3px_rgba(3,99,169,0.12)] transition-all"
        />
        <button
          type="submit"
          disabled={adding || !name.trim()}
          className="h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: "var(--brand-primary)" }}
        >
          {adding ? "..." : "Adicionar"}
        </button>
      </form>

      {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}

      {loading ? (
        <p className="text-[13px] text-gray-400">Carregando...</p>
      ) : categories.length === 0 ? (
        <p className="text-[13px] text-gray-400">Nenhuma categoria cadastrada.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <span className="text-[13px] font-medium text-gray-900">{cat.name}</span>
                {cat.description && <span className="text-[12px] text-gray-400 ml-2">{cat.description}</span>}
              </div>
              <button
                onClick={() => handleDelete(cat.id)}
                disabled={deletingId === cat.id}
                className="text-[12px] text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors px-2"
              >
                {deletingId === cat.id ? "..." : "Remover"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
