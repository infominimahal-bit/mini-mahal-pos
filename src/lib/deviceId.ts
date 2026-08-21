export const getDeviceId = (): string => {
  const KEY = 'pos_device_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID?.())
      ? crypto.randomUUID()
      : `dev-${Date.now()}`;
    localStorage.setItem(KEY, id);
  }
  return id;
};
