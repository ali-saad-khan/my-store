import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { Pagination } from "@/components/pagination";
import { formatPrice } from "@/lib/currency";
import { requireUser } from "@/modules/auth/session";
import { listOrdersForProfile } from "@/modules/orders/queries";
import { ORDER_STATUS_LABELS } from "@/modules/orders/status";

export const metadata: Metadata = { title: "Your orders" };

const pageSearchSchema = z.object({ page: z.coerce.number().int().min(1).default(1) });

export default async function AccountOrdersPage(props: PageProps<"/account/orders">) {
  const user = await requireUser();
  const rawSearch = await props.searchParams;
  const { page } = pageSearchSchema.parse(rawSearch);

  const result = await listOrdersForProfile(user.id, page);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Your orders</h1>

      {result.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">You haven&apos;t placed any orders yet.</p>
      ) : (
        <div className="border-border divide-border divide-y rounded-lg border">
          {result.items.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.orderNumber}`}
              className="hover:bg-muted/50 flex items-center justify-between px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="text-muted-foreground">
                  {new Date(order.placedAt).toLocaleDateString()} · {order.items.length} item
                  {order.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatPrice(order.total)}</p>
                <p className="text-muted-foreground">{ORDER_STATUS_LABELS[order.status]}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        buildHref={(page) => `/account/orders?page=${page}`}
      />
    </div>
  );
}
