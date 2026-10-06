import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_STORAGE_KEY = '@urvarak_last_token_number';
const TOKEN_PREFIX = 'TKN-';

/**
 * Generates the next sequential token number in the format: TKN-000001, TKN-000002, ...
 * Starts from TKN-000001 and continuously increments. Existing past tokens remain unaffected.
 */
export const getNextSequentialToken = async (existingBookings: any[] = []): Promise<string> => {
    try {
        let maxNum = 0;

        // 1. Check existing bookings passed from context or storage for the highest TKN-00000X number
        if (Array.isArray(existingBookings)) {
            for (const b of existingBookings) {
                const tok = b?.token_number || b?.tokenNumber;
                if (typeof tok === 'string' && tok.startsWith(TOKEN_PREFIX)) {
                    const numPart = parseInt(tok.replace(TOKEN_PREFIX, ''), 10);
                    if (!isNaN(numPart) && numPart > maxNum) {
                        maxNum = numPart;
                    }
                }
            }
        }

        // 2. Check locally saved sequence counter
        const saved = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (saved) {
            const savedNum = parseInt(saved, 10);
            if (!isNaN(savedNum) && savedNum > maxNum) {
                maxNum = savedNum;
            }
        }

        // 3. Next sequence number
        const nextNum = maxNum + 1;

        // 4. Save the new counter
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, nextNum.toString());

        // 5. Format as TKN-000001
        const formattedToken = `${TOKEN_PREFIX}${String(nextNum).padStart(6, '0')}`;
        return formattedToken;
    } catch (error) {
        console.error('Error generating sequential token:', error);
        return `${TOKEN_PREFIX}000001`;
    }
};
