const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const SEAT   = ["رقم الجلوس","رقم جلوس","رقم_الجلوس","جلوس","seat","seat_number","id","رقم"];
const NAME   = ["اسم الطالب","اسم_الطالب","الاسم","اسم","name","student_name"];
const GRADE  = ["الصف","صف","grade","class","level"];
const SEC    = ["الشعبة","شعبة","القسم","قسم","section","class_section","division"];
const TOTAL  = ["المجموع","مجموع","total","sum","إجمالي","اجمالي"];
const PCT    = ["النسبة","نسبة","النسبة المئوية","percent","percentage","rate","%"];
const GLABEL = ["التقدير","تقدير","grade_label","result_label","تقييم"];
const STATUS = ["الحالة","حالة","status","نتيجة","قرار","decision"];
const NOTES  = ["ملاحظات","ملاحظة","notes","note","remarks","تعليق"];

const cache = {};

function matchCol(h, keys) {
  h = String(h || "").trim().toLowerCase().replace(/\s+/g, "");
  for (const key of keys) {
    const k = String(key).toLowerCase().replace(/\s+/g, "");
    if (h === k || h.indexOf(k) !== -1) return true;
  }
  return false;
}

function detectCols(headers) {
  const m = { seat:null, name:null, grade:null, section:null, total:null, percent:null, gradeLabel:null, status:null, notes:null, subjects:[] };

  headers.forEach((h, i) => {
    if (m.seat === null && matchCol(h, SEAT)) { m.seat = i; return; }
    if (m.name === null && matchCol(h, NAME)) { m.name = i; return; }
    if (m.grade === null && matchCol(h, GRADE)) { m.grade = i; return; }
    if (m.section === null && matchCol(h, SEC)) { m.section = i; return; }
    if (m.total === null && matchCol(h, TOTAL)) { m.total = i; return; }
    if (m.percent === null && matchCol(h, PCT)) { m.percent = i; return; }
    if (m.gradeLabel === null && matchCol(h, GLABEL)) { m.gradeLabel = i; return; }
    if (m.status === null && matchCol(h, STATUS)) { m.status = i; return; }
    if (m.notes === null && matchCol(h, NOTES)) { m.notes = i; return; }
  });

  const used = Object.values(m).filter(v => typeof v === "number");
  headers.forEach((h, i) => {
    if (!used.includes(i) && h && String(h).trim() !== "") {
      m.subjects.push({ idx: i, name: String(h).trim() });
    }
  });

  return m;
}

function convNums(s) {
  return String(s || "").replace(/[٠١٢٣٤٥٦٧٨٩]/g, c => String(c.charCodeAt(0) - 1632));
}

function normAr(s) {
  return String(s || "")
    .replace(/[أإآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cv(rec, idx) {
  if (idx === null || idx === undefined) return "";
  const v = rec._raw[idx];
  return v === undefined || v === null ? "" : String(v).trim();
}

function getFilePath(grade) {
  const fileName = grade === "1" ? "1sanawe.xlsx" : "2sanawe.xlsx";
  return path.join(process.cwd(), "data", fileName);
}

function loadRecords(grade) {
  if (!["1", "2"].includes(String(grade))) {
    const e = new Error("الصف الدراسي غير صحيح");
    e.statusCode = 400;
    throw e;
  }

  const filePath = getFilePath(String(grade));
  if (!fs.existsSync(filePath)) {
    const e = new Error("ملف البيانات غير موجود على السيرفر");
    e.statusCode = 500;
    throw e;
  }

  const stat = fs.statSync(filePath);
  const key = String(grade);

  if (cache[key] && cache[key].mtimeMs === stat.mtimeMs) {
    return cache[key].records;
  }

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  if (!raw || raw.length < 2) {
    const e = new Error("ملف البيانات فارغ أو غير صحيح");
    e.statusCode = 500;
    throw e;
  }

  let hr = 0;
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    if (raw[i].filter(c => c !== "" && c !== null && c !== undefined).length > 2) {
      hr = i;
      break;
    }
  }

  const headers = raw[hr].map(c => String(c).trim());
  const cm = detectCols(headers);

  const records = [];
  for (let r = hr + 1; r < raw.length; r++) {
    const row = raw[r];
    if (row.every(c => c === "" || c === null || c === undefined)) continue;
    records.push({ _headers: headers, _cm: cm, _raw: row });
  }

  cache[key] = { mtimeMs: stat.mtimeMs, records };
  return records;
}

function searchRecords(grade, query) {
  query = convNums(String(query || "").trim());

  if (!query) {
    const e = new Error("اكتب رقم الجلوس أو اسم الطالب");
    e.statusCode = 400;
    throw e;
  }

  const records = loadRecords(String(grade));
  const isNum = /^\d+$/.test(query);
  const nq = normAr(query);

  const results = records.filter(rec => {
    const cm = rec._cm;
    if (isNum) return convNums(cv(rec, cm.seat)) === query;
    return normAr(cv(rec, cm.name)).indexOf(nq) !== -1;
  }).slice(0, 20);

  return {
    count: results.length,
    results
  };
}

module.exports = { searchRecords };
