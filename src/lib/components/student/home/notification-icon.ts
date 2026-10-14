import type { Component } from 'svelte';
import Award from '@lucide/svelte/icons/award';
import Bell from '@lucide/svelte/icons/bell';
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import KeyRound from '@lucide/svelte/icons/key-round';
import Receipt from '@lucide/svelte/icons/receipt';
import ShieldX from '@lucide/svelte/icons/shield-x';
import Smartphone from '@lucide/svelte/icons/smartphone';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

/** The icon for a notification kind (the same vocabulary as the email log). */
const ICONS: Record<string, Component> = {
	'enrollment-confirmed': GraduationCap,
	'payment-rejected': TriangleAlert,
	'receipt-received': Receipt,
	'certificate-issued': Award,
	'certificate-revoked': ShieldX,
	'password-changed': KeyRound,
	'phone-changed': Smartphone
};

export const notificationIcon = (kind: string): Component => ICONS[kind] ?? Bell;
