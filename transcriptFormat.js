function formatAttachments(attachments = []) {
  if (!attachments.length) return [];

  return [
    'Attachments:',
    ...attachments.map(file => {
      if (file.path) {
        return `- ${file.name} (${file.path})`;
      }
      return `- ${file.name}`;
    }),
    ''
  ];
}

function speakerFor(role) {
  if (role === 'user') return 'Learner';
  if (role === 'assistant') return 'Grant';
  return 'System';
}

function formatTranscript(messages, assistantContent = '', errorMessage = '') {
  const transcriptMessages = [...messages];

  if (assistantContent) {
    transcriptMessages.push({ role: 'assistant', content: assistantContent });
  }

  if (errorMessage) {
    transcriptMessages.push({ role: 'system', content: `Error: ${errorMessage}` });
  }

  const lines = transcriptMessages.flatMap((message, index) => {
    const content = message.content ? String(message.content).trimEnd() : '';

    return [
      `## ${speakerFor(message.role)}`,
      '',
      ...formatAttachments(message.attachments),
      ...(content ? [content] : ['[No text content]']),
      '',
      ...(index < transcriptMessages.length - 1 ? ['---', ''] : [])
    ];
  });

  return `${lines.join('\n').trimEnd()}\n`;
}

module.exports = {
  formatAttachments,
  formatTranscript,
  speakerFor,
};
