import { Link } from 'react-router';

export function AdminNavbar() {
  return (
    <nav className="flex items-center justify-between p-4 border-b">
      <Link to="/admin" className="text-xl font-bold">
        Admin Dashboard
      </Link>
      <div className="flex items-center gap-4">
        <Link to="/admin" className="hover:text-primary">
          Dashboard
        </Link>
        <Link to="/admin/users" className="hover:text-primary">
          Users
        </Link>
        <Link to="/admin/merchants" className="hover:text-primary">
          Merchants
        </Link>
        <Link to="/admin/reviews" className="hover:text-primary">
          Reviews
        </Link>
        <Link to="/admin/content" className="hover:text-primary">
          Content
        </Link>
      </div>
    </nav>
  );
}
