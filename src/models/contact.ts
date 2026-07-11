import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IContact extends Document {
  userId: Types.ObjectId;
  name: string;
  nameLower: string;
  phone?: string;
  usageCount: number;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    nameLower: { type: String, required: true },
    phone: { type: String },
    usageCount: { type: Number, required: true, default: 0, min: 0 },
    lastUsedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

// One contact per (user, normalized name) — keeps the list deduped.
ContactSchema.index({ userId: 1, nameLower: 1 }, { unique: true });
// Suggestion ordering: most-used first.
ContactSchema.index({ userId: 1, usageCount: -1 });

if (mongoose.models.Contact) {
  mongoose.deleteModel("Contact");
}

export default mongoose.model<IContact>("Contact", ContactSchema);
