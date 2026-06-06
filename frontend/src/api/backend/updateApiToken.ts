import * as api from "./base";
import type { ApiToken } from "./models";

export interface UpdateApiToken {
	id: number;
	name?: string;
	expiry?: string | null;
}

export async function updateApiToken({ id, ...data }: UpdateApiToken): Promise<ApiToken> {
	return await api.put({
		url: `/api-tokens/${id}`,
		data,
	});
}
