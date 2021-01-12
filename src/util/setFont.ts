const styleElement = document.createElement('style');

export default function setFont(name: string, weight?: number) {
  // <link href="https://fonts.googleapis.com/css2?family=Yusei+Magic&display=swap" rel="stylesheet">
  const link = document.createElement('link');
  const weightSegment = weight ? `:wght@${weight}` : '';
  link.href = `https://fonts.googleapis.com/css2?family=${name.replaceAll(
    ' ',
    '+'
  )}${weightSegment}&display=swap`;
  link.rel = 'stylesheet';
  document.head.append(link);

  styleElement.remove();
  const weightRule = weight ? `font-weight: ${weight} !important;` : '';
  styleElement.innerText = `* { font-family: '${name}' !important; ${weightRule} }`;
  document.head.append(styleElement);
}
