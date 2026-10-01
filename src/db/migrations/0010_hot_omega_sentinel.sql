CREATE TYPE "public"."homepage_section_key" AS ENUM('hero', 'categories', 'featured_products', 'promo', 'newsletter');--> statement-breakpoint
CREATE TABLE "homepage_sections" (
	"key" "homepage_section_key" PRIMARY KEY NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
