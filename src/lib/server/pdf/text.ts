import { rgb, type PDFFont, type RGB } from 'pdf-lib';
// Ethiopic (Amharic, Tigrinya…) glyphs, which the PDF standard fonts lack. Inlined into the
// server bundle so the deployed build needs no font files beside it. Droid Sans Ethiopic,
// Apache-2.0 (see ../fonts/LICENSE.md).
import ethiopicRegularData from '../fonts/DroidSansEthiopic-Regular.ttf?inline';
import ethiopicBoldData from '../fonts/DroidSansEthiopic-Bold.ttf?inline';

/*
 * Text helpers the generated PDFs share (the certificate, course outlines, handouts). The
 * standard PDF fonts cover Latin script only (WinAnsi); Ethiopic text is drawn in an embedded
 * fallback font, and anything neither can draw prints as "?".
 */

export const ETHIOPIC = /[ሀ-᎟ⶀ-⷟꬀-꬯]/u;

const fontBytes = (dataUri: string) => Buffer.from(dataUri.slice(dataUri.indexOf(',') + 1), 'base64');

export const ethiopicRegularBytes = () => fontBytes(ethiopicRegularData);
export const ethiopicBoldBytes = () => fontBytes(ethiopicBoldData);

/** `#RRGGBB` as a pdf-lib colour. */
export const hex = (value: string): RGB =>
	rgb(parseInt(value.slice(1, 3), 16) / 255, parseInt(value.slice(3, 5), 16) / 255, parseInt(value.slice(5, 7), 16) / 255);

/** Common symbols outside WinAnsi, as the nearest thing the standard fonts can draw. */
const STAND_INS: Record<string, string> = {
	'→': '->',
	'←': '<-',
	'⇒': '=>',
	'↔': '<->',
	'≥': '>=',
	'≤': '<=',
	'≠': '!=',
	'★': '*',
	'☆': '*',
	'✓': '+',
	'✔': '+',
	'✗': 'x',
	'✘': 'x',
	'−': '-',
	'\u2009': ' ',
	'\u202f': ' '
};

/** `text` with every character the font cannot draw replaced, so drawing it never throws. */
export function drawable(text: string, font: PDFFont): string {
	const supported = new Set(font.getCharacterSet());
	return Array.from(text.normalize('NFC'))
		.map((char) => {
			if (supported.has(char.codePointAt(0)!)) return char;
			const standIn = STAND_INS[char];
			if (standIn && Array.from(standIn).every((part) => supported.has(part.codePointAt(0)!))) return standIn;
			// An accented letter the font lacks still reads as its base letter.
			const base = char.normalize('NFD').replace(/[̀-ͯ]/g, '');
			return base && Array.from(base).every((part) => supported.has(part.codePointAt(0)!)) ? base : '?';
		})
		.join('');
}

export interface Run {
	text: string;
	font: PDFFont;
}

/**
 * Splits `text` into runs, each in the font that can draw it: the Latin font where it can, the
 * fallback (Ethiopic) where only it can. A title like "የAI መሰረታዊ — AI Foundations" mixes both.
 */
export function runsOf(text: string, font: PDFFont, fallback?: PDFFont): Run[] {
	const primary = new Set(font.getCharacterSet());
	const secondary = fallback ? new Set(fallback.getCharacterSet()) : null;
	const runs: Run[] = [];
	for (const char of Array.from(text.normalize('NFC'))) {
		const code = char.codePointAt(0)!;
		const last = runs[runs.length - 1];
		// The Latin font unless only the fallback has the character; a space stays in its run.
		const latin = primary.has(code) || !secondary?.has(code);
		const use = char === ' ' && last ? last.font : latin ? font : fallback!;
		if (last && last.font === use) last.text += char;
		else runs.push({ text: char, font: use });
	}
	return runs.map((run) => ({ ...run, text: drawable(run.text, run.font) }));
}

export function runsWidth(runs: Run[], size: number, spacing = 0) {
	const chars = runs.reduce((total, run) => total + Array.from(run.text).length, 0);
	return runs.reduce((total, run) => total + run.font.widthOfTextAtSize(run.text, size), 0) + spacing * Math.max(0, chars - 1);
}
