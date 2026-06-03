const { searchRecords } = require("../lib/result-core");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body || {};
    const grade = String(body.grade || "").trim();
    const query = String(body.query || body.seat || body.q || "").trim();

    const data = searchRecords(grade, query);
    return res.status(200).json(data);
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({
      error: err.message || "خطأ في السيرفر"
    });
  }
};
