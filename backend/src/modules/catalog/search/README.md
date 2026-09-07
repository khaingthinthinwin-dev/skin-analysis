# Search Module [TRPH]

Developer: TRPH

Responsibilities:
- Product keyword search with partial matching
- Category tree browsing
- Multi-dimensional filtering (skin type, ingredients, price, rating)
- Sorting and pagination
- Sponsored advertisement display (search_top placement)
- Redis cache-aside for products, categories, and ads

Endpoints:
- GET /products — Search/filter/sort/paginate products (public)
- GET /categories — Category tree (public)
- GET /products/:slug — Product detail by slug (public)
- GET /ads?placement=search_top — Sponsored ads (public)
