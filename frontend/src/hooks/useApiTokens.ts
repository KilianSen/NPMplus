import { useQuery } from "@tanstack/react-query";
import { type ApiToken, getApiTokens } from "src/api/backend";

const fetchApiTokens = () => {
	return getApiTokens();
};

const useApiTokens = (options = {}) => {
	return useQuery<ApiToken[], Error>({
		queryKey: ["api-tokens"],
		queryFn: () => fetchApiTokens(),
		staleTime: 60 * 1000,
		...options,
	});
};

export { fetchApiTokens, useApiTokens };
