import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { PageHeader } from "@/components/admin/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Customers" description={`${result.total} total.`} />

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

      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Total spent</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <Link href={`/admin/customers/${customer.id}`} className="font-medium underline">
                    {customer.fullName ?? "—"}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                <TableCell className="text-right tabular-nums">{customer.orderCount}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPrice(customer.totalSpent)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(customer.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
            {result.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  No customers match this search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
