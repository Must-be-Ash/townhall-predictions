import mongoose from "mongoose";

export interface IUser {
  email: string;
  evmAddress: string;
  displayName?: string;
  isAdmin: boolean;
  createdAt: Date;
  lastActive: Date;
  totalBets: number;
  totalWinnings: string; // In USDC (as string to avoid precision issues)
}

const UserSchema = new mongoose.Schema<IUser>({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true 
  },
  evmAddress: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true 
  },
  displayName: { 
    type: String,
    trim: true 
  },
  isAdmin: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastActive: { 
    type: Date, 
    default: Date.now 
  },
  totalBets: { 
    type: Number, 
    default: 0 
  },
  totalWinnings: { 
    type: String, 
    default: "0" 
  },
});

// Create indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ evmAddress: 1 });
UserSchema.index({ isAdmin: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);