import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { RowActionsMenu } from "@/components/admin/row-actions-menu";
import { SavedToast } from "@/components/admin/saved-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteCategoryAction } from "@/modules/categories/actions";
import { listCategoriesForAdmin } from "@/modules/categories/queries";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await listCategoriesForAdmin();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Suspense fallback={null}>
        <SavedToast message="Category saved." />
      </Suspense>
      <PageHeader
        title="Categories"
        action={
          <Button
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/categories/new">New category</Link>}
          />
        }
      />

      <div className="border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <Link
                    href={`/admin/categories/${category.id}/edit`}
                    className="font-medium underline"
                  >
                    {category.name}
                  </Link>
                  <div className="text-muted-foreground">{category.slug}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {category.parentName ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={category.isActive ? "default" : "secondary"}>
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <RowActionsMenu
                    editHref={`/admin/categories/${category.id}/edit`}
                    deleteAction={deleteCategoryAction}
                    deleteHiddenFields={{ id: category.id }}
                    deleteTitle={`Delete "${category.name}"?`}
                    deleteDescription="This can be restored later, but it will disappear from the storefront immediately."
                    deleteSuccessMessage="Category deleted."
                  />
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                  No categories yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
