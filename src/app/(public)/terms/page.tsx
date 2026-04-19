export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Termos e Condições</h1>
        <p className="mt-2 text-sm text-gray-500">BSM — Gestão de Equipamentos</p>
      </div>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. Aceitação dos Termos</h2>
          <p>
            Ao aceitar o convite e criar sua conta na plataforma BSM, você concorda com estes
            Termos e Condições de Uso. Caso não concorde, não utilize a plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. Uso Adequado</h2>
          <p>
            O acesso à plataforma é pessoal e intransferível. Você é responsável por manter
            a confidencialidade de suas credenciais e por todas as atividades realizadas com
            sua conta. Não é permitido compartilhar seu acesso com terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. Dados e Privacidade</h2>
          <p>
            Os dados inseridos na plataforma pertencem à empresa à qual você está vinculado.
            A BSM armazena informações de perfil (nome, foto) e registros de atividade para
            fins de auditoria interna. Seus dados não são compartilhados com terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. Responsabilidades</h2>
          <p>
            Você se compromete a utilizar a plataforma de forma ética, respeitando as
            políticas internas da sua empresa e a legislação vigente. Qualquer uso indevido
            poderá resultar no bloqueio imediato do acesso.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. Modificações</h2>
          <p>
            A BSM reserva-se o direito de modificar estes termos a qualquer momento. As
            alterações entram em vigor imediatamente após a publicação. O uso contínuo da
            plataforma implica na aceitação dos termos atualizados.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. Contato</h2>
          <p>
            Em caso de dúvidas, entre em contato com o administrador da sua empresa ou com o
            suporte da plataforma.
          </p>
        </section>
      </div>

      <div className="mt-10 text-center text-xs text-gray-400">
        Última atualização: Março de 2026
      </div>
    </div>
  );
}
