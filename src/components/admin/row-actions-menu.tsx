"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * One self-contained "row actions" cell for admin list tables: a kebab-menu dropdown
 * (Edit + Delete) plus the Delete confirmation dialog. The dialog is a *sibling* of the
 * `DropdownMenu` inside this same always-mounted component, not nested inside
 * `DropdownMenuContent` — Base UI's menu unmounts its content when it closes, which would
 * otherwise destroy the dialog's open state before it could ever show.
 */
export function RowActionsMenu({
  editHref,
  deleteAction,
  deleteHiddenFields,
  deleteTitle,
  deleteDescription,
  deleteSuccessMessage,
  extraItems,
}: {
  editHref: string;
  deleteAction: (formData: FormData) => void | Promise<void>;
  deleteHiddenFields: Record<string, string>;
  deleteTitle: string;
  deleteDescription: string;
  deleteSuccessMessage: string;
  extraItems?: React.ReactNode;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon">
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={editHref}>Edit</Link>} />
          {extraItems}
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <form
            action={deleteAction}
            onSubmit={() => {
              setConfirmOpen(false);
              toast.success(deleteSuccessMessage);
            }}
          >
            {Object.entries(deleteHiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction type="submit" variant="destructive">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
