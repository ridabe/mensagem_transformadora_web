export const metadata = {
  title: "Termos de Uso",
};

export default function TermosPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Termos de Uso</h1>
        <p className="text-sm leading-6 text-[var(--mt-muted)]">Mensagem Transformadora</p>
      </header>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">1. Aceitação dos Termos</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Ao acessar e utilizar o Mensagem Transformadora, você concorda com estes Termos de Uso.
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Caso não concorde, não utilize o sistema.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">2. Sobre a Plataforma</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          O Mensagem Transformadora é uma plataforma que permite:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Registrar mensagens e pregações</li>
          <li>Organizar conteúdo espiritual</li>
          <li>Publicar pré-sermões (opcionalmente)</li>
          <li>Compartilhar conteúdos por meio de links</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">3. Cadastro do Usuário</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Para utilizar determinadas funcionalidades, é necessário:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Fornecer informações verdadeiras</li>
          <li>Manter seus dados atualizados</li>
          <li>Manter a confidencialidade da senha</li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          O usuário é responsável por todas as atividades realizadas em sua conta.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">4. Responsabilidade sobre o Conteúdo</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          O usuário é integralmente responsável pelos conteúdos que:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>criar</li>
          <li>armazenar</li>
          <li>publicar</li>
        </ul>
        <p className="mt-4 text-sm leading-6 text-[var(--mt-muted)]">
          É proibido publicar conteúdo:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>ofensivo</li>
          <li>ilegal</li>
          <li>discriminatório</li>
          <li>que viole direitos de terceiros</li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          O sistema pode remover conteúdos que violem estas regras.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">5. Publicação Pública</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Ao publicar um pré-sermão:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>O conteúdo poderá ser acessado publicamente</li>
          <li>O nome do autor poderá ser exibido</li>
          <li>O link poderá ser compartilhado livremente</li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          A publicação é opcional e feita sob responsabilidade do usuário.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">6. Uso Indevido</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">É proibido:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Tentar invadir o sistema</li>
          <li>Usar automações maliciosas</li>
          <li>Explorar vulnerabilidades</li>
          <li>Publicar spam ou conteúdo abusivo</li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          O descumprimento pode resultar em:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Suspensão da conta</li>
          <li>Exclusão de dados</li>
          <li>Medidas legais</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">7. Disponibilidade do Serviço</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">O sistema pode sofrer:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Interrupções</li>
          <li>Manutenções</li>
          <li>Atualizações</li>
        </ul>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Não garantimos disponibilidade contínua.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">8. Limitação de Responsabilidade</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          O Mensagem Transformadora não se responsabiliza por:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Conteúdos publicados pelos usuários</li>
          <li>Perda de dados causada por uso indevido</li>
          <li>Danos indiretos decorrentes do uso da plataforma</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">9. Propriedade Intelectual</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          A plataforma, design, marca e funcionalidades são de propriedade do Mensagem
          Transformadora.
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          É proibida reprodução sem autorização.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">10. Encerramento de Conta</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          O usuário pode solicitar exclusão da conta a qualquer momento.
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          A plataforma também pode encerrar contas que violem os termos.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">11. Alterações nos Termos</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Os Termos de Uso podem ser atualizados a qualquer momento.
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          O uso contínuo implica aceitação das mudanças.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">12. Legislação Aplicável</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Este documento é regido pelas leis brasileiras, especialmente:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--mt-muted)]">
          <li>Lei Geral de Proteção de Dados (LGPD)</li>
          <li>Código Civil Brasileiro</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--mt-border)] bg-[var(--mt-surface)] p-6">
        <h2 className="text-base font-semibold">13. Contato</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
          Em caso de dúvidas:{" "}
          <a className="hover:underline" href="mailto:suporte@mensagemtransformadora.com">
            suporte@mensagemtransformadora.com
          </a>
        </p>
      </section>
    </main>
  );
}
