export function SiteFooter() {
  return (
    <footer className="home-footer layout-container mt-24 mb-6 flex h-[680px] flex-col bg-kurio-surface">
      <div className="grid flex-1 gap-6 px-5 py-5 md:min-h-[270px] md:grid-cols-4 md:gap-0 md:px-10 md:py-8">
        {[
          ['W', 'Segurança da carteira', 'Proteja sua carteira e colecione arte digital verificada com confiança.'],
          ['C', 'Criadores em destaque', 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.'],
          ['D', 'Alertas de lançamentos', 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.'],
        ].map(([icon, title, copy]) => (
          <article key={title} className="border-b border-kurio-gold/40 pb-5 md:border-b-0 md:border-r md:px-6 md:pb-0 md:first:pl-0">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-kurio-goldStrong text-lg font-bold text-kurio-ink md:h-[76px] md:w-[76px] md:text-xl">{icon}</span>
            <h2 className="mt-4 text-sm font-bold md:text-base">{title}</h2>
            <p className="mt-3 max-w-[210px] text-xs leading-5 text-kurio-cream/85">{copy}</p>
          </article>
        ))}
        <form onSubmit={(event) => event.preventDefault()} className="md:px-6">
          <h2 className="max-w-[230px] text-sm font-bold leading-5 md:text-base">Antecipe-se ao próximo lançamento</h2>
          <div className="mt-4 flex h-10">
            <input type="email" aria-label="E-mail para novidades" placeholder="digite seu e-mail..." className="min-w-0 flex-1 bg-kurio-ink px-3 text-xs outline-none focus:ring-1 focus:ring-kurio-goldStrong" />
            <button type="submit" className="rounded-r-md bg-kurio-goldStrong px-4 text-sm font-bold text-kurio-ink">Enviar</button>
          </div>
          <p className="mt-3 max-w-[240px] text-xs leading-5 text-kurio-cream/85">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
        </form>
      </div>

      <div className="grid min-h-[82px] shrink-0 items-center gap-3 border-t border-kurio-line bg-[#3A210F] px-5 py-5 text-xs md:grid-cols-4 md:px-8">
        <p className="font-bold tracking-[0.16em]">KURIO</p>
        <p>Feito para colecionadores,<br />criadores e cultura.</p>
        <p>contato@email.com</p>
        <p>+55 11 4002 8922</p>
      </div>

      <div className="grid min-h-[235px] shrink-0 gap-6 border-t border-kurio-line bg-kurio-ink/50 px-5 py-6 text-xs sm:grid-cols-2 md:grid-cols-4 md:px-8">
        <section>
          <h2 className="mb-4 text-sm font-bold">Meu perfil</h2>
          <ul className="space-y-2.5 text-kurio-cream/85">
            <li>Meu perfil</li><li>Minha coleção</li><li>Atividade</li><li>Estúdio do criador</li><li>Lista de interesse</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-4 text-sm font-bold">Central de ajuda</h2>
          <ul className="space-y-2.5 text-kurio-cream/85">
            <li>Central de ajuda</li><li>Como comprar NFTs</li><li>Carteira e segurança</li><li>Política do mercado</li><li>Denunciar item</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-4 text-sm font-bold">Coleções</h2>
          <ul className="space-y-2.5 text-kurio-cream/85">
            <li>Arte digital</li><li>Fotografia</li><li>Música</li><li>Arte 3D</li><li>Utilidade</li>
          </ul>
        </section>
        <section>
          <h2 className="mb-4 text-sm font-bold">Redes sociais</h2>
          <div className="flex gap-1.5 text-sm font-bold text-kurio-goldStrong" aria-label="Redes sociais">
            {['f', '◎', '𝕏', 'in', '▶'].map((network) => <span key={network} className="grid h-8 w-8 place-items-center border border-kurio-gold/50">{network}</span>)}
          </div>
          <h3 className="mb-2 mt-5 text-sm font-bold">Carteiras compatíveis</h3>
          <p className="inline-block rounded border border-kurio-line px-2 py-1 text-[9px] text-kurio-goldStrong">METAMASK &nbsp; · &nbsp; WALLETCONNECT &nbsp; · &nbsp; COINBASE</p>
        </section>
      </div>

      <p className="grid min-h-[50px] shrink-0 place-items-center border-t border-kurio-line px-5 text-center text-xs text-kurio-cream/60">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
