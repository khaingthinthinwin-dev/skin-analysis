import { useState } from 'react'
import { Search, Filter, Sparkles, Heart, ShoppingCart, Star } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function SearchFilter() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')

  const categories = ['All', 'Cleansers', 'Serums', 'Moisturizers', 'Sunscreen', 'Face Masks']

  const products = [
    { id: 1, slug: 'hydrating-gentle-foam-cleanser', name: 'Hydrating Gentle Foam Cleanser', category: 'Cleansers', price: '$24.99', match: '98% Match', rating: 4.9, reviews: 128 },
    { id: 2, slug: 'vitamin-c-glowing-serum', name: 'Vitamin C Glowing Serum', category: 'Serums', price: '$42.00', match: '95% Match', rating: 4.8, reviews: 95 },
    { id: 3, slug: 'barrier-repair-cream', name: 'Barrier Repair Cream', category: 'Moisturizers', price: '$36.50', match: '92% Match', rating: 4.9, reviews: 210 },
    { id: 4, slug: 'invisible-shield-sunscreen-spf-50', name: 'Invisible Shield Sunscreen SPF 50+', category: 'Sunscreen', price: '$28.00', match: '90% Match', rating: 4.7, reviews: 84 },
  ]

  const filteredProducts = products.filter(
    (p) =>
      (category === 'All' || p.category === category) &&
      p.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Cosmetics Search & Filter</h1>
        <p className="text-sm text-muted-foreground">Find skincare products matched to your skin profile</p>
      </div>

      {/* Search Bar & Filter Chips */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by product name, ingredient, or concern..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" /> Filter Options
        </Button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={category === cat ? 'default' : 'outline'}
            onClick={() => setCategory(cat)}
            className="rounded-full text-xs font-semibold shrink-0"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Product Results Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {filteredProducts.map((product) => (
          <Link to={`/buyer/products/${product.id}`} key={product.id}>
            <Card className="group overflow-hidden border-border/80 shadow-xs transition-transform hover:-translate-y-1">
              <div className="relative h-44 bg-gradient-to-tr from-purple-100/60 via-purple-50/30 to-pink-100/60 flex items-center justify-center p-4">
                <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-pink-500 text-white px-2 py-0.5 text-[10px] font-extrabold uppercase shadow-xs">
                  <Sparkles className="h-3 w-3" /> {product.match}
                </span>
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/80 dark:bg-zinc-800/80 shadow-md">
                  <Sparkles className="h-10 w-10 text-purple-600" />
                </div>
                <Button size="icon" variant="ghost" className="absolute top-3 right-3 text-muted-foreground hover:text-pink-500">
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-4 space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">{product.category}</span>
                  <h3 className="text-sm font-bold text-foreground line-clamp-1 mt-0.5">{product.name}</h3>
                </div>

                <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>{product.rating}</span>
                  <span className="text-muted-foreground font-normal">({product.reviews})</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-base font-extrabold text-foreground">{product.price}</span>
                  <Button size="sm" className="gap-1.5 bg-primary text-xs font-bold">
                    <ShoppingCart className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
