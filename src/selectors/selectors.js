export function getUrl(state, path) {
  const {username, ip} = state;
  return `http://${ip}/api/${username}/${path}`;
}
