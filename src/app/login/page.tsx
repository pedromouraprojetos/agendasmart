"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setLoading(false);
      setErrorMsg("Preencha email e palavra-passe.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setErrorMsg("Credenciais inválidas ou conta inexistente.");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <AuthLayout title="Entrar" subtitle="Aceda ao painel da sua loja.">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input name="email" label="Email" type="email" placeholder="ex: loja@email.pt" />
        <Input name="password" label="Palavra-passe" type="password" placeholder="••••••••" />

        <div className="flex items-center justify-between">
          <Link href="#" className="text-sm text-gray-600 hover:text-gray-900">
            Esqueci-me da palavra-passe
          </Link>
        </div>

        {errorMsg ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <Button type="submit">{loading ? "A entrar..." : "Entrar"}</Button>

        <p className="text-center text-sm text-gray-600">
          Ainda não tem conta?{" "}
          <Link href="/register" className="font-medium text-gray-900 hover:underline">
            Criar conta
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
