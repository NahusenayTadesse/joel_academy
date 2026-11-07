import { describe, expect, it } from 'vitest';
import { handoutOpen, styledBlocks, totalDuration, type CourseScope } from './course-pdfs';
import { htmlToBlocks } from './pdf/html';

const body = htmlToBlocks('<p>Intro</p><ol><li><p>What is a model?</p></li></ol><blockquote><ul><li><p>Quoted</p></li></ul></blockquote>');

describe('styledBlocks', () => {
	it('prints a document as written', () => {
		expect(styledBlocks(body, 'DOCUMENT')).toBe(body);
	});

	it('turns every list into tick boxes for a checklist, quoted ones too', () => {
		const blocks = styledBlocks(body, 'CHECKLIST');
		expect(blocks[1]).toMatchObject({ type: 'list', marker: 'check' });
		expect(blocks[2]).toMatchObject({ type: 'quote', blocks: [{ type: 'list', marker: 'check' }] });
	});

	it('gives a worksheet name and date fields and answer lines under top-level items', () => {
		const blocks = styledBlocks(body, 'WORKSHEET');
		expect(blocks[0]).toEqual({ type: 'fields', labels: ['Name', 'Date'] });
		expect(blocks[2]).toMatchObject({ type: 'list', marker: 'number', lines: 3 });
		expect(blocks.at(-1)?.type).toBe('quote');
	});

	it('gives a worksheet without lists a page of lines', () => {
		const blocks = styledBlocks(htmlToBlocks('<p>Describe your project.</p>'), 'WORKSHEET');
		expect(blocks.at(-1)).toEqual({ type: 'lines', count: 12 });
	});
});

describe('handoutOpen', () => {
	const scope = (full: boolean, staff = false) => ({ full, staff }) as CourseScope;

	it('shows published PUBLIC handouts to anyone who can see the course', () => {
		expect(handoutOpen({ published: true, audience: 'PUBLIC' }, scope(false))).toBe(true);
	});

	it('keeps STUDENTS handouts to active students and staff', () => {
		expect(handoutOpen({ published: true, audience: 'STUDENTS' }, scope(false))).toBe(false);
		expect(handoutOpen({ published: true, audience: 'STUDENTS' }, scope(true))).toBe(true);
	});

	it('keeps drafts to staff', () => {
		expect(handoutOpen({ published: false, audience: 'PUBLIC' }, scope(true))).toBe(false);
		expect(handoutOpen({ published: false, audience: 'STUDENTS' }, scope(true, true))).toBe(true);
	});
});

describe('totalDuration', () => {
	it('reads as hours and minutes', () => {
		expect(totalDuration(12_000)).toBe('3 h 20 min');
		expect(totalDuration(7_200)).toBe('2 h');
		expect(totalDuration(300)).toBe('5 min');
		expect(totalDuration(0)).toBeNull();
	});
});
