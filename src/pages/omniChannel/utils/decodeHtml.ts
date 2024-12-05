export const decodeHtmlEntities = (text: string) => {
  const parser = new DOMParser();
  return parser.parseFromString(text, "text/html").body.textContent || "";
};
