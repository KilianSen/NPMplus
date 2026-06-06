import * as api from "./base";

export async function deleteApiToken(id: number): Promise<boolean> {
	return await api.del({
		url: `/api-tokens/${id}`,
	});
}
