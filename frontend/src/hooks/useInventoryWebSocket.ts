'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { buildWebSocketUrl } from '@/lib/apiPath';
import { logger } from '@/lib/logger';

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const RECONNECT_MAX_ATTEMPTS = 10;

export function useInventoryWebSocket() {
    const queryClient = useQueryClient();
    const socketRef = useRef<WebSocket | null>(null);
    const attemptRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        // Prevent duplicate connections
        if (
            socketRef.current &&
            (socketRef.current.readyState === WebSocket.OPEN ||
                socketRef.current.readyState === WebSocket.CONNECTING)
        ) {
            return;
        }

        const wsUrl = buildWebSocketUrl('/ws/borrower');
        logger.info('Connecting to Inventory WebSocket...', { url: wsUrl, attempt: attemptRef.current });

        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
            logger.info('Inventory WebSocket connected');
            attemptRef.current = 0; // Reset on successful connection
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                logger.info('Received WebSocket message:', data);

                if (data.type === 'catalog_update') {
                    logger.info('Invalidating inventory-related queries...');

                    // Invalidate catalog (Borrower Portal)
                    queryClient.invalidateQueries({ queryKey: ['borrow', 'catalog'] });

                    // Invalidate requests (Inventory Manager)
                    queryClient.invalidateQueries({ queryKey: ['inventory', 'requests'] });
                }
            } catch (error) {
                logger.error('Failed to parse WebSocket message', { error });
            }
        };

        socket.onclose = (event) => {
            logger.info('Inventory WebSocket closed', { code: event.code, reason: event.reason });
            socketRef.current = null;
            scheduleReconnect();
        };

        socket.onerror = () => {
            // Browser WebSocket error events carry no useful info; onclose handles reconnect.
            logger.warn('Inventory WebSocket error (details unavailable in browser)');
        };
    }, [queryClient]);

    const scheduleReconnect = useCallback(() => {
        if (attemptRef.current >= RECONNECT_MAX_ATTEMPTS) {
            logger.warn('Inventory WebSocket max reconnect attempts reached, giving up');
            return;
        }

        const delay = Math.min(
            RECONNECT_BASE_DELAY_MS * Math.pow(2, attemptRef.current),
            RECONNECT_MAX_DELAY_MS,
        );
        attemptRef.current += 1;

        logger.info(`Inventory WebSocket reconnecting in ${delay}ms (attempt ${attemptRef.current}/${RECONNECT_MAX_ATTEMPTS})`);

        timerRef.current = setTimeout(() => {
            connect();
        }, delay);
    }, [connect]);

    useEffect(() => {
        connect();

        return () => {
            // Clear any pending reconnect timer
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            // Close the socket
            if (
                socketRef.current &&
                (socketRef.current.readyState === WebSocket.OPEN ||
                    socketRef.current.readyState === WebSocket.CONNECTING)
            ) {
                socketRef.current.close();
            }
        };
    }, [connect]);

    return socketRef.current;
}
