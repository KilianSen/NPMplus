import * as api from "./base";
import type { ApiToken } from "./models";

export interface NewApiToken {
	name: string;
	expiry?: string;
}

export async function createApiToken(item: NewApiToken): Promise<ApiToken> {
	return await api.post({
		url: "/api-tokens",
		data: item,
	});
}
