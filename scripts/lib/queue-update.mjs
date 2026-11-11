export function shouldQueueCheckout(remainingFiles) {
  return remainingFiles.length > 0;
}

export function blockedLogKey(remainingFiles) {
  return remainingFiles.slice(0, 3).sort().join(',');
}
