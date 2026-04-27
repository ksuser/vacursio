const mongoose = require("mongoose");

const searchResultSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["jobs", "internships", "courses"],
      required: true,
    },
    source: { type: String, required: true },
    title: { type: String, required: true },
    company: { type: String, default: "" },
    salaryOrPrice: { type: String, default: "" },
    city: { type: String, default: "" },
    experience: { type: String, default: "" },
    employment: { type: String, default: "" },
    schedule: { type: String, default: "" },
    format: { type: String, default: "" },
    cost: { type: String, default: "" },
    url: { type: String, default: "" },
    query: { type: String, required: true },
    filters: { type: Object, default: {} },
    raw: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SearchResult", searchResultSchema);
