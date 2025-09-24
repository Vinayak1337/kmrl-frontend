// Lightweight shim for @google/generative-ai used via webpack alias.
// Provides a minimal API surface so the app can build/run without network access.

export type ContentPart =
	| { text?: string }
	| { inlineData: { data: string; mimeType: string } };

class ShimResponse {
	text(): string {
		return '';
	}
}

class ShimModel {
	// Accept broader inputs (including {contents, generationConfig}) for type-compat
	async generateContent(
		_args: unknown
	): Promise<{ response: { text: () => string } }> {
		return { response: new ShimResponse() };
	}
}

export class GoogleGenerativeAI {
	// Accept apiKey but do not use it (no network in shim)
	constructor(_apiKey: string) {}

	getGenerativeModel(_opts: { model: string }): ShimModel {
		return new ShimModel();
	}
}

export default GoogleGenerativeAI;
