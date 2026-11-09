// Dán toàn bộ file này vào Apps Script (mở từ Google Sheet: Tiện ích mở rộng → Apps Script).
// Sau đó Triển khai → Triển khai mới → Ứng dụng web (Thực thi: Tôi, Quyền truy cập: Bất kỳ ai).
// Sửa code xong: Triển khai → Quản lý triển khai → ✏️ → Phiên bản: Phiên bản mới → Triển khai (giữ nguyên URL).

const SPREADSHEET_ID = '1uprnPShMouksLthIlgde-ls6QNgPUVCpWt4rzll4zuM';

function getSheet(name, header) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(header);
  }
  return sheet;
}

// Dự án nhà gái đặt GB_API = '<URL Web App>?nha=gai', nhà trai để nguyên URL (hoặc ?nha=trai)
const sideName = side => side === 'gai' ? 'NhaGai' : 'NhaTrai';
const wishSheet = side => getSheet('LoiChuc_' + sideName(side), ['Thời gian', 'Tên', 'Lời chúc']);
const rsvpSheet = side => getSheet('XacNhan_' + sideName(side), ['Thời gian', 'Tên', 'Tham dự', 'Số khách', 'Lời nhắn']);

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

const clean = (s, max) => String(s || '').trim().slice(0, max);
// Chặn chữ bắt đầu bằng = + - @ bị Sheets hiểu thành công thức
const safe = s => /^[=+\-@]/.test(s) ? "'" + s : s;

function appendRow(sheet, row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  sheet.appendRow(row);
  lock.releaseLock();
}

function doGet(e) {
  const rows = wishSheet(e.parameter.nha).getDataRange().getValues().slice(1).reverse().slice(0, 200);
  return json(rows.map(r => ({ time: new Date(r[0]).getTime(), name: String(r[1]), msg: String(r[2]) })));
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const name = clean(data.name, 50);
  const msg = clean(data.msg, 500);

  if (data.type === 'rsvp') {
    if (!name) return json({ ok: false });
    const guests = data.attend ? Math.min(Math.max(parseInt(data.guests, 10) || 1, 1), 20) : 0;
    appendRow(rsvpSheet(e.parameter.nha), [new Date(), safe(name), data.attend ? 'Sẽ đến' : 'Không đến', guests, safe(msg)]);
    return json({ ok: true });
  }

  if (!name || !msg) return json({ ok: false });
  appendRow(wishSheet(e.parameter.nha), [new Date(), safe(name), safe(msg)]);
  return json({ ok: true });
}
