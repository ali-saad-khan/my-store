import Link from "next/link";

const ADMIN_NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/analytics", label: "Analytics" },
];

export function AdminNav() {
  return (
    <nav className="flex flex-wrap gap-1 border-b px-4 py-2">
      {ADMIN_NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-2.5 py-1.5 text-sm"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
