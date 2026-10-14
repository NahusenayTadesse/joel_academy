import type { BadgeVariant } from '$lib/components/ui/variants';

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'INCOMPLETE';

export interface PaymentRecord {
	key: string;
	provider: 'MANUAL' | 'CHAPA';
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

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; variant: BadgeVariant }> = {
	PENDING: { label: 'Pending', variant: 'warning' },
	APPROVED: { label: 'Approved', variant: 'success' },
	DECLINED: { label: 'Declined', variant: 'destructive' },
	INCOMPLETE: { label: 'Not completed', variant: 'secondary' }
};
