const mongoose = require("mongoose");

const searchRequestSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["jobs", "internships", "courses"],
      required: true,
    },
    query: { type: String, required: true },
    city: { type: String, default: "Москва" },
    filters: { type: Object, default: {} },
    resultIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "SearchResult" }],
    sourceLogs: [
      {
        source: { type: String, required: true },
        status: { type: String, enum: ["ok", "error"], required: true },
        fetchedCount: { type: Number, default: 0 },
        savedCount: { type: Number, default: 0 },
        error: { type: String, default: "" },
        startedAt: { type: Date },
        finishedAt: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SearchRequest", searchRequestSchema);
