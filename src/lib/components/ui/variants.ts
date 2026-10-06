import { tv, type VariantProps } from 'tailwind-variants';

/*
 * Class recipes for the public site's primitives, copied from the original shadcn/React components
 * so the pages match exactly. The dashboard keeps using the kit's own components.
 */
export const buttonVariants = tv({
	base: 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	variants: {
		variant: {
			default:
				'bg-gradient-to-br from-brand-gradient-from to-brand-gradient-to text-primary-foreground shadow-[0_8px_20px_-6px_color-mix(in_srgb,var(--primary)_45%,transparent)] hover:brightness-95',
			destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
			outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
			secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
			ghost: 'hover:bg-accent hover:text-accent-foreground',
			link: 'text-primary underline-offset-4 hover:underline'
		},
		size: {
			default: 'h-11 px-5 py-3',
			sm: 'h-10 px-4 py-2.5 text-xs',
			lg: 'h-12 px-6 py-3',
			icon: 'h-9 w-9'
		}
	},
	defaultVariants: { variant: 'default', size: 'default' }
});

export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

export const badgeVariants = tv({
	base: 'inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
	variants: {
		variant: {
			default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
			secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
			destructive:
				'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
			success: 'border-transparent bg-success/15 text-success hover:bg-success/25',
			warning: 'border-transparent bg-warning/15 text-warning hover:bg-warning/25',
			info: 'border-transparent bg-info/15 text-info hover:bg-info/25',
			outline: 'text-foreground'
		}
	},
	defaultVariants: { variant: 'default' }
});

export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

export const inputClass =
	'flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-placeholder focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

export const textareaClass =
	'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-placeholder focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

export const labelClass =
	'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
