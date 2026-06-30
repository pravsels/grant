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

function formatTimestampFile(date) {
  return `${padNumber(date.getHours())}-${padNumber(date.getMinutes())}-${padNumber(date.getSeconds())}-${padNumber(date.getMilliseconds(), 3)}.md`;
}

function summaryPathFor(transcriptPath) {
  return transcriptPath.replace(/\.(txt|md)$/, '.summary.md');
}

function isTranscriptFile(fileName) {
  return (fileName.endsWith('.md') || fileName.endsWith('.txt')) && !fileName.endsWith('.summary.md');
}

module.exports = {
  formatDayFolder,
  formatTimestampFile,
  isTranscriptFile,
  padNumber,
  summaryPathFor,
};
