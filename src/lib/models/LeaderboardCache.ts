import mongoose from "mongoose";

export interface ILeaderboardEntry {
  userAddress: string;
  displayName?: string;
  totalBets: number;
  correctPredictions: number;
  winRate: number;
  totalWinnings: string;
  rank: number;
  lastBetTimestamp?: Date;
}

export interface ILeaderboardCache {
  _id?: string;
  entries: ILeaderboardEntry[];
  totalUsers: number;
  lastUpdated: Date;
  version: number; // For cache invalidation
}

const LeaderboardEntrySchema = new mongoose.Schema<ILeaderboardEntry>({
  userAddress: { 
    type: String, 
    required: true,
    lowercase: true 
  },
  displayName: { 
    type: String 
  },
  totalBets: { 
    type: Number, 
    required: true,
    default: 0 
  },
  correctPredictions: { 
    type: Number, 
    required: true,
    default: 0 
  },
  winRate: { 
    type: Number, 
    required: true,
    default: 0 
  },
  totalWinnings: { 
    type: String, 
    required: true,
    default: "0" 
  },
  rank: { 
    type: Number, 
    required: true 
  },
  lastBetTimestamp: { 
    type: Date 
  }
});

const LeaderboardCacheSchema = new mongoose.Schema<ILeaderboardCache>({
  entries: [LeaderboardEntrySchema],
  totalUsers: { 
    type: Number, 
    required: true,
    default: 0 
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  },
  version: { 
    type: Number, 
    default: 1 
  }
});

// Create indexes for better query performance
LeaderboardCacheSchema.index({ lastUpdated: -1 });
LeaderboardCacheSchema.index({ version: -1 });
LeaderboardCacheSchema.index({ "entries.userAddress": 1 });
LeaderboardCacheSchema.index({ "entries.rank": 1 });

// Update lastUpdated before saving
LeaderboardCacheSchema.pre("save", function(next) {
  this.lastUpdated = new Date();
  next();
});

export const LeaderboardCache = mongoose.models.LeaderboardCache || 
  mongoose.model<ILeaderboardCache>("LeaderboardCache", LeaderboardCacheSchema);
