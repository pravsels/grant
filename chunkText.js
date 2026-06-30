function getChunkText(chunk) {
  const parts = chunk?.candidates?.[0]?.content?.parts || [];
  return parts
    .map(part => part?.text || '')
    .join('');
}

module.exports = {
  getChunkText,
};
