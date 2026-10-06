import { describe, expect, it } from 'vitest';
import {
	DEFAULT_LANDING,
	announcementVersion,
	isSafeLink,
	landingSchema,
	mergeLanding
} from './landing';
import { FAQ_ITEMS } from './faq.data';

describe('isSafeLink', () => {
	it('accepts site paths and https links', () => {
		for (const link of ['/courses', '/courses?search=ai#top', '/', 'https://t.me/academy']) {
			expect(isSafeLink(link), link).toBe(true);
		}
	});

	it('refuses script, protocol-relative and plain-http links', () => {
		for (const link of [
			'javascript:alert(1)',
			'JavaScript:alert(1)',
			' javascript:alert(1)',
			'data:text/html,<script>alert(1)</script>',
			'//evil.example',
			'/\\evil.example',
			'http://example.com',
			'courses',
			'https://',
			'/courses\nx'
		]) {
			expect(isSafeLink(link), link).toBe(false);
		}
	});
});

describe('landingSchema', () => {
	it('accepts the defaults, which are the shipped content', () => {
		expect(landingSchema.safeParse(DEFAULT_LANDING).success).toBe(true);
		expect(DEFAULT_LANDING.faqs).toHaveLength(FAQ_ITEMS.length);
		expect(Object.values(DEFAULT_LANDING.sections).every(Boolean)).toBe(true);
	});

	it('refuses a javascript: button link', () => {
		const bad = structuredClone(DEFAULT_LANDING);
		bad.hero.primaryCtaUrl = 'javascript:alert(1)';
		const result = landingSchema.safeParse(bad);
		expect(result.success).toBe(false);
		expect(result.error?.issues[0].path).toEqual(['hero', 'primaryCtaUrl']);
	});

	it('takes a stored upload or a /images path as the hero image, nothing else', () => {
		const withImage = (image: string) => {
			const value = structuredClone(DEFAULT_LANDING);
			value.hero.image = image;
			return landingSchema.safeParse(value).success;
		};
		expect(withImage('439a3baf-5073-40bf-b406-faff741676da.png')).toBe(true);
		expect(withImage('/images/hero/network-abstract.jpg')).toBe(true);
		expect(withImage('https://evil.example/x.png')).toBe(false);
		expect(withImage('../.env')).toBe(false);
	});

	it('allows an announcement without a link, but not a bad one', () => {
		const value = structuredClone(DEFAULT_LANDING);
		value.announcement.linkUrl = '';
		value.announcement.linkText = '';
		expect(landingSchema.safeParse(value).success).toBe(true);
		value.announcement.linkUrl = 'javascript:void(0)';
		expect(landingSchema.safeParse(value).success).toBe(false);
	});
});

describe('mergeLanding', () => {
	it('gives the defaults for nothing stored', () => {
		expect(mergeLanding(undefined)).toEqual(DEFAULT_LANDING);
		expect(mergeLanding(null)).toEqual(DEFAULT_LANDING);
	});

	it('keeps good parts and replaces only the broken ones', () => {
		const merged = mergeLanding({
			hero: { ...DEFAULT_LANDING.hero, heading: 'Stored heading' },
			finalCta: { heading: 'missing the rest' },
			faqs: [{ question: 'Only one?', answer: 'Yes.' }],
			unknown: 1
		});
		expect(merged.hero.heading).toBe('Stored heading');
		expect(merged.finalCta).toEqual(DEFAULT_LANDING.finalCta);
		expect(merged.faqs).toEqual([{ question: 'Only one?', answer: 'Yes.' }]);
		expect(merged).not.toHaveProperty('unknown');
	});

	it('never shares objects with the defaults', () => {
		const merged = mergeLanding({});
		merged.hero.heading = 'changed';
		expect(DEFAULT_LANDING.hero.heading).not.toBe('changed');
	});
});

describe('announcementVersion', () => {
	it('changes with the wording, link or name, not otherwise', () => {
		const base = DEFAULT_LANDING.announcement;
		const version = announcementVersion(base);
		expect(announcementVersion({ ...base, enabled: false })).toBe(version);
		expect(announcementVersion({ ...base, text: base.text + '!' })).not.toBe(version);
		expect(announcementVersion({ ...base, linkUrl: '/pricing' })).not.toBe(version);
		expect(announcementVersion({ ...base, id: 'other' })).not.toBe(version);
	});
});
