CREATE INDEX "addresses_profile_id_idx" ON "addresses" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "product_categories_category_id_idx" ON "product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_images_product_id_idx" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_inventory_id_idx" ON "inventory_movements" USING btree ("inventory_id");--> statement-breakpoint
CREATE INDEX "order_addresses_order_id_idx" ON "order_addresses" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_status_history_order_id_idx" ON "order_status_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_profile_id_idx" ON "orders" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "payment_transactions_payment_id_idx" ON "payment_transactions" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "reviews_product_id_idx" ON "reviews" USING btree ("product_id");