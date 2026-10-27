import { Injectable } from '@nestjs/common';

export type AuxStatus = 'meeting' | 'available' | 'lunch' | 'break' | 'away';

export interface AuxEntry {
    userId: string;
    organizationId: string;
    status: AuxStatus;
    firstName: string;
    lastName: string;
    role: string;
    updatedAt: Date;
}

@Injectable()
export class AuxStatusService {
    // In-memory store: userId → AuxEntry
    private readonly store = new Map<string, AuxEntry>();

    /**
     * Update (or create) the aux status for a user.
     * Called via PATCH /aux-status (authenticated user updates own status).
     */
    setStatus(
        userId: string,
        organizationId: string,
        status: AuxStatus,
        firstName: string,
        lastName: string,
        role: string,
    ): AuxEntry {
        const entry: AuxEntry = {
            userId,
            organizationId,
            status,
            firstName,
            lastName,
            role,
            updatedAt: new Date(),
        };
        this.store.set(userId, entry);
        return entry;
    }

    /**
     * Get a single user's aux status.
     * Returns 'away' if user has never set a status.
     */
    getStatus(userId: string): AuxEntry | null {
        return this.store.get(userId) ?? null;
    }

    /**
     * Get all users' aux statuses within an organisation.
     * Used by executives/admins to see the team panel.
     */
    getOrgStatuses(organizationId: string): AuxEntry[] {
        const results: AuxEntry[] = [];
        for (const entry of this.store.values()) {
            if (entry.organizationId === organizationId) {
                results.push(entry);
            }
        }
        return results.sort((a, b) => a.firstName.localeCompare(b.firstName));
    }
}
