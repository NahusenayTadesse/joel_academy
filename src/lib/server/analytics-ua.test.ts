import { describe, expect, it } from 'vitest';
import { isBot, readUserAgent, referrerHost, utm } from './analytics-ua';

const ANDROID_CHROME =
	'Mozilla/5.0 (Linux; Android 14; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';
const IPHONE_SAFARI =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const WINDOWS_EDGE =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

describe('readUserAgent', () => {
	it('tells phones, tablets and computers apart', () => {
		expect(readUserAgent(ANDROID_CHROME)).toEqual({ device: 'mobile', browser: 'Chrome', os: 'Android' });
		expect(readUserAgent(IPHONE_SAFARI)).toEqual({ device: 'mobile', browser: 'Safari', os: 'iOS' });
		expect(readUserAgent(WINDOWS_EDGE)).toEqual({ device: 'desktop', browser: 'Edge', os: 'Windows' });
		expect(readUserAgent(IPAD).device).toBe('tablet');
	});
});

describe('isBot', () => {
	it('counts browsers and skips crawlers, previews and audits', () => {
		expect(isBot(ANDROID_CHROME)).toBe(false);
		expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
		expect(isBot('TelegramBot (like TwitterBot)')).toBe(true);
		expect(isBot(`${ANDROID_CHROME} Chrome-Lighthouse`)).toBe(true);
		expect(isBot('curl/8.5.0')).toBe(true);
		expect(isBot('')).toBe(true);
	});
});

describe('referrerHost', () => {
	it('keeps outside sites by host and drops this site', () => {
		expect(referrerHost('https://t.me/somechannel', 'ethioaischool.com')).toBe('t.me');
		expect(referrerHost('https://www.google.com/', 'ethioaischool.com')).toBe('google.com');
		expect(referrerHost('https://ethioaischool.com/am/courses', 'ethioaischool.com')).toBeNull();
		expect(referrerHost('https://www.ethioaischool.com/', 'ethioaischool.com')).toBeNull();
		expect(referrerHost('android-app://org.telegram.messenger/', 'ethioaischool.com')).toBeNull();
		expect(referrerHost('', 'ethioaischool.com')).toBeNull();
	});
});

describe('utm', () => {
	it('trims, lowercases and drops empty tags', () => {
		expect(utm(' Telegram ')).toBe('telegram');
		expect(utm('')).toBeNull();
		expect(utm(null)).toBeNull();
		expect(utm('x'.repeat(300))?.length).toBe(100);
	});
});
