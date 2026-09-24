import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import { formatPrice } from "@/lib/currency";
import { listCustomersForAdmin } from "@/modules/customers/queries";

export const metadata: Metadata = { title: "Customers" };

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const searchSchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  page: z.coerce.number().int().min(1).default(1),
});

export default async function AdminCustomersPage(props: PageProps<"/admin/customers">) {
  const rawSearch = await props.searchParams;
  const search = searchSchema.parse(rawSearch);
  const result = await listCustomersForAdmin(search);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-muted-foreground text-sm">{result.total} total.</p>
      </div>

      <form className="flex flex-wrap items-end gap-3" aria-label="Filter customers">
        <div className="min-w-[10rem] flex-1 space-y-1.5">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            type="search"
            placeholder="Name or email..."
            defaultValue={search.q}
          />
        </div>
        <Button type="submit" size="sm">
          Apply
        </Button>
      </form>

      <div className="border-border overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 text-right font-medium">Orders</th>
              <th className="px-3 py-2 text-right font-medium">Total spent</th>
              <th className="px-3 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {result.items.map((customer) => (
              <tr key={customer.id}>
                <td className="px-3 py-2">
                  <Link href={`/admin/customers/${customer.id}`} className="font-medium underline">
                    {customer.fullName ?? "—"}
                  </Link>
                </td>
                <td className="text-muted-foreground px-3 py-2">{customer.email}</td>
                <td className="px-3 py-2 text-right tabular-nums">{customer.orderCount}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatPrice(customer.totalSpent)}
                </td>
                <td className="text-muted-foreground px-3 py-2">
                  {new Date(customer.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-3 py-8 text-center">
                  No customers match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        buildHref={(page) => {
          const params = new URLSearchParams();
          if (search.q) params.set("q", search.q);
          params.set("page", String(page));
          return `/admin/customers?${params.toString()}`;
        }}
      />
    </div>
  );
}
