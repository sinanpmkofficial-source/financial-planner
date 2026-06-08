import mongoose, { Schema, type Document } from "mongoose";

export interface ICategory {
  name: string;
  icon: string;
  color: string;
  bucket?: "Needs" | "Fun" | "Investments" | "Other";
}

export interface IUserSettings extends Document {
  currency: string;
  budgetStartDay: number;
  showGamification: boolean;
  categories: ICategory[];
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true },
  icon: { type: String, default: "📁" },
  color: { type: String, default: "hsl(200, 15%, 50%)" },
  bucket: { 
    type: String, 
    enum: ["Needs", "Fun", "Investments", "Other"],
    default: "Other" 
  }
});

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    currency: { type: String, default: "₹" },
    budgetStartDay: { type: Number, default: 1, min: 1, max: 28 },
    showGamification: { type: Boolean, default: true },
    categories: {
      type: [CategorySchema],
      default: [
        { name: "Food", icon: "Utensils", color: "hsl(142, 72%, 29%)", bucket: "Needs" },
        { name: "Travel", icon: "Car", color: "hsl(217, 91%, 60%)", bucket: "Needs" },
        { name: "Rent", icon: "Home", color: "hsl(25, 95%, 53%)", bucket: "Needs" },
        { name: "Shopping", icon: "ShoppingBag", color: "hsl(325, 90%, 50%)", bucket: "Fun" },
        { name: "Bills", icon: "Zap", color: "hsl(43, 96%, 50%)", bucket: "Needs" },
        { name: "Health", icon: "HeartPulse", color: "hsl(0, 84%, 60%)", bucket: "Needs" },
        { name: "Education", icon: "GraduationCap", color: "hsl(271, 91%, 65%)", bucket: "Investments" },
        { name: "Other", icon: "FolderOpen", color: "hsl(200, 15%, 50%)", bucket: "Other" }
      ]
    }
  },
  { timestamps: true }
);

export default mongoose.models.UserSettings ||
  mongoose.model<IUserSettings>("UserSettings", UserSettingsSchema);
