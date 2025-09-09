import mongoose from "mongoose";

export interface IUser {
  email: string;
  evmAddress: string;
  username: string; // Extracted from email (part before @)
  displayName?: string; // Optional custom display name, falls back to username
  isAdmin: boolean;
  createdAt: Date;
  lastActive: Date;
  totalBets: number;
  totalWinnings: string; // In USDC (as string to avoid precision issues)
  autoFundingStatus?: 'pending' | 'completed' | 'failed' | 'skipped';
  autoFundingAttempts?: number;
  lastFundingAttempt?: Date;
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
  username: {
    type: String,
    required: true,
    trim: true,
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
  autoFundingStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'skipped'],
    default: undefined
  },
  autoFundingAttempts: {
    type: Number,
    default: 0
  },
  lastFundingAttempt: {
    type: Date,
    default: undefined
  },
});

// Create indexes for better query performance
// Note: email and evmAddress indexes are automatically created by unique: true
UserSchema.index({ isAdmin: 1 });
UserSchema.index({ username: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

// Utility function to extract username from email
export function extractUsernameFromEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex === -1) {
    // If no @ found, return the whole string (shouldn't happen with valid emails)
    return email.toLowerCase().trim();
  }
  return email.substring(0, atIndex).toLowerCase().trim();
}

// Create or update user on login
export async function createOrUpdateUserOnLogin(
  email: string, 
  evmAddress: string
) {
  const username = extractUsernameFromEmail(email);
  
  // Try to find existing user by email or wallet address
  let user = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      { evmAddress: evmAddress.toLowerCase() }
    ]
  });

  if (user) {
    // Update existing user - especially important if they had a pending wallet address
    const wasUpdated = 
      user.email !== email.toLowerCase() || 
      user.evmAddress !== evmAddress.toLowerCase() ||
      user.evmAddress.startsWith('pending_');
      
    user.email = email.toLowerCase();
    user.evmAddress = evmAddress.toLowerCase();
    user.username = username;
    user.lastActive = new Date();
    
    // If displayName is not set, use username
    if (!user.displayName) {
      user.displayName = username;
    }
    
    await user.save();
    
    if (wasUpdated) {
      console.log(`✅ Updated user with real wallet address: ${username} -> ${evmAddress}`);
    }
    
    return user;
  } else {
    // Create new user
    user = new User({
      email: email.toLowerCase(),
      evmAddress: evmAddress.toLowerCase(),
      username,
      displayName: username, // Default to username
      isAdmin: false,
      totalBets: 0,
      totalWinnings: "0"
    });
    
    await user.save();
    return user;
  }
}

// Get user's display name with fallback logic
export function getUserDisplayName(user: IUser): string {
  return user.displayName || user.username || user.evmAddress.slice(0, 10) + '...';
}