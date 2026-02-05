import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import Input from "@/components/Input";
import Button from "@/components/Button";

export default function LoginPage() {
  return (
    <AuthLayout title="Entrar" subtitle="Aceda ao painel da sua loja.">
      <form className="space-y-4">
        <Input name="email" label="Email" type="email" placeholder="ex: loja@email.pt" />
        <Input name="password" label="Palavra-passe" type="password" placeholder="••••••••" />

        <div className="flex items-center justify-between">
          <Link href="#" className="text-sm text-gray-600 hover:text-gray-900">
            Esqueci-me da palavra-passe
          </Link>
        </div>

        <Button type="submit">Entrar</Button>

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
