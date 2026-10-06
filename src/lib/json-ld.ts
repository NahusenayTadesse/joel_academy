/*
 * Schema.org builders ported from the original lib/json-ld.ts. URLs are made absolute against the
 * request origin, which stands in for the old NEXT_PUBLIC_SITE_URL setting.
 */

export interface BreadcrumbEntry {
	label: string;
	href?: string;
}

export interface ItemListJsonLdEntry {
	name: string;
	url: string;
}

export function buildBreadcrumbJsonLd(origin: string, items: BreadcrumbEntry[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.label,
			...(item.href ? { item: `${origin}${item.href}` } : {})
		}))
	};
}

export function buildItemListJsonLd(origin: string, items: ItemListJsonLdEntry[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'ItemList',
		itemListElement: items.map((item, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: item.name,
			url: `${origin}${item.url}`
		}))
	};
}

/** A JSON-LD script tag; `<` is escaped so data can never close the tag early. */
export function jsonLdScript(data: object | object[]): string {
	return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
