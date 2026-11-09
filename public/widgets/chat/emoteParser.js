export function parseTwitchEmotes (text, emotes){
  if (!emotes || Object.keys(emotes).length === 0){
    return [{type: 'text', content: text}];
  }
  const emoteOccurences = [];
  for (const [emoteId, positions] of Object.entries(emotes)){
    for (const pos of positions){
      const [start, end] = pos.split('-').map(Number);
      emoteOccurences.push({start, end, id: emoteId});
    }
  }
  emoteOccurences.sort((a,b) => a.start - b.start);

  const chunks = [];
  let lastIndex = 0;

  for (const occ of emoteOccurences){
    if (occ.start > lastIndex){
      chunks.push({type: 'text', content: text.slice(lastIndex, occ.start)});
    }
    const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v1/${occ.id}/3.0`;
    const emoteText = text.slice(occ.start, occ.end + 1);
    chunks.push({type: 'emote', content: emoteText, url: emoteUrl});
    lastIndex = occ.end + 1;
  }
  if( lastIndex < text.length){
    chunks.push({type: text, content: text.slice(lastIndex)})
  }

  return chunks;
}