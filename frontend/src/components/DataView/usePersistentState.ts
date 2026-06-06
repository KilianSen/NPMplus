import { useEffect, useState } from "react";

/**
 * A useState whose value is persisted to localStorage as JSON under a stable key.
 * Used by the DataView framework to remember the selected view and per-view config.
 */
export function usePersistentState<T>(key: string, initial: T): [T, (value: T) => void] {
	const [value, setValue] = useState<T>(() => {
		if (typeof window === "undefined") {
			return initial;
		}
		const stored = localStorage.getItem(key);
		if (stored === null) {
			return initial;
		}
		try {
			return JSON.parse(stored) as T;
		} catch {
			return initial;
		}
	});

	useEffect(() => {
		localStorage.setItem(key, JSON.stringify(value));
	}, [key, value]);

	return [value, setValue];
}
