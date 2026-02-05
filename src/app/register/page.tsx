import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import Input from "@/components/Input";
import Button from "@/components/Button";

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Comece o seu trial gratuito de 14 dias (sem cartão)."
    >
      <form className="space-y-4">
        <Input name="name" label="Nome" placeholder="ex: Pedro Moura" />
        <Input name="email" label="Email" type="email" placeholder="ex: loja@email.pt" />
        <Input name="password" label="Palavra-passe" type="password" placeholder="••••••••" />

        <Button type="submit">Criar conta</Button>

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
