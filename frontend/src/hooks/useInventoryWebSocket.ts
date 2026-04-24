'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { buildWebSocketUrl } from '@/lib/apiPath';
import { logger } from '@/lib/logger';

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;
const RECONNECT_MAX_ATTEMPTS = 10;
const RECONNECT_COOLDOWN_DELAY_MS = 60_000;

export function useInventoryWebSocket() {
    const queryClient = useQueryClient();
    const socketRef = useRef<WebSocket | null>(null);
    const attemptRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isActiveRef = useRef(false);

    useEffect(() => {
        isActiveRef.current = true;

        const scheduleReconnect = () => {
            if (!isActiveRef.current) {
                return;
            }

            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            if (attemptRef.current >= RECONNECT_MAX_ATTEMPTS) {
                logger.warn('Inventory WebSocket max reconnect attempts reached, entering cooldown retry', {
                    delayMs: RECONNECT_COOLDOWN_DELAY_MS,
                });

                timerRef.current = setTimeout(() => {
                    timerRef.current = null;
                    connect();
                }, RECONNECT_COOLDOWN_DELAY_MS);

                return;
            }

            const delay = Math.min(
                RECONNECT_BASE_DELAY_MS * Math.pow(2, attemptRef.current),
                RECONNECT_MAX_DELAY_MS,
            );
            attemptRef.current += 1;

            logger.info(`Inventory WebSocket reconnecting in ${delay}ms (attempt ${attemptRef.current}/${RECONNECT_MAX_ATTEMPTS})`);

            timerRef.current = setTimeout(() => {
                timerRef.current = null;
                connect();
            }, delay);
        };

        const connect = () => {
            if (!isActiveRef.current) {
                return;
            }

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
                attemptRef.current = 0;
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    logger.info('Received WebSocket message:', data);

                    if (data.type === 'catalog_update') {
                        logger.info('Invalidating inventory-related queries...');
                        queryClient.invalidateQueries({ queryKey: ['borrow', 'catalog'] });
                        queryClient.invalidateQueries({ queryKey: ['inventory', 'requests'] });
                    }
                } catch (error) {
                    logger.error('Failed to parse WebSocket message', { error });
                }
            };

            socket.onclose = (event) => {
                const shouldReconnect = isActiveRef.current;

                logger.info('Inventory WebSocket closed', {
                    code: event.code,
                    reason: event.reason,
                    shouldReconnect,
                });

                if (socketRef.current === socket) {
                    socketRef.current = null;
                }

                if (shouldReconnect) {
                    scheduleReconnect();
                }
            };

            socket.onerror = () => {
                if (!isActiveRef.current) {
                    return;
                }

                logger.warn('Inventory WebSocket error (details unavailable in browser)');
            };
        };

        connect();

        return () => {
            isActiveRef.current = false;

            // Clear any pending reconnect timer
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            attemptRef.current = 0;

            // Close the socket
            if (socketRef.current) {
                socketRef.current.onopen = null;
                socketRef.current.onmessage = null;
                socketRef.current.onclose = null;
                socketRef.current.onerror = null;

                if (
                    socketRef.current.readyState === WebSocket.OPEN ||
                    socketRef.current.readyState === WebSocket.CONNECTING
                ) {
                    socketRef.current.close(1000, 'component_unmount');
                }

                socketRef.current = null;
            }
        };
    }, [queryClient]);
}
