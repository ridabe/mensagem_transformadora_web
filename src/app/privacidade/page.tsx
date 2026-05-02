export const metadata = {
  title: "Política de Privacidade",
};

export default function PrivacidadePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Política de Privacidade</h1>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">Mensagem Transformadora</p>
      </header>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">1. Introdução</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          A presente Política de Privacidade descreve como o Mensagem Transformadora coleta,
          utiliza, armazena e protege os dados pessoais dos usuários, em conformidade com a Lei
          Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Ao utilizar nossos serviços, você concorda com os termos desta política.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">2. Dados Coletados</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Coletamos apenas os dados necessários para o funcionamento da plataforma:
        </p>

        <h3 className="mt-4 text-sm font-semibold text-[var(--mt-text)]">
          2.1 Dados fornecidos pelo usuário
        </h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Nome completo</li>
          <li>E-mail</li>
          <li>Tratamento ministerial (ex: Pastor, Bispo, etc.)</li>
          <li>Nome da igreja (opcional)</li>
          <li>Conteúdo inserido pelo usuário (pré-sermões e mensagens)</li>
        </ul>

        <h3 className="mt-5 text-sm font-semibold text-[var(--mt-text)]">
          2.2 Dados coletados automaticamente
        </h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Endereço IP (para segurança)</li>
          <li>Navegador e dispositivo</li>
          <li>Logs de acesso</li>
          <li>Data e hora de uso</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">3. Finalidade do Uso dos Dados</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Os dados são utilizados para:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Autenticação e acesso à conta</li>
          <li>Personalização da experiência</li>
          <li>Exibição de conteúdo público (quando autorizado)</li>
          <li>Comunicação com o usuário</li>
          <li>Segurança e prevenção de fraudes</li>
          <li>Melhoria contínua da plataforma</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">4. Publicação de Conteúdo</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          O sistema permite que o usuário publique conteúdos (pré-sermões) de forma opcional.
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Ao publicar um conteúdo, o usuário concorda que:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Seu nome poderá ser exibido publicamente</li>
          <li>O conteúdo poderá ser acessado por terceiros via link</li>
          <li>É responsável pelo conteúdo publicado</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">5. Compartilhamento de Dados</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Não vendemos ou compartilhamos dados pessoais com terceiros, exceto:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>
            Quando necessário para funcionamento do sistema (ex: serviços de autenticação como
            Supabase)
          </li>
          <li>Quando exigido por lei</li>
          <li>Para cumprimento de obrigações legais ou judiciais</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">6. Armazenamento e Segurança</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Seus dados são armazenados em ambientes seguros e protegidos por:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Criptografia</li>
          <li>Controle de acesso</li>
          <li>Monitoramento contínuo</li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Utilizamos serviços confiáveis para armazenamento e autenticação.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">7. Direitos do Usuário (LGPD)</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Nos termos da LGPD, você tem direito a:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Acessar seus dados</li>
          <li>Corrigir dados incompletos ou incorretos</li>
          <li>Solicitar exclusão de dados</li>
          <li>Revogar consentimento</li>
          <li>Solicitar portabilidade (quando aplicável)</li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Para exercer seus direitos, entre em contato conosco.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">8. Retenção de Dados</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">Os dados serão mantidos:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Enquanto sua conta estiver ativa</li>
          <li>Ou conforme necessário para cumprir obrigações legais</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">9. Cookies</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">Podemos utilizar cookies para:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Manter sessão do usuário</li>
          <li>Melhorar a experiência</li>
          <li>Analisar uso da plataforma</li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Você pode desativar cookies no navegador, mas isso pode afetar funcionalidades.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">10. Alterações nesta Política</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Esta política pode ser atualizada a qualquer momento.
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Recomendamos que você revise periodicamente.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">11. Contato</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">Em caso de dúvidas:</p>
        <p className="mt-2 text-sm leading-6 text-[var(--mt-muted)]">
          E-mail:{" "}
          <a className="hover:underline" href="mailto:suporte@mensagemtransformadora.com">
            suporte@mensagemtransformadora.com
          </a>
        </p>
      </section>
    </main>
  );
}
