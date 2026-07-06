package com.agroerp.sync

import javax.inject.Inject
import javax.inject.Singleton

/**
 * Conflict resolution — Last Write Wins (initial strategy).
 * Prepared for future advanced strategies (server_wins, merged).
 */
@Singleton
class ConflictResolver @Inject constructor() {

    fun resolveLastWriteWins(
        localUpdatedAt: Long,
        serverUpdatedAt: Long,
    ): Resolution = if (localUpdatedAt >= serverUpdatedAt) {
        Resolution.USE_LOCAL
    } else {
        Resolution.USE_SERVER
    }

    enum class Resolution {
        USE_LOCAL,
        USE_SERVER,
    }
}
