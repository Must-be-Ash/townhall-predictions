import mongoose from "mongoose";

export interface ISyncLog {
  operation: 'bet-sync' | 'market-sync';
  status: 'success' | 'failure' | 'partial';
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  result?: {
    success?: number;
    failed?: number;
    skipped?: number;
  };
  error?: string;
  triggeredBy: 'cron' | 'manual' | 'admin';
  metadata?: {
    fromBlock?: number;
    toBlock?: number;
    eventsProcessed?: number;
  };
}

const SyncLogSchema = new mongoose.Schema<ISyncLog>({
  operation: {
    type: String,
    enum: ['bet-sync', 'market-sync'],
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  result: {
    success: { type: Number },
    failed: { type: Number },
    skipped: { type: Number }
  },
  error: {
    type: String
  },
  triggeredBy: {
    type: String,
    enum: ['cron', 'manual', 'admin'],
    required: true
  },
  metadata: {
    fromBlock: { type: Number },
    toBlock: { type: Number },
    eventsProcessed: { type: Number }
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
SyncLogSchema.index({ operation: 1, startTime: -1 });
SyncLogSchema.index({ status: 1 });
SyncLogSchema.index({ triggeredBy: 1 });

export const SyncLog = mongoose.models.SyncLog ||
  mongoose.model<ISyncLog>("SyncLog", SyncLogSchema);