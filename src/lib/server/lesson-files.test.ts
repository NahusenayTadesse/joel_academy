import { describe, expect, it, vi } from 'vitest';

// Only the pure parts are under test; storage and the database are stubbed.
vi.mock('$lib/server/db', () => ({ db: {} }));
vi.mock('$lib/server/enrollment', () => ({ canAccessLesson: vi.fn() }));
vi.mock('@nahu/admin-kit/server/files', () => ({
	FILES_DIR: '.tempFiles',
	MAX_UPLOAD_BYTES: 10 * 1024 * 1024,
	UploadRefused: class extends Error {},
	generateFileName: () => 'x',
	resolveStoredFile: () => null,
	saveUploadedFile: vi.fn()
}));

const { attachmentDisposition, cleanFileName, lessonFileProblem } = await import('./lesson-files');

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];
const ZIP = [0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0];
const file = (name: string, type: string, size = 1000) => ({ name, type, size });
const head = (bytes: number[]) => new Uint8Array(bytes);

describe('lessonFileProblem', () => {
	it('accepts the allowed kinds when name, declared type and contents agree', () => {
		expect(lessonFileProblem(file('Week 1.pdf', 'application/pdf'), head(PDF))).toBeNull();
		expect(lessonFileProblem(file('slides.PPTX', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'), head(ZIP))).toBeNull();
		expect(lessonFileProblem(file('code.zip', 'application/x-zip-compressed'), head(ZIP))).toBeNull();
		expect(lessonFileProblem(file('talk.mp3', 'audio/mp3'), head([0x49, 0x44, 0x33, 4]))).toBeNull();
		expect(lessonFileProblem(file('data.csv', 'application/vnd.ms-excel'))).toBeNull();
		expect(lessonFileProblem(file('photo.jpeg', 'image/jpeg'), head([0xff, 0xd8, 0xff, 0xe0]))).toBeNull();
	});

	it('refuses extensions outside the list, whatever the declared type', () => {
		expect(lessonFileProblem(file('run.exe', 'application/pdf'), head(PDF))).toMatch(/cannot be attached/);
		expect(lessonFileProblem(file('page.html', 'text/html'))).toMatch(/cannot be attached/);
		expect(lessonFileProblem(file('image.svg', 'image/svg+xml'))).toMatch(/cannot be attached/);
		expect(lessonFileProblem(file('noextension', 'application/pdf'))).toMatch(/cannot be attached/);
		// Not fooled by the object prototype.
		expect(lessonFileProblem(file('x.constructor', 'application/pdf'))).toMatch(/cannot be attached/);
	});

	it('refuses a declared type that does not match the extension', () => {
		expect(lessonFileProblem(file('notes.pdf', 'text/html'), head(PDF))).toMatch(/does not match/);
		expect(lessonFileProblem(file('notes.docx', 'application/octet-stream'), head(ZIP))).toMatch(/does not match/);
	});

	it('refuses contents that do not match the extension', () => {
		const html = Array.from(new TextEncoder().encode('<html><'));
		expect(lessonFileProblem(file('notes.pdf', 'application/pdf'), head(html))).toMatch(/contents/);
		expect(lessonFileProblem(file('book.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), head(PDF))).toMatch(/contents/);
	});

	it('refuses empty files and files over the upload limit', () => {
		expect(lessonFileProblem(file('a.pdf', 'application/pdf', 0), head(PDF))).toMatch(/Choose a file/);
		expect(lessonFileProblem(file('a.pdf', 'application/pdf', 10 * 1024 * 1024 + 1), head(PDF))).toMatch(/larger than 10 MB/);
		expect(lessonFileProblem(file('a.pdf', 'application/pdf', 10 * 1024 * 1024), head(PDF))).toBeNull();
	});
});

describe('cleanFileName', () => {
	it('drops folders and control characters, and keeps the extension of a long name', () => {
		expect(cleanFileName('C:\\Users\\me\\Week 1.pdf')).toBe('Week 1.pdf');
		expect(cleanFileName('../../etc/passwd')).toBe('passwd');
		expect(cleanFileName('bad\u0000\nname.pdf')).toBe('badname.pdf');
		expect(cleanFileName('..')).toBe('download');
		const long = cleanFileName(`${'a'.repeat(300)}.pdf`);
		expect(long).toHaveLength(200);
		expect(long.endsWith('.pdf')).toBe(true);
	});
});

describe('attachmentDisposition', () => {
	it('sends a plain name as both forms', () => {
		expect(attachmentDisposition('Week 1.pdf')).toBe(`attachment; filename="Week 1.pdf"; filename*=UTF-8''Week%201.pdf`);
	});

	it('encodes non-ASCII names per RFC 5987, with an ASCII fallback', () => {
		const header = attachmentDisposition('ትምህርት ፩ – Café.pdf');
		expect(header).toContain(`filename*=UTF-8''${encodeURIComponent('ትምህርት ፩ – Café.pdf')}`);
		const fallback = /filename="([^"]*)"/.exec(header)?.[1] ?? '';
		expect(fallback).toMatch(/^[\x20-\x7e]+$/);
		expect(fallback).toContain('Cafe.pdf');
	});

	it('cannot be broken out of by quotes, separators or folder parts', () => {
		const header = attachmentDisposition(`a"; filename=evil.exe; x=".pdf`);
		expect(header.match(/filename="/g)).toHaveLength(1);
		expect(/filename="([^"]*)"/.exec(header)?.[1]).toBe('a_; filename=evil.exe; x=_.pdf');
		expect(header).toContain(`filename*=UTF-8''a%22%3B%20filename%3Devil.exe%3B%20x%3D%22.pdf`);
		expect(attachmentDisposition("it's (1)*.pdf")).toContain(`filename*=UTF-8''it%27s%20%281%29%2A.pdf`);
		expect(attachmentDisposition('/tmp/../secret.pdf')).toContain('filename="secret.pdf"');
	});
});
