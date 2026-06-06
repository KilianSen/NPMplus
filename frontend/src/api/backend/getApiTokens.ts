import * as api from "./base";
import type { ApiToken } from "./models";

export async function getApiTokens(params = {}): Promise<ApiToken[]> {
	return await api.get({
		url: "/api-tokens",
		params,
	});
}
