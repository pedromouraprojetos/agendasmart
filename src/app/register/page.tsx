"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!name || !email || !password) {
      setLoading(false);
      setErrorMsg("Preencha todos os campos.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }, // guarda metadata
      },
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // Para já: após registo, manda para onboarding
    router.push("/onboarding?step=1");
  }

  return (
    <AuthLayout title="Criar conta" subtitle="Comece o seu trial gratuito de 14 dias (sem cartão).">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input name="name" label="Nome" placeholder="ex: Pedro Moura" />
        <Input name="email" label="Email" type="email" placeholder="ex: loja@email.pt" />
        <Input name="password" label="Palavra-passe" type="password" placeholder="••••••••" />

        {errorMsg ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <Button type="submit">{loading ? "A criar..." : "Criar conta"}</Button>

        <p className="text-center text-sm text-gray-600">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-gray-900 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
