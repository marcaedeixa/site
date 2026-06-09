import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade — Marca e Deixa',
  description: 'Política de Privacidade da plataforma Marca e Deixa.',
}

export default function PoliticaDePrivacidadePage() {
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
          <h1 className="text-4xl font-black text-black mb-4">Política de Privacidade</h1>
          <p className="text-gray-500">Última atualização: junho de 2025</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

          <p>
            Por este documento, asseguramos e garantimos que todas as informações dos nossos usuários não serão
            comercializadas ou divulgadas em nenhuma circunstância. Seguimos todos os protocolos de segurança
            recomendados e não medimos esforços para preservá-los de qualquer desvio.
          </p>

          <p>
            Suas informações serão armazenadas, processadas e acessadas desde que seja respeitada a legislação
            brasileira, principalmente as disposições da Lei nº 12.965/14 (Marco Civil da Internet) e do Decreto
            nº 8.771, de 11/05/16. Os dados pessoais que você informar serão criptografados ao serem armazenados
            em nosso banco de dados, que é reservado e com acesso restrito.
          </p>

          <p>
            Nossos servidores estão hospedados na Amazon Web Services (AWS), por meio da plataforma Supabase, bem
            protegidos por políticas de segurança, assegurando a privacidade, autenticidade e inviolabilidade das
            informações, conforme determina o Marco Civil da Internet.
          </p>

          <p>
            Poderemos alterar esta Política de Privacidade a qualquer tempo, com ou sem aviso prévio. Pedimos que
            periodicamente você acesse este documento para que possa manter-se atualizado e ser informado sobre
            qualquer alteração.
          </p>

          <p>
            Os elementos e ferramentas do Site/Web são de nossa titularidade ou são licenciados por nós, nos
            termos da legislação vigente. A utilização de qualquer elemento ou ferramenta do Site apenas poderá
            ser feita com nossa concordância por escrito.
          </p>

          <section>
            <h2 className="text-xl font-bold text-black mb-4">Sobre a Lei Geral de Proteção de Dados</h2>
            <div className="space-y-4">
              <p>
                Todos os dados coletados durante seu uso da "marca e deixa" são exclusivamente para fins de
                aperfeiçoamento da sua experiência conosco e/ou implementação da regra de negócio básica do
                sistema. Não coletamos informações suas para outros fins que não sejam este.
              </p>
              <p>
                Para solicitar a remoção completa de todas as suas informações cadastradas na "marca e deixa",
                conforme exigido pela Lei Geral de Proteção de Dados Brasileira, basta você realizar o pedido de
                cancelamento da sua conta, enviando um e-mail para{' '}
                <a href="mailto:marcaedeixa@gmail.com" className="text-black underline hover:text-gray-600">
                  marcaedeixa@gmail.com
                </a>
                . Nós não armazenamos dado algum de contas excluídas.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-black mb-4">Disposições Finais</h2>
            <div className="space-y-4">
              <p>
                Esta Política de Privacidade é regida pelas leis brasileiras. Eventuais controvérsias existentes
                em relação a ela ou ao uso do Site serão solucionadas entre o cliente e a plataforma no Foro da
                Comarca de São Paulo/SP.
              </p>
              <p>
                Podemos não exigir de Você o cumprimento de alguma cláusula, o que não representará uma renúncia
                de direito ou cláusula. Caso algum item desta Política de Privacidade venha a ser declarado nulo
                ou não aplicável, os outros termos continuarão se aplicando e permanecerão em vigor e efeito.
              </p>
            </div>
          </section>

          <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <h2 className="text-lg font-bold text-black mb-3">Dúvidas?</h2>
            <p className="text-gray-600">
              Entre em contato pelo e-mail{' '}
              <a href="mailto:marcaedeixa@gmail.com" className="text-black underline hover:text-gray-600">
                marcaedeixa@gmail.com
              </a>
              . Respondemos em até 2 dias úteis.
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">&copy; 2025 Marca e Deixa. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <Link href="/termos-de-uso" className="text-sm text-gray-500 hover:text-black transition-colors">
              Termos de Uso
            </Link>
            <Link href="/politica-de-privacidade" className="text-sm text-black font-medium">
              Política de Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
