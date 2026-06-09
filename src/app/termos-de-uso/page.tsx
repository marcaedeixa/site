import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso — Marca e Deixa',
  description: 'Termos e Condições Gerais de Uso da plataforma Marca e Deixa.',
}

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight text-black">
            marca<span className="text-gray-400">e</span>deixa
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-black transition-colors">
            ← Voltar ao site
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Legal</p>
          <h1 className="text-4xl font-black text-black mb-4">Termos de Uso</h1>
          <p className="text-gray-500">Última atualização: junho de 2025</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-10 text-gray-700 leading-relaxed">

          <p>
            Estes Termos e Condições Gerais de Uso (daqui em diante referidos apenas como "Termos") se aplicam à
            utilização da plataforma "marca e deixa", por você, "Usuário", através da criação de perfil, pago ou
            gratuito, em nosso site.
          </p>

          <p>
            A plataforma <strong>marca e deixa</strong> está vinculada à microempresa inscrita sob o CNPJ
            50.974.752/0001-21, com endereço de correspondência na Rua Caucaia, nº 146, casa 2, Vila do Bosque, na
            cidade de São Paulo, CEP 04147-100. A empresa tem como objetivo servir como ferramenta de organização
            de performances artísticas e responsabiliza você, Usuário, ao cumprimento destes Termos e Condições
            Gerais de Uso.
          </p>

          <p>
            Os Termos e Condições Gerais de Uso são inteiramente publicizados; desta forma, não será considerado
            que seja alegado desconhecimento das regras e obrigações aqui estabelecidas.
          </p>

          <p className="font-semibold text-black">
            AO UTILIZAR A PLATAFORMA VOCÊ AUTOMATICAMENTE CONCORDA COM ESTES TERMOS E CONDIÇÕES GERAIS DE USO, QUE
            POSSUI NATUREZA JURÍDICA DE UM CONTRATO DE ADESÃO, RESPONSABILIZANDO-SE INTEGRALMENTE POR TODOS E
            QUAISQUER ATOS PRATICADOS. CASO VOCÊ NÃO CONCORDE COM QUALQUER DOS TERMOS E CONDIÇÕES ABAIXO
            ESTABELECIDOS, VOCÊ NÃO DEVE UTILIZAR A PLATAFORMA.
          </p>

          <p>
            Este documento poderá ser periodicamente alterado, conforme a necessidade, para que se mantenha
            atualizado. Sempre mostramos a data da última versão no final deste documento. Ao continuar usando os
            serviços após as alterações, você estará concordando com os termos alterados. Se não concordar com as
            alterações, você deverá interromper o uso dos serviços e cancelá-los, seguindo as instruções do item
            "Cancelamentos e Reembolsos".
          </p>

          {/* 1 */}
          <section>
            <h2 className="text-xl font-bold text-black mb-4">1. Definições Importantes</h2>
            <div className="space-y-4">
              <p>
                <strong>1.1 Sistema/plataforma/aplicativo "marca e deixa":</strong> software disponível via
                navegador web, composto por um conjunto de módulos específicos voltados à organização de
                performances artísticas, desenvolvido e de propriedade intelectual legítima e exclusiva da empresa,
                disponibilizado na modalidade SaaS (Software as a Service).
              </p>
              <p>
                <strong>1.2 SaaS — Software as a Service:</strong> modelo de contratação (prestação de serviços)
                baseado na disponibilização do Sistema como serviço, acessível por navegador web sem necessidade de
                instalação local, utilizando infraestrutura de nuvem gerenciada pela "marca e deixa".
              </p>
              <p>
                <strong>1.3 Atualização das funções:</strong> um dos itens que compõem a atualização do software,
                referindo-se às funções do Sistema, ou seja, àquilo que o Sistema se propõe a atender, de acordo
                com as funcionalidades definidas pela "marca e deixa", independentemente de notificação prévia ao
                Usuário.
              </p>
              <p>
                <strong>1.4 Conteúdo:</strong> todo material, de propriedade intelectual exclusiva da "marca e
                deixa", eventualmente disponibilizado na plataforma.
              </p>
              <p>
                <strong>1.5 "marca e deixa":</strong> pessoa jurídica de direito privado detentora de todos os
                direitos de propriedade intelectual dos métodos e funcionalidades disponíveis dentro da Plataforma,
                podendo disponibilizar novos serviços, funcionalidades, conteúdo ou interromper o seu fornecimento,
                a qualquer tempo, sem a necessidade de prévia comunicação, não cabendo qualquer tipo de reclamação
                pelo Usuário.
              </p>
            </div>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-bold text-black mb-4">2. Conta Marca e Deixa</h2>
            <div className="space-y-4">
              <p>
                <strong>2.1</strong> A conta "marca e deixa" é um produto que possui versão paga e versão gratuita.
              </p>
              <p>
                <strong>2.2</strong> Para acessar os serviços, você deverá criar uma conta em nossa plataforma web,
                fornecendo um endereço de e-mail válido e de sua propriedade, para validação do cadastro.
              </p>
              <p>
                <strong>2.3</strong> Oferecemos suporte técnico para os serviços, através dos nossos canais de
                comunicação. Prioritariamente nosso suporte é realizado via e-mail.
              </p>
              <p>
                <strong>2.4</strong> Enviaremos e-mails que tenham relação com os serviços utilizados. Você
                conseguirá utilizar os serviços de forma adequada e ágil se estiver usando:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-2 text-gray-600">
                <li>Acesso a internet com velocidade mínima de 5 Mbps;</li>
                <li>
                  Para a versão web: computadores com Windows, macOS ou Linux, utilizando versões recentes dos
                  navegadores Google Chrome, Mozilla Firefox, Safari ou Microsoft Edge.
                </li>
              </ul>
            </div>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-bold text-black mb-4">3. Sobre Assinaturas</h2>
            <div className="space-y-4">
              <p>
                <strong>3.1</strong> A plataforma "marca e deixa" possui versão gratuita e versão paga, cujas
                funcionalidades são descritas na página de planos do site.
              </p>
              <p>
                <strong>3.2</strong> A assinatura "marca e deixa" se aplica exclusivamente à conta-perfil em que o
                usuário está logado no momento da contratação.
              </p>
              <p>
                <strong>3.3</strong> As assinaturas são renovadas automaticamente ao término de cada ciclo de
                pagamento. Não havendo renovação da assinatura, o usuário perderá o acesso aos recursos do sistema
                contemplados exclusivamente na versão paga.
              </p>
              <p>
                <strong>3.4</strong> Os valores das assinaturas podem variar de acordo com sazonalidade e
                promoções. O valor será apresentado sempre, de forma clara, na hora da aquisição.
              </p>
              <p>
                <strong>3.4.1</strong> A "marca e deixa" poderá, a seu exclusivo critério, oferecer benefícios
                promocionais como cupons, períodos adicionais de uso, upgrades temporários de plano ou acesso a
                funcionalidades específicas por tempo limitado. Tais benefícios serão informados de forma clara no
                momento de sua oferta e não configuram obrigação contratual futura.
              </p>
              <p>
                <strong>3.5 Cancelamentos e Reembolsos:</strong> Não há previsão de reembolso de assinaturas
                adquiridas. Caso o usuário solicite o cancelamento, a cobrança cessará no ciclo seguinte de
                pagamento, tendo o usuário ainda acesso à plataforma "marca e deixa" até o final do ciclo vigente
                e já pago.
              </p>
              <p>
                <strong>3.6</strong> Para cancelar a renovação automática, acesse as configurações da sua conta e
                siga as instruções indicadas.
              </p>
              <p>
                <strong>3.7</strong> Caso tenha qualquer dúvida sobre esse processo, entre em contato conosco pelo
                e-mail:{' '}
                <a href="mailto:marcaedeixa@gmail.com" className="text-black underline hover:text-gray-600">
                  marcaedeixa@gmail.com
                </a>
              </p>
            </div>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-bold text-black mb-4">4. Nossa Responsabilidade</h2>
            <div className="space-y-4">
              <p>
                <strong>4.1</strong> A "marca e deixa" não se responsabiliza por:
              </p>
              <ul className="list-[lower-alpha] list-inside ml-4 space-y-2 text-gray-600">
                <li>Caso fortuito ou força maior, nos termos da legislação aplicável;</li>
                <li>Inadimplência por parte dos Usuários;</li>
                <li>Ações de terceiros que afetem a estabilidade da Plataforma;</li>
                <li>Qualquer fraude, declaração fraudulenta ou violação do dever por parte de qualquer Usuário ou terceiro;</li>
                <li>Qualquer comentário realizado na Plataforma, ou fora dela, de maneira ofensiva, ilícita, grosseira ou desrespeitosa por Usuários ou terceiros;</li>
                <li>Qualquer inexatidão nas informações inseridas por Usuários.</li>
              </ul>
              <p>
                <strong>4.2</strong> A "marca e deixa" adota todas as medidas técnicas e organizativas para
                segurança das informações presentes em sua Plataforma. Nada obstante, nenhum sistema é
                absolutamente impenetrável, podendo, portanto, sofrer alguma espécie de invasão por hackers ou
                qualquer outro agente malicioso. Nessas hipóteses, não será a "marca e deixa" responsável por
                qualquer exclusão, obtenção, utilização ou divulgação não autorizada de informações resultantes de
                ataques que ela não poderia razoavelmente impedir.
              </p>
              <p>
                <strong>4.3</strong> Todas as comunicações que consistam em avisos na Plataforma serão
                consideradas como efetivamente recebidas e compreendidas.
              </p>
              <p>
                <strong>4.4</strong> É de inteira responsabilidade do Usuário manter o ambiente de seu dispositivo
                (computador, celular, tablet, entre outros) seguro, com o uso de ferramentas disponíveis, como
                antivírus, firewall, entre outras, de modo a contribuir na prevenção de riscos eletrônicos.
              </p>
              <p>
                <strong>4.5</strong> É possível que a Plataforma possa conter links para sites e aplicativos de
                terceiros, assim como ter tecnologias integradas. Isso não implica, de maneira alguma, que a "marca
                e deixa" endossa, verifica, garante ou possui qualquer ligação com os proprietários desses sites
                ou aplicativos, não sendo responsável pelo seu conteúdo, precisão, políticas, práticas ou opiniões.
              </p>
              <p>
                <strong>4.6</strong> Não podemos nos responsabilizar por danos causados a você pela utilização de
                nossos serviços, uma vez que apenas disponibilizamos uma ferramenta, e que o conteúdo por ela
                gerado é inserido por você.
              </p>
              <p>
                <strong>4.7</strong> Nossos serviços não garantem resultados específicos, garantias de desempenho
                ou outra expectativa.
              </p>
            </div>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-bold text-black mb-4">5. Sua Responsabilidade</h2>
            <div className="space-y-4">
              <p>
                <strong>5.1</strong> O Usuário será o único responsável por seu login e senha e responderá por
                todos os atos praticados em sua conta de acesso. Portanto, é dever do Usuário zelar pela guarda e
                confidencialidade de sua senha.
              </p>
              <p>
                <strong>5.2</strong> O Usuário compromete-se a comunicar a "marca e deixa" imediatamente a
                respeito de qualquer uso não autorizado de sua conta, bem como em caso de acesso não autorizado por
                terceiros.
              </p>
              <p>
                <strong>5.3</strong> O conteúdo por você postado é de sua responsabilidade, assim como todos os
                atos por você praticados.
              </p>
            </div>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-bold text-black mb-4">6. Exclusões Devido a Inatividade</h2>
            <div className="space-y-4">
              <p>
                <strong>6.1</strong> A "marca e deixa" se reserva o direito de excluir contas sem assinaturas
                ativas e sem qualquer atividade por período superior a dois anos, mediante comunicação prévia ao
                usuário pelo e-mail cadastrado. Todos os dados da conta serão excluídos e não poderão ser
                recuperados. Esta regra se aplica apenas a contas sem vínculo com assinaturas. Contas com licenças
                ativas não sofrerão qualquer modificação.
              </p>
              <p>
                <strong>6.2</strong> Entende-se por inatividade a falta de login em uma conta cadastrada. Se você
                tiver uma conta excluída por inatividade, poderá utilizar o mesmo email para fazer um novo cadastro
                em nosso site.
              </p>
            </div>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-bold text-black mb-4">7. Suspensão ou Cancelamento por Uso Inadequado</h2>
            <div className="space-y-4">
              <p>
                <strong>7.1</strong> Sem prejuízo de outras medidas cabíveis, a "marca e deixa" poderá advertir,
                suspender, ou cancelar temporária ou definitivamente, a conta de um Usuário, a qualquer tempo, em
                caso de:
              </p>
              <ul className="list-[lower-alpha] list-inside ml-4 space-y-2 text-gray-600">
                <li>Suspeita de ilegitimidade, ilegalidade e/ou fraude;</li>
                <li>Impossibilidade em verificar a identidade do Usuário ou se qualquer informação fornecida por ele estiver incorreta;</li>
                <li>Descumprimento dos deveres de Usuário;</li>
                <li>Prática de atos pelo Usuário que tenham causado algum dano a terceiros ou à própria "marca e deixa";</li>
                <li>Violação ou descumprimento de qualquer dispositivo destes Termos e Condições Gerais de Uso, Política de Privacidade e demais políticas e legislações aplicáveis;</li>
                <li>Não pagamento dos valores devidos a título de mensalidade para a licença de uso da Plataforma.</li>
              </ul>
              <p>
                <strong>7.2</strong> Em qualquer hipótese de suspensão da conta do Usuário, este não terá direito
                a qualquer indenização ou ressarcimento.
              </p>
            </div>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-bold text-black mb-4">8. Alcance dos Serviços e Propriedade Intelectual</h2>
            <div className="space-y-4">
              <p>
                <strong>8.1</strong> Estes Termos não geram nenhum contrato de sociedade, de mandato, de franquia,
                relação de trabalho, parceria, ou congênere entre os Usuários e a "marca e deixa", servindo somente
                para reger a utilização da Plataforma.
              </p>
              <p>
                <strong>8.2</strong> Não vale o presente instrumento como meio válido para transmissão da
                propriedade intelectual referente à Plataforma ou a qualquer conteúdo disponível, permanecendo
                este, para todos os fins de Direito, como propriedade única e exclusiva da "marca e deixa".
              </p>
              <p>
                <strong>8.2.1</strong> É vedado ao Usuário modificar, copiar, distribuir, transmitir, exibir,
                realizar, reproduzir, publicar, disponibilizar, licenciar ou criar obras derivadas a partir das
                informações coletadas na Plataforma, bem como transferir ou utilizar para fins comerciais tais
                informações, softwares, produtos ou serviços.
              </p>
              <p>
                <strong>8.2.2</strong> Quaisquer marcas, registradas ou não, ou outros elementos que remetam à
                identidade visual da "marca e deixa" são exclusivamente de sua propriedade.
              </p>
              <p>
                <strong>8.2.3</strong> As funcionalidades e conteúdo disponibilizados na Plataforma são protegidos
                pelas Leis nº 9.609/1998 (Proteção de Softwares) e 9.610/1998 (Direitos Autorais), bem como pelas
                demais disposições de propriedade intelectual aplicáveis no Brasil, sendo esta a única jurisdição
                aplicável em qualquer possível controvérsia que venha a surgir em relação a estes Termos.
              </p>
            </div>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-bold text-black mb-4">9. Problemas Decorrentes do Uso da Plataforma</h2>
            <p>
              <strong>9.1</strong> A Plataforma é disponibilizada aos Usuários no estado técnico em que se
              encontra. Apesar dos inúmeros esforços para que a Plataforma seja livre de interrupções e quaisquer
              defeitos, a "marca e deixa" não garante que as funções contidas na Plataforma atendam às necessidades
              específicas do Usuário, tampouco garante que a operação da Plataforma será ininterrupta ou livre de
              erros.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-bold text-black mb-4">10. Modificação dos Termos de Uso</h2>
            <div className="space-y-4">
              <p>
                <strong>10.1</strong> Estes Termos de Uso e os documentos integrados por referência expressam o
                acordo total entre Usuários e a "marca e deixa" em relação à utilização da Plataforma.
              </p>
              <p>
                <strong>10.2</strong> Ocasionalmente, a "marca e deixa", a seu livre e exclusivo critério, poderá
                fazer alterações nestes Termos. Quando tais alterações forem realizadas, os Usuários serão avisados
                dentro da Plataforma.
              </p>
              <p>
                <strong>10.3</strong> Caso qualquer das cláusulas destes Termos seja considerada inválida, as
                demais permanecerão hígidas e eficazes.
              </p>
            </div>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-bold text-black mb-4">11. Legislação e Foro</h2>
            <p>
              <strong>11.1</strong> Todos os itens destes Termos são regidos pelas leis vigentes na República
              Federativa do Brasil. Para todos os assuntos referentes à interpretação, ao cumprimento ou a qualquer
              outro questionamento relacionado a estes Termos, as partes concordam em se submeter ao Foro da
              Comarca de São Paulo/SP.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-bold text-black mb-4">12. Fale Conosco</h2>
            <div className="space-y-4">
              <p>
                <strong>12.1</strong> Para tratar de qualquer tema envolvendo o uso da Plataforma, ou caso haja
                qualquer espécie de dúvidas a respeito do conteúdo do presente Termo, entre em contato através do
                e-mail:{' '}
                <a href="mailto:marcaedeixa@gmail.com" className="text-black underline hover:text-gray-600">
                  marcaedeixa@gmail.com
                </a>
              </p>
              <p>
                <strong>12.2</strong> Qualquer notificação ao Usuário, quando necessária, será feita por e-mail ou
                dentro da própria Plataforma.
              </p>
              <p>
                <strong>12.3</strong> Ao utilizar a Plataforma, o Usuário declara que leu e entendeu todas as
                informações aqui constantes, aderindo a este instrumento para todos os fins e efeitos de direito.
              </p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">&copy; 2025 Marca e Deixa. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <Link href="/termos-de-uso" className="text-sm text-black font-medium">
              Termos de Uso
            </Link>
            <Link href="/politica-de-privacidade" className="text-sm text-gray-500 hover:text-black transition-colors">
              Política de Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
