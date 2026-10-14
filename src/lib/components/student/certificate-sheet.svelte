<script lang="ts">
	import { siteConfig } from '$lib/site';
	import { isoDay } from './certificate-format';

	/*
	 * The certificate itself, redrawn as SVG from the original's PDF generator (A4 landscape,
	 * 842 x 595 pt, the same coordinates and colours) so it scales on screen and prints crisply.
	 * The QR code (drawn from the server's module grid, `verificationQrPath`) and the layout match
	 * the downloadable PDF (`$lib/server/certificate-pdf`); without one the card shows a shield.
	 */
	let {
		recipientName,
		courseTitle,
		code,
		issuedAt,
		verificationUrl,
		qr = null
	}: {
		recipientName: string;
		courseTitle: string;
		code: string;
		issuedAt: string;
		verificationUrl: string;
		/** The verification link's QR code: a `size`-module square drawn by one path. */
		qr?: { size: number; path: string } | null;
	} = $props();

	const primary = '#336B00';
	const accent = '#69BE28';
	const gold = '#C5A059';
	const borderGold = '#DFC68E';
	const darkInk = '#0F172A';
	const mutedInk = '#64748B';
	const cardBg = '#F8FAF6';
	const font = 'Helvetica, Arial, sans-serif';

	function star(cx: number, cy: number, outer: number, inner: number) {
		const points: string[] = [];
		for (let i = 0; i < 10; i += 1) {
			const radius = i % 2 === 0 ? outer : inner;
			const angle = (Math.PI / 2) * 3 + (i * Math.PI) / 5;
			points.push(`${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`);
		}
		return points.join(' ');
	}

	/** PDFKit shrank nothing; SVG text does not wrap, so long names get a smaller size instead. */
	function fit(text: string, size: number, width: number, charWidth = 0.56) {
		return Math.min(size, width / Math.max(1, text.length * charWidth));
	}

	const academy = siteConfig.name;
	const shortUrl = $derived(verificationUrl.replace(/^https?:\/\//, ''));
	const footer = $derived(`Issued by ${academy} · Verify at ${verificationUrl}`);
	const corners = [
		{ x: 28, y: 28, angle: 0 },
		{ x: 814, y: 28, angle: 90 },
		{ x: 814, y: 567, angle: 180 },
		{ x: 28, y: 567, angle: 270 }
	];
</script>

<svg
	viewBox="0 0 842 595"
	xmlns="http://www.w3.org/2000/svg"
	role="img"
	aria-label="Certificate of Completion awarded to {recipientName} for {courseTitle}, number {code}"
	class="block h-auto w-full"
	font-family={font}
>
	<rect x="0" y="0" width="842" height="595" fill="#FCFCF9" />
	<rect x="14" y="14" width="814" height="567" fill="#FFFFFF" />
	<rect x="18" y="18" width="806" height="559" fill="none" stroke={primary} stroke-width="3" />
	<rect x="26" y="26" width="790" height="543" fill="none" stroke={gold} stroke-width="1" />
	<rect x="30" y="30" width="782" height="535" fill="none" stroke={borderGold} stroke-width="0.5" />

	{#each corners as corner (corner.angle)}
		<g transform="translate({corner.x} {corner.y}) rotate({corner.angle})">
			<polygon points="0,-10 10,0 0,10 -10,0" fill="none" stroke={gold} stroke-width="1.5" />
			<polygon points="0,-5 5,0 0,5 -5,0" fill={primary} />
			<line x1="14" y1="0" x2="22" y2="0" stroke={gold} stroke-width="1" />
			<line x1="0" y1="14" x2="0" y2="22" stroke={gold} stroke-width="1" />
		</g>
	{/each}

	<polygon points={star(401, 50, 4.5, 2.2)} fill={gold} />
	<polygon points={star(421, 48, 6.5, 3.2)} fill={gold} />
	<polygon points={star(441, 50, 4.5, 2.2)} fill={gold} />

	<text x="421" y="77" text-anchor="middle" fill={primary} font-size="16" font-weight="700" letter-spacing="3">
		{academy.toUpperCase()}
	</text>
	<line x1="351" y1="88" x2="406" y2="88" stroke={gold} stroke-width="1" />
	<line x1="436" y1="88" x2="491" y2="88" stroke={gold} stroke-width="1" />
	<polygon points="421,84 425,88 421,92 417,88" fill={gold} />

	<text x="421" y="123" text-anchor="middle" fill={primary} font-size="28" font-weight="700" letter-spacing="1.5">
		CERTIFICATE OF COMPLETION
	</text>
	<text x="421" y="152" text-anchor="middle" fill={mutedInk} font-size="12" font-style="italic" letter-spacing="1.5">
		THIS IS PROUDLY PRESENTED TO
	</text>
	<text x="421" y="194" text-anchor="middle" fill={darkInk} font-size={fit(recipientName, 32, 700)} font-weight="700">
		{recipientName}
	</text>

	<line x1="241" y1="212" x2="401" y2="212" stroke={gold} stroke-width="1.5" />
	<line x1="441" y1="212" x2="601" y2="212" stroke={gold} stroke-width="1.5" />
	<polygon points="421,207 427,212 421,217 415,212" fill={primary} />

	<text x="421" y="236" text-anchor="middle" fill={mutedInk} font-size="11.5">
		for successfully completing all curriculum requirements and demonstrating mastery in
	</text>

	<rect x="111" y="250" width="620" height="52" rx="6" fill={cardBg} stroke={borderGold} stroke-width="1" />
	<text x="421" y="282" text-anchor="middle" fill={primary} font-size={fit(courseTitle, 19, 588)} font-weight="700">
		{courseTitle}
	</text>

	<line x1="80" y1="322" x2="762" y2="322" stroke="#E2E8F0" stroke-width="0.5" />

	<!-- Official seal and issue date -->
	<circle cx="110" cy="390" r="34" fill="none" stroke={gold} stroke-width="2" />
	<circle cx="110" cy="390" r="30" fill="none" stroke={primary} stroke-width="1" />
	<circle cx="110" cy="390" r="26" fill="#FBF8EE" stroke={borderGold} stroke-width="1" />
	<circle cx="110" cy="390" r="18" fill={primary} />
	<polygon points={star(110, 390, 8, 3.8)} fill="#FFFFFF" />
	<text x="110" y="437" text-anchor="middle" fill={primary} font-size="7.5" font-weight="700">OFFICIAL CREDENTIAL</text>
	<text x="110" y="451" text-anchor="middle" fill={mutedInk} font-size="8" font-weight="700">ISSUE DATE</text>
	<text x="110" y="465" text-anchor="middle" fill={darkInk} font-size="11">{isoDay(issuedAt)}</text>

	<!-- Authorised signature -->
	<path
		d="M 355 405 C 380 375, 410 425, 440 385 C 460 370, 475 410, 495 395"
		fill="none"
		stroke={primary}
		stroke-width="1.8"
	/>
	<text x="420" y="431" text-anchor="middle" fill={primary} font-size="13" font-style="italic">{academy}</text>
	<line x1="335" y1="438" x2="505" y2="438" stroke={gold} stroke-width="1" />
	<text x="420" y="452" text-anchor="middle" fill={darkInk} font-size="9.5" font-weight="700">AUTHORIZED SIGNATURE</text>
	<text x="420" y="464" text-anchor="middle" fill={mutedInk} font-size="8">Academic Governing Board</text>

	<!-- Verification card: the QR code links to the public verification page -->
	<rect x="615" y="345" width="148" height="160" rx="6" fill={cardBg} stroke={borderGold} stroke-width="1" />
	{#if qr}
		<a href={verificationUrl} target="_blank" rel="noopener" aria-label="Verify this certificate online">
			<!-- One module of white margin around the code, as in the PDF. -->
			<g transform="translate(639 357) scale({100 / (qr.size + 2)})">
				<rect width={qr.size + 2} height={qr.size + 2} fill="#FFFFFF" />
				<path d={qr.path} transform="translate(1 1)" fill="#000000" shape-rendering="crispEdges" />
			</g>
		</a>
	{:else}
		<g transform="translate(689 405)">
			<circle r="34" fill="none" stroke={borderGold} stroke-width="1" />
			<path
				d="M0,-24 L19,-16 L19,2 C19,15 10,23 0,27 C-10,23 -19,15 -19,2 L-19,-16 Z"
				fill={primary}
			/>
			<path d="M-8,1 L-2,7 L9,-5" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
		</g>
	{/if}
	<text x="689" y="467" text-anchor="middle" fill={primary} font-size="7.5" font-weight="700">
		{qr ? 'SCAN TO VERIFY' : 'VERIFY ONLINE'}
	</text>
	<text x="689" y="479" text-anchor="middle" fill={mutedInk} font-size="6.5" font-weight="700">ID: {code}</text>
	<text x="689" y="491" text-anchor="middle" fill={accent} font-size={fit(shortUrl, 6.5, 140, 0.5)}>{shortUrl}</text>

	<text x="421" y="549" text-anchor="middle" fill={mutedInk} font-size={fit(footer, 8, 740, 0.5)}>
		{footer}
	</text>
</svg>
