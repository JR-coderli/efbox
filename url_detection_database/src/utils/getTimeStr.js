
function getTimeStr() {
  const now = new Date();
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${HH}:${mm}`;
}

module.exports = getTimeStr;