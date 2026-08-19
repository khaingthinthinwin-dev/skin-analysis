import { Link } from 'react-router';

export function BuyerNavbar() {
  return (
    <nav className="flex items-center justify-between p-4 border-b">
      <Link to="/" className="text-xl font-bold">
        Cosmetics Finder
      </Link>
      <div className="flex items-center gap-4">
        <Link to="/buyer" className="hover:text-primary">
          Dashboard
        </Link>
        <Link to="/buyer/cart" className="hover:text-primary">
          Cart
        </Link>
        <Link to="/buyer/wishlist" className="hover:text-primary">
          Wishlist
        </Link>
      </div>
    </nav>
  );
}
