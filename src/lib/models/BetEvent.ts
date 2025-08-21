import mongoose from "mongoose";

export interface IBetEvent {
  marketId: number;
  userAddress: string;
  outcome: boolean;
  amount: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: Date;
}

const BetEventSchema = new mongoose.Schema<IBetEvent>({
  marketId: { 
    type: Number, 
    required: true 
  },
  userAddress: { 
    type: String, 
    required: true,
    lowercase: true 
  },
  outcome: { 
    type: Boolean, 
    required: true 
  },
  amount: { 
    type: String, 
    required: true 
  },
  transactionHash: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true 
  },
  blockNumber: { 
    type: Number, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    required: true 
  },
});

// Create indexes for better query performance
BetEventSchema.index({ marketId: 1, timestamp: -1 });
BetEventSchema.index({ userAddress: 1 });
BetEventSchema.index({ transactionHash: 1 });
BetEventSchema.index({ timestamp: -1 });

export const BetEvent = mongoose.models.BetEvent || 
  mongoose.model<IBetEvent>("BetEvent", BetEventSchema);