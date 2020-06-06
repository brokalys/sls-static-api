export default function isOffline() {
  return process.env.IS_OFFLINE === 'true' || process.env.IS_OFFLINE === true;
}
