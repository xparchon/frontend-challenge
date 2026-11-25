import { Link } from '@tanstack/react-router'
import { CatalogPage } from '@/features/catalog/CatalogPage'

export function MarketPage() {
  return (
    <>
      <header className="border-b border-kurio-line/40">
        <div className="layout-container py-10 md:py-14">
          <nav aria-label="Trilha de navegação" className="mb-5 text-sm text-kurio-cream/60">
            <Link to="/" search={{ search: '', category: '', network: '', maxPrice: 12.3, sort: 'recent', page: 1 }} className="hover:text-kurio-goldStrong">Início</Link>
            <span className="mx-2">/</span>
            <span className="text-kurio-cream">Mercado</span>
          </nav>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-kurio-goldStrong">Kurio marketplace</p>
          <h1 className="mt-3 text-3xl font-semibold md:text-5xl">Explore o mercado de NFTs</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-kurio-cream/70">
            Descubra coleções e obras digitais. Pesquise, filtre e compare itens disponíveis para colecionar.
          </p>
        </div>
      </header>
      <CatalogPage showHero={false} basePath="/market" />
    </>
  )
}
