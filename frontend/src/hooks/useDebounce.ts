import { useState, useEffect } from 'react';

/**
 * Debounces a value by the given delay (default 300ms).
 * Use this hook on search inputs to avoid firing API calls / filter passes
 * on every keystroke.
 *
 * @example
 *   const debouncedSearch = useDebounce(search, 300);
 *   useEffect(() => { fetchData(debouncedSearch); }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay = 300): T {
    const [debounced, setDebounced] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}
