const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function padNumber(value, length = 2) {
  return String(value).padStart(length, '0');
}

function formatDayFolder(date) {
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  const readableDate = `${date.getDate()}-${monthNames[date.getMonth()]}-${year}`;

  return `${year}-${month}-${day}_${readableDate}`;
}

module.exports = {
  formatDayFolder,
  padNumber,
};
