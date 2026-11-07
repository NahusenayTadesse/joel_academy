import {
	PDFDocument,
	type PDFFont,
	type PDFPage,
	PDFName,
	PDFString,
	rgb,
	setCharacterSpacing,
	StandardFonts,
	type RGB
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import QRCode from 'qrcode';
import { isoDay } from '$lib/components/student/certificate-format';
import { drawable, ETHIOPIC, ethiopicBoldBytes, ethiopicRegularBytes, hex, runsOf, runsWidth } from './pdf/text';

export { drawable };

/*
 * The certificate as a PDF: the same A4-landscape sheet as `certificate-sheet.svelte` (and the
 * original app's PDFKit generator it was redrawn from), with the QR code that links to the public
 * verification page. Coordinates below are the sheet's (842 x 595 pt, y downwards); `Y` turns
 * them into PDF space.
 *
 * The standard PDF fonts cover Latin script only (WinAnsi); Ethiopic names and titles are drawn
 * in an embedded fallback font (`./pdf/text`), and anything else prints as "?" — the on-screen
 * certificate, and printing it, show every script.
 */

export interface CertificatePdfInput {
	academyName: string;
	recipientName: string;
	courseTitle: string;
	code: string;
	issuedAt: Date;
	verificationUrl: string;
}

const W = 842;
const H = 595;
const Y = (y: number) => H - y;

const C = {
	primary: hex('#012A51'),
	accent: hex('#0A5299'),
	gold: hex('#C5A059'),
	borderGold: hex('#DFC68E'),
	darkInk: hex('#0F172A'),
	mutedInk: hex('#64748B'),
	cardBg: hex('#F5F9FD'),
	canvas: hex('#FBFCFE'),
	sealBg: hex('#FBF8EE'),
	rule: hex('#E2E8F0'),
	white: rgb(1, 1, 1),
	black: rgb(0, 0, 0)
};

const QR_OPTIONS = { errorCorrectionLevel: 'M' as const, margin: 1 };

/** The QR code for a verification link as a PNG, the way the original generator made it. */
export function verificationQrPng(url: string): Promise<Buffer> {
	return QRCode.toBuffer(url, { ...QR_OPTIONS, type: 'png', width: 240 });
}

/**
 * The QR code for a verification link as one SVG path over a `size` x `size` grid of modules (no
 * quiet zone), for the on-screen certificate.
 */
export function verificationQrPath(url: string): { size: number; path: string } {
	const { modules } = QRCode.create(url, { errorCorrectionLevel: QR_OPTIONS.errorCorrectionLevel });
	let path = '';
	for (let row = 0; row < modules.size; row += 1) {
		for (let col = 0; col < modules.size; col += 1) {
			if (modules.get(row, col)) path += `M${col} ${row}h1v1h-1z`;
		}
	}
	return { size: modules.size, path };
}

interface TextOptions {
	font: PDFFont;
	size: number;
	color: RGB;
	spacing?: number;
	/** Used instead of `font` when the text has characters only it can draw (Ethiopic names). */
	fallback?: PDFFont;
	/** Shrinks to fit this width, down to `minSize`, then shortens with an ellipsis. */
	maxWidth?: number;
	minSize?: number;
}

/** Draws `value` centred on `cx` with its baseline at sheet `y`, mixing fonts where needed. */
function centered(page: PDFPage, value: string, cx: number, y: number, options: TextOptions) {
	const { font, fallback, color, spacing = 0, maxWidth, minSize = 8 } = options;
	let text = value.normalize('NFC');
	let runs = runsOf(text, font, fallback);
	let size = options.size;
	if (maxWidth) {
		while (size > minSize && runsWidth(runs, size, spacing) > maxWidth) size -= 0.5;
		if (runsWidth(runs, size, spacing) > maxWidth) {
			const chars = Array.from(text);
			while (chars.length > 1 && runsWidth(runsOf(`${chars.join('')}…`, font, fallback), size, spacing) > maxWidth) chars.pop();
			text = `${chars.join('').trimEnd()}…`;
			runs = runsOf(text, font, fallback);
		}
	}
	let x = cx - runsWidth(runs, size, spacing) / 2;
	if (spacing) page.pushOperators(setCharacterSpacing(spacing));
	for (const run of runs) {
		page.drawText(run.text, { x, y: Y(y), size, font: run.font, color });
		x += run.font.widthOfTextAtSize(run.text, size) + spacing * Array.from(run.text).length;
	}
	if (spacing) page.pushOperators(setCharacterSpacing(0));
}

/** A path in sheet coordinates (SVG syntax). */
function path(page: PDFPage, d: string, style: { fill?: RGB; stroke?: RGB; width?: number }) {
	page.drawSvgPath(d, {
		x: 0,
		y: H,
		color: style.fill,
		borderColor: style.stroke,
		borderWidth: style.stroke ? (style.width ?? 1) : undefined
	});
}

function line(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color: RGB, thickness: number) {
	page.drawLine({ start: { x: x1, y: Y(y1) }, end: { x: x2, y: Y(y2) }, color, thickness });
}

function rect(page: PDFPage, x: number, y: number, width: number, height: number, style: { fill?: RGB; stroke?: RGB; width?: number }) {
	page.drawRectangle({
		x,
		y: Y(y + height),
		width,
		height,
		color: style.fill,
		borderColor: style.stroke,
		borderWidth: style.stroke ? (style.width ?? 1) : undefined
	});
}

function roundedRect(x: number, y: number, width: number, height: number, r: number) {
	return `M${x + r} ${y}H${x + width - r}A${r} ${r} 0 0 1 ${x + width} ${y + r}V${y + height - r}A${r} ${r} 0 0 1 ${x + width - r} ${y + height}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + height - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

function star(cx: number, cy: number, outer: number, inner: number) {
	const points: string[] = [];
	for (let i = 0; i < 10; i += 1) {
		const radius = i % 2 === 0 ? outer : inner;
		const angle = (Math.PI / 2) * 3 + (i * Math.PI) / 5;
		points.push(`${(cx + Math.cos(angle) * radius).toFixed(2)} ${(cy + Math.sin(angle) * radius).toFixed(2)}`);
	}
	return `M${points.join('L')}Z`;
}

function circle(page: PDFPage, cx: number, cy: number, r: number, style: { fill?: RGB; stroke?: RGB; width?: number }) {
	page.drawCircle({
		x: cx,
		y: Y(cy),
		size: r,
		color: style.fill,
		borderColor: style.stroke,
		borderWidth: style.stroke ? (style.width ?? 1) : undefined
	});
}

/** Builds the certificate PDF. */
export async function certificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	pdf.setTitle(`Certificate of Completion – ${input.courseTitle}`);
	pdf.setAuthor(input.academyName);
	pdf.setSubject(`${input.recipientName} – ${input.courseTitle} (${input.code})`);
	pdf.setKeywords(['certificate', input.code]);
	pdf.setCreator(input.academyName);
	pdf.setProducer(input.academyName);
	pdf.setCreationDate(input.issuedAt);

	const page = pdf.addPage([W, H]);
	pdf.registerFontkit(fontkit);
	// Ethiopic fonts are embedded (subset) only when a name or title needs them.
	const needsEthiopic = [input.recipientName, input.courseTitle, input.academyName].some((text) => ETHIOPIC.test(text));
	const [regular, bold, italic, qr, ethiopic, ethiopicBold] = await Promise.all([
		pdf.embedFont(StandardFonts.Helvetica),
		pdf.embedFont(StandardFonts.HelveticaBold),
		pdf.embedFont(StandardFonts.HelveticaOblique),
		verificationQrPng(input.verificationUrl).then((png) => pdf.embedPng(png)),
		needsEthiopic ? pdf.embedFont(ethiopicRegularBytes(), { subset: true }) : undefined,
		needsEthiopic ? pdf.embedFont(ethiopicBoldBytes(), { subset: true }) : undefined
	]);

	// Canvas and the triple border.
	rect(page, 0, 0, W, H, { fill: C.canvas });
	rect(page, 14, 14, 814, 567, { fill: C.white });
	rect(page, 18, 18, 806, 559, { stroke: C.primary, width: 3 });
	rect(page, 26, 26, 790, 543, { stroke: C.gold, width: 1 });
	rect(page, 30, 30, 782, 535, { stroke: C.borderGold, width: 0.5 });

	// Corner ornaments: a gold diamond around a blue one, with two ticks, turned to each corner.
	for (const [x, y, angle] of [
		[28, 28, 0],
		[814, 28, 90],
		[814, 567, 180],
		[28, 567, 270]
	] as const) {
		const turn = (px: number, py: number) => {
			const radians = (angle * Math.PI) / 180;
			return `${(x + px * Math.cos(radians) - py * Math.sin(radians)).toFixed(2)} ${(y + px * Math.sin(radians) + py * Math.cos(radians)).toFixed(2)}`;
		};
		path(page, `M${turn(0, -10)}L${turn(10, 0)}L${turn(0, 10)}L${turn(-10, 0)}Z`, { stroke: C.gold, width: 1.5 });
		path(page, `M${turn(0, -5)}L${turn(5, 0)}L${turn(0, 5)}L${turn(-5, 0)}Z`, { fill: C.primary });
		path(page, `M${turn(14, 0)}L${turn(22, 0)}M${turn(0, 14)}L${turn(0, 22)}`, { stroke: C.gold, width: 1 });
	}

	// Crest and academy name.
	path(page, star(401, 50, 4.5, 2.2), { fill: C.gold });
	path(page, star(421, 48, 6.5, 3.2), { fill: C.gold });
	path(page, star(441, 50, 4.5, 2.2), { fill: C.gold });
	centered(page, input.academyName.toUpperCase(), 421, 77, { font: bold, fallback: ethiopicBold, size: 16, color: C.primary, spacing: 3, maxWidth: 700 });
	line(page, 351, 88, 406, 88, C.gold, 1);
	line(page, 436, 88, 491, 88, C.gold, 1);
	path(page, 'M421 84L425 88L421 92L417 88Z', { fill: C.gold });

	// Title, recipient, course.
	centered(page, 'CERTIFICATE OF COMPLETION', 421, 123, { font: bold, size: 28, color: C.primary, spacing: 1.5 });
	centered(page, 'THIS IS PROUDLY PRESENTED TO', 421, 152, { font: italic, size: 12, color: C.mutedInk, spacing: 1.5 });
	centered(page, input.recipientName, 421, 194, { font: bold, fallback: ethiopicBold, size: 32, color: C.darkInk, maxWidth: 700, minSize: 16 });
	line(page, 241, 212, 401, 212, C.gold, 1.5);
	line(page, 441, 212, 601, 212, C.gold, 1.5);
	path(page, 'M421 207L427 212L421 217L415 212Z', { fill: C.primary });
	centered(page, 'for successfully completing all curriculum requirements and demonstrating mastery in', 421, 236, {
		font: regular,
		size: 11.5,
		color: C.mutedInk
	});
	path(page, roundedRect(111, 250, 620, 52, 6), { fill: C.cardBg, stroke: C.borderGold, width: 1 });
	centered(page, input.courseTitle, 421, 282, { font: bold, fallback: ethiopicBold, size: 19, color: C.primary, maxWidth: 588, minSize: 11 });
	line(page, 80, 322, 762, 322, C.rule, 0.5);

	// Seal and issue date.
	circle(page, 110, 390, 34, { stroke: C.gold, width: 2 });
	circle(page, 110, 390, 30, { stroke: C.primary, width: 1 });
	circle(page, 110, 390, 26, { fill: C.sealBg, stroke: C.borderGold, width: 1 });
	circle(page, 110, 390, 18, { fill: C.primary });
	path(page, star(110, 390, 8, 3.8), { fill: C.white });
	centered(page, 'OFFICIAL CREDENTIAL', 110, 437, { font: bold, size: 7.5, color: C.primary });
	centered(page, 'ISSUE DATE', 110, 451, { font: bold, size: 8, color: C.mutedInk });
	centered(page, isoDay(input.issuedAt.toISOString()), 110, 465, { font: regular, size: 11, color: C.darkInk });

	// Authorised signature.
	path(page, 'M355 405C380 375 410 425 440 385C460 370 475 410 495 395', { stroke: C.primary, width: 1.8 });
	centered(page, input.academyName, 420, 431, { font: italic, fallback: ethiopic, size: 13, color: C.primary, maxWidth: 190 });
	line(page, 335, 438, 505, 438, C.gold, 1);
	centered(page, 'AUTHORIZED SIGNATURE', 420, 452, { font: bold, size: 9.5, color: C.darkInk });
	centered(page, 'Academic Governing Board', 420, 464, { font: regular, size: 8, color: C.mutedInk });

	// Verification card with the QR code.
	path(page, roundedRect(615, 345, 148, 160, 6), { fill: C.cardBg, stroke: C.borderGold, width: 1 });
	page.drawImage(qr, { x: 639, y: Y(357 + 100), width: 100, height: 100 });
	centered(page, 'SCAN TO VERIFY', 689, 467, { font: bold, size: 7.5, color: C.primary });
	centered(page, `ID: ${input.code}`, 689, 479, { font: bold, size: 6.5, color: C.mutedInk, maxWidth: 140, minSize: 5 });
	centered(page, input.verificationUrl.replace(/^https?:\/\//, ''), 689, 491, {
		font: regular,
		size: 6.5,
		color: C.accent,
		maxWidth: 140,
		minSize: 4.5
	});

	// The footer, with the link in full for anyone reading a printout.
	centered(page, `Issued by ${input.academyName} · Verify at ${input.verificationUrl}`, 421, 549, {
		font: regular,
		size: 8,
		color: C.mutedInk,
		maxWidth: 740,
		minSize: 6
	});

	// A clickable verification link over the QR code.
	page.node.set(
		PDFName.of('Annots'),
		pdf.context.obj([
			pdf.context.register(
				pdf.context.obj({
					Type: 'Annot',
					Subtype: 'Link',
					Rect: [639, Y(457), 739, Y(357)],
					Border: [0, 0, 0],
					A: { Type: 'Action', S: 'URI', URI: PDFString.of(input.verificationUrl) }
				})
			)
		])
	);

	return pdf.save();
}
