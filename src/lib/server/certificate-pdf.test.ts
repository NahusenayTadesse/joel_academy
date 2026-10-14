import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { certificatePdf, drawable, verificationQrPath } from './certificate-pdf';

/** The QR code's modules, row by row, as the qrcode library lays them out for a URL. */
function qrMatrix(url: string): boolean[][] {
	const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' });
	return Array.from({ length: modules.size }, (_, row) =>
		Array.from({ length: modules.size }, (_, col) => Boolean(modules.get(row, col)))
	);
}

/**
 * Reads the QR code back out of the PDF: the one RGB image, inflated, sampled at the centre of
 * each module (one module of margin on each side, as `verificationQrPng` draws it).
 */
function embeddedQr(pdf: PDFDocument): boolean[][] {
	const images = pdf.context
		.enumerateIndirectObjects()
		.map(([, object]) => object)
		.filter(
			(object): object is PDFRawStream =>
				object instanceof PDFRawStream &&
				object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image') &&
				object.dict.get(PDFName.of('ColorSpace')) === PDFName.of('DeviceRGB')
		);
	expect(images).toHaveLength(1);
	const [image] = images;
	const width = (image.dict.get(PDFName.of('Width')) as PDFNumber).asNumber();
	const pixels = inflateSync(image.contents);
	const size = qrMatrix(input.verificationUrl).length;
	const scale = width / (size + 2);
	const dark = (x: number, y: number) => pixels[(Math.floor(y) * width + Math.floor(x)) * 3] < 128;
	expect(image.dict).toBeInstanceOf(PDFDict);
	return Array.from({ length: size }, (_, row) =>
		Array.from({ length: size }, (_, col) => dark((col + 1.5) * scale, (row + 1.5) * scale))
	);
}

const input = {
	academyName: 'Joel Talargie Academy',
	recipientName: 'Abebe Kebede',
	courseTitle: 'Introduction to Data Analysis',
	code: 'JTA-2026-000123',
	issuedAt: new Date('2026-05-04T10:00:00Z'),
	verificationUrl: 'https://academy.example/certificates/verify/abc123'
};

describe('certificatePdf', () => {
	it('is one A4-landscape page carrying the details and the QR code', async () => {
		const bytes = await certificatePdf(input);
		const pdf = await PDFDocument.load(bytes);
		expect(pdf.getPageCount()).toBe(1);
		const { width, height } = pdf.getPage(0).getSize();
		expect([width, height]).toEqual([842, 595]);
		expect(pdf.getTitle()).toContain(input.courseTitle);
		expect(pdf.getSubject()).toContain(input.code);
		// The embedded image reads back as exactly the QR code of the verification link.
		expect(embeddedQr(pdf)).toEqual(qrMatrix(input.verificationUrl));
	});

	it('does not throw on names outside the standard fonts', async () => {
		await expect(certificatePdf({ ...input, recipientName: 'አበበ ከበደ', courseTitle: 'Ünïcode — “quotes”' })).resolves.toBeInstanceOf(Uint8Array);
	});

	it('embeds an Ethiopic font only when a name needs one', async () => {
		const fontNames = async (bytes: Uint8Array) => {
			const pdf = await PDFDocument.load(bytes);
			return pdf.context
				.enumerateIndirectObjects()
				.map(([, object]) => (object instanceof PDFDict ? object.get(PDFName.of('BaseFont')) : undefined))
				.filter(Boolean)
				.map(String);
		};
		const amharic = await fontNames(await certificatePdf({ ...input, recipientName: 'አበበ ከበደ' }));
		expect(amharic.some((name) => /DroidSansEthiopic/.test(name))).toBe(true);
		const latin = await fontNames(await certificatePdf(input));
		expect(latin.some((name) => /Ethiopic/.test(name))).toBe(false);
	});
});

describe('drawable', () => {
	it('keeps Latin text and replaces what the font cannot draw', async () => {
		const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
		expect(drawable('Café “Ünï” – 100%', font)).toBe('Café “Ünï” – 100%');
		expect(drawable('Dvořák', font)).toBe('Dvorák');
		expect(drawable('አበበ', font)).toBe('???');
	});
});

describe('verificationQrPath', () => {
	it('draws the same modules as the QR code of the link', () => {
		const { size, path } = verificationQrPath(input.verificationUrl);
		const { modules } = QRCode.create(input.verificationUrl, { errorCorrectionLevel: 'M' });
		expect(size).toBe(modules.size);
		expect(path.match(/M/g)).toHaveLength(Array.from(modules.data).filter(Boolean).length);
	});
});
