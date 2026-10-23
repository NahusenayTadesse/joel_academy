import type { Component } from 'svelte';
import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
import Award from '@lucide/svelte/icons/award';
import BookOpen from '@lucide/svelte/icons/book-open';
import CreditCard from '@lucide/svelte/icons/credit-card';
import KeyRound from '@lucide/svelte/icons/key-round';
import LifeBuoy from '@lucide/svelte/icons/life-buoy';
import ShieldCheck from '@lucide/svelte/icons/shield-check';
import UserCog from '@lucide/svelte/icons/user-cog';
import { m } from '$lib/paraglide/messages';

export interface HelpArticle {
	question: string;
	answer: string;
}

export interface HelpCategory {
	icon: Component;
	title: string;
	articles: HelpArticle[];
}

/*
 * The text is read through getters, so each read returns the current request's language while the
 * export keeps its shape (an array of plain-looking objects) for every importer.
 */
function article(question: () => string, answer: () => string): HelpArticle {
	return {
		get question() {
			return question();
		},
		get answer() {
			return answer();
		}
	};
}

function category(icon: Component, title: () => string, articles: HelpArticle[]): HelpCategory {
	return {
		icon,
		get title() {
			return title();
		},
		articles
	};
}

export const HELP_CATEGORIES: HelpCategory[] = [
	category(BookOpen, m.info_help_cat_getting_started, [
		article(m.info_help_getting_started_q1, m.info_help_getting_started_a1),
		article(m.info_help_getting_started_q2, m.info_help_getting_started_a2),
		article(m.info_help_getting_started_q3, m.info_help_getting_started_a3)
	]),
	category(UserCog, m.info_help_cat_account, [
		article(m.info_help_account_q1, m.info_help_account_a1),
		article(m.info_help_account_q2, m.info_help_account_a2),
		article(m.info_help_account_q3, m.info_help_account_a3)
	]),
	category(KeyRound, m.info_help_cat_auth, [
		article(m.info_help_auth_q1, m.info_help_auth_a1),
		article(m.info_help_auth_q2, m.info_help_auth_a2),
		article(m.info_help_auth_q3, m.info_help_auth_a3)
	]),
	category(BookOpen, m.info_help_cat_courses, [
		article(m.info_help_courses_q1, m.info_help_courses_a1),
		article(m.info_help_courses_q2, m.info_help_courses_a2),
		article(m.info_help_courses_q3, m.info_help_courses_a3)
	]),
	category(CreditCard, m.info_help_cat_payments, [
		article(m.info_help_payments_q1, m.info_help_payments_a1),
		article(m.info_help_payments_q2, m.info_help_payments_a2),
		article(m.info_help_payments_q3, m.info_help_payments_a3)
	]),
	category(Award, m.info_help_cat_certificates, [
		article(m.info_help_certificates_q1, m.info_help_certificates_a1),
		article(m.info_help_certificates_q2, m.info_help_certificates_a2),
		article(m.info_help_certificates_q3, m.info_help_certificates_a3)
	]),
	category(ShieldCheck, m.info_help_cat_security, [
		article(m.info_help_security_q1, m.info_help_security_a1),
		article(m.info_help_security_q2, m.info_help_security_a2),
		article(m.info_help_security_q3, m.info_help_security_a3)
	]),
	category(BookOpen, m.info_help_cat_learning, [
		article(m.info_help_learning_q1, m.info_help_learning_a1),
		article(m.info_help_learning_q2, m.info_help_learning_a2),
		article(m.info_help_learning_q3, m.info_help_learning_a3)
	]),
	category(AlertTriangle, m.info_help_cat_troubleshooting, [
		article(m.info_help_troubleshooting_q1, m.info_help_troubleshooting_a1),
		article(m.info_help_troubleshooting_q2, m.info_help_troubleshooting_a2),
		article(m.info_help_troubleshooting_q3, m.info_help_troubleshooting_a3)
	]),
	category(LifeBuoy, m.info_help_cat_support, [
		article(m.info_help_support_q1, m.info_help_support_a1),
		article(m.info_help_support_q2, m.info_help_support_a2),
		article(m.info_help_support_q3, m.info_help_support_a3)
	])
];
