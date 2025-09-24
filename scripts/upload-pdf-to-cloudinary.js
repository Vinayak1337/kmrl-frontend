#!/usr/bin/env node
// Quick diagnostic script to verify Cloudinary PDF uploads and page image delivery.
// Usage: node scripts/upload-pdf-to-cloudinary.js <path-to-pdf> [maxPages]

const fs = require('fs/promises');
const path = require('path');

const DEFAULT_PDF = path.resolve(
	__dirname,
	'..',
	'SIH2025-IDEA-Presentation-Format.pdf'
);
const ENV_CANDIDATES = ['.env.local', '.env'];

async function loadEnvDefaults() {
	for (const relPath of ENV_CANDIDATES) {
		const fullPath = path.resolve(__dirname, '..', relPath);
		try {
			const raw = await fs.readFile(fullPath, 'utf-8');
			raw
				.split(/\r?\n/)
				.map(line => line.trim())
				.filter(line => line && !line.startsWith('#'))
				.forEach(line => {
					const eqIndex = line.indexOf('=');
					if (eqIndex === -1) return;
					const key = line.slice(0, eqIndex).trim();
					if (!key || process.env[key]) return;
					let value = line.slice(eqIndex + 1).trim();
					if (
						(value.startsWith('"') && value.endsWith('"')) ||
						(value.startsWith("'") && value.endsWith("'"))
					) {
						value = value.slice(1, -1);
					}
					process.env[key] = value;
				});
		} catch (err) {
			if (err.code !== 'ENOENT') {
				console.warn(
					`Could not read env file ${fullPath}:`,
					err.message || err
				);
			}
		}
	}
}

async function downloadPageImage(url, index) {
	if (typeof fetch !== 'function') {
		console.warn(
			'fetch is not available in this Node runtime; skipping page download.'
		);
		return null;
	}
	try {
		const response = await fetch(url);
		if (!response.ok) {
			console.warn(`Page ${index}: failed to fetch (${response.status})`);
			return null;
		}
		const arrayBuffer = await response.arrayBuffer();
		return Buffer.from(arrayBuffer);
	} catch (err) {
		console.warn(`Page ${index}: fetch threw`, err);
		return null;
	}
}

async function main() {
	await loadEnvDefaults();
	const [, , fileArg, maxPagesArg] = process.argv;
	const pdfPath = path.resolve(fileArg ? fileArg : DEFAULT_PDF);

	if (!fileArg) {
		console.log(`No PDF path provided. Falling back to ${pdfPath}`);
	}

	const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
	const preset = process.env.CLOUDINARY_UNSIGNED_PRESET;
	const uploadUrl = process.env.CLOUDINARY_UPLOAD_URL;

	if (!cloudName || !preset) {
		console.error(
			'Missing Cloudinary configuration. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UNSIGNED_PRESET.'
		);
		process.exit(1);
	}

	let pdfBuffer;
	try {
		pdfBuffer = await fs.readFile(pdfPath);
	} catch (err) {
		console.error(`Unable to read file at ${pdfPath}:`, err);
		process.exit(1);
	}

	const base64Pdf = pdfBuffer.toString('base64');
	const form = new FormData();
	form.append('file', `data:application/pdf;base64,${base64Pdf}`);
	form.append('upload_preset', preset);

	const endpoint =
		uploadUrl || `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
	console.log('Uploading PDF to Cloudinary…');

	const uploadResponse = await fetch(endpoint, {
		method: 'POST',
		body: form
	});

	const uploadJson = await uploadResponse.json().catch(() => ({}));
	if (!uploadResponse.ok || !uploadJson.public_id) {
		console.error('Upload failed:', uploadJson);
		process.exit(1);
	}

	console.log('Upload succeeded. Public ID:', uploadJson.public_id);
	console.log(
		'Cloudinary asset URL:',
		uploadJson.secure_url || uploadJson.url || '(not returned)'
	);

	const maxPages =
		Number.isFinite(Number(maxPagesArg)) && Number(maxPagesArg) > 0
			? Number(maxPagesArg)
			: 3;
	const width = 1600;
	const downloaded = [];

	for (let page = 1; page <= maxPages; page += 1) {
		const pageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/pg_${page},w_${width}/${uploadJson.public_id}.pdf`;
		console.log(`Fetching page ${page}: ${pageUrl}`);
		const buffer = await downloadPageImage(pageUrl, page);
		if (!buffer) {
			console.log(`Page ${page}: no data retrieved.`);
			continue;
		}
		const outFile = path.resolve(`cloudinary-page-${page}.png`);
		await fs.writeFile(outFile, buffer);
		console.log(
			`Saved page ${page} image to ${outFile} (${buffer.length} bytes).`
		);
		downloaded.push(outFile);
	}

	if (downloaded.length === 0) {
		console.warn(
			'No page images were downloaded. Check Cloudinary transformation settings or page count.'
		);
	} else {
		console.log('Downloaded page images:', downloaded);
	}

	console.log('Done.');
}

main().catch(err => {
	console.error('Unexpected error:', err);
	process.exit(1);
});
