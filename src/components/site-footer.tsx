import Link from "next/link";
import { SITE_NAME } from "@/lib/seo";

const FOOTER_COLUMNS = [
  {
    label: "Shop",
    links: [
      { href: "/categories/footwear", label: "Footwear" },
      { href: "/categories/mens-clothing", label: "Men's Clothing" },
      { href: "/categories/electronics", label: "Electronics" },
      { href: "/categories/home-kitchen", label: "Home & Kitchen" },
    ],
  },
  {
    label: "Help",
    links: [
      { href: "/account/orders", label: "Track Order" },
      { href: "/account/orders", label: "Returns" },
      { href: "/products", label: "Shipping Info" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/", label: "About" },
      { href: "/", label: "Privacy Policy" },
      { href: "/", label: "Terms of Service" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#0A0A0A] px-6 pt-16 pb-8 text-[#B8B8B8] sm:px-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
          <span className="text-xl font-black text-white">{SITE_NAME}</span>
          <p className="max-w-[240px] text-sm text-[#8A8A8A]">
            Quality essentials, delivered across Pakistan.
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.label} className="flex flex-col gap-3">
            <span className="text-xs font-bold tracking-wide text-white uppercase">
              {column.label}
            </span>
            {column.links.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-[#B8B8B8] hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-2 border-t border-[#262626] pt-6 text-xs text-[#6E6E6E] sm:flex-row sm:items-center sm:justify-between">
        <span>
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </span>
        <span>Pakistan · PKR ₨</span>
      </div>
    </footer>
  );
}
