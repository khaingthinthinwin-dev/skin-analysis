import { Link } from 'react-router';

export function MerchantNavbar() {
  return (
    <nav className="flex items-center justify-between p-4 border-b">
      <Link to="/merchant" className="text-xl font-bold">
        Merchant Dashboard
      </Link>
      <div className="flex items-center gap-4">
        <Link to="/merchant" className="hover:text-primary">
          Products
        </Link>
        <Link to="/merchant/promotions" className="hover:text-primary">
          Promotions
        </Link>
        <Link to="/merchant/advertisements" className="hover:text-primary">
          Advertisements
        </Link>
      </div>
    </nav>
  );
}
