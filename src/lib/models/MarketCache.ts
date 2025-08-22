import mongoose from "mongoose";

export interface IMarketCache {
  marketId: number;
  question: string;
  closeTime: Date;
  resolved: boolean;
  winningOutcome?: boolean;
  voided: boolean;
  yesTotal: string;     // USDC amount as string
  noTotal: string;      // USDC amount as string
  yesCount: number;
  noCount: number;
  createdAt: Date;
  lastUpdated: Date;
  participants: string[]; // Array of addresses
}

const MarketCacheSchema = new mongoose.Schema<IMarketCache>({
  marketId: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  question: { 
    type: String, 
    required: true,
    trim: true 
  },
  closeTime: { 
    type: Date, 
    required: true 
  },
  resolved: { 
    type: Boolean, 
    default: false 
  },
  winningOutcome: { 
    type: Boolean 
  },
  voided: { 
    type: Boolean, 
    default: false 
  },
  yesTotal: { 
    type: String, 
    default: "0" 
  },
  noTotal: { 
    type: String, 
    default: "0" 
  },
  yesCount: { 
    type: Number, 
    default: 0 
  },
  noCount: { 
    type: Number, 
    default: 0 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  },
  participants: [{ 
    type: String,
    lowercase: true 
  }],
});

// Create indexes for better query performance
MarketCacheSchema.index({ resolved: 1 });
MarketCacheSchema.index({ voided: 1 });
MarketCacheSchema.index({ closeTime: 1 });
MarketCacheSchema.index({ createdAt: -1 });

// Update lastUpdated before saving
MarketCacheSchema.pre("save", function(next) {
  this.lastUpdated = new Date();
  next();
});

export const MarketCache = mongoose.models.MarketCache || 
  mongoose.model<IMarketCache>("MarketCache", MarketCacheSchema);