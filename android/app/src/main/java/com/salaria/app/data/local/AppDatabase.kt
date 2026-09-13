package com.salaria.app.data.local

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "offline_transactions")
data class OfflineTransactionEntity(
    @PrimaryKey(autoGenerate = true) val localId: Long = 0,
    val text: String,
    val title: String? = null,
    val source: String = "bank_notification",
    val packageName: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val status: String = "pending", // "pending", "synced", "failed"
    val retryCount: Int = 0,
    val lastError: String? = null
)

@Dao
interface OfflineDao {
    @Query("SELECT * FROM offline_transactions WHERE status = 'pending' ORDER BY timestamp ASC")
    suspend fun getPendingTransactions(): List<OfflineTransactionEntity>

    @Query("SELECT * FROM offline_transactions ORDER BY timestamp DESC LIMIT 50")
    fun getAllOfflineFlow(): Flow<List<OfflineTransactionEntity>>

    @Insert
    suspend fun insert(transaction: OfflineTransactionEntity): Long

    @Update
    suspend fun update(transaction: OfflineTransactionEntity)

    @Query("DELETE FROM offline_transactions WHERE status = 'synced'")
    suspend fun clearSynced()

    @Query("DELETE FROM offline_transactions")
    suspend fun deleteAll()
}

@Database(entities = [OfflineTransactionEntity::class], version = 2, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun offlineDao(): OfflineDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "salaria_offline.db"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
