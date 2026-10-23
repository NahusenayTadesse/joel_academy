import type { BadgeVariant } from '$lib/components/ui/variants';
import { m } from '$lib/paraglide/messages';

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'DECLINED';

export interface PaymentRecord {
	key: string;
	courseTitle: string;
	courseSlug: string;
	status: PaymentStatus;
	amount: string;
	currency: string;
	method: string;
	reference: string | null;
	submittedAt: string;
	reviewedAt: string | null;
	reason: string | null;
}

/* Labels are getters: the language is the page's, known only when they are read. */
export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
	PENDING: {
		get label() {
			return m.account_pending();
		},
		variant: 'warning'
	},
	APPROVED: {
		get label() {
			return m.account_status_approved();
		},
		variant: 'success'
	},
	DECLINED: {
		get label() {
			return m.account_status_declined();
		},
		variant: 'destructive'
	}
};
